import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '../../src/lib/persistence/backends.js'
import { createDocumentRepository } from '../../src/lib/persistence/repository.js'
import {
  PERSISTENCE_DOCUMENTS,
  createRepositories,
} from '../../src/lib/persistence/index.js'

const definition = { key: 'example', type: 'example', schemaVersion: 2 }
const failure = (operation = 'write') => ({
  ok: false,
  error: { operation, key: 'example', kind: 'unavailable' },
})

describe('document repository contract', () => {
  it('keeps every legacy key and omits transient TW search state', async () => {
    const primary = createMemoryBackend()
    let mirrored
    const legacy = {
      put: async (envelope) => {
        mirrored = envelope.payload
        return { ok: true }
      },
    }
    const repositories = createRepositories({ primary, legacy })
    await repositories.twDevice.save({
      name: 'test',
      spell: { searchOpen: true },
    })
    expect(Object.values(PERSISTENCE_DOCUMENTS).map(({ key }) => key)).toEqual([
      'rifts-tw-device',
      'rifts-character-sheet',
      'rifts-initiative-tracker',
      'rifts-initiative-presets',
    ])
    expect(mirrored).toEqual({ name: 'test', spell: {} })
  })

  it('migrates legacy payloads into a revisioned envelope without deleting them', async () => {
    const primary = createMemoryBackend()
    const legacy = createMemoryBackend([
      { key: 'example', payload: { name: 'old' } },
    ])
    legacy.get = async () => ({ ok: true, value: { name: 'old' } })
    const repository = createDocumentRepository({
      ...definition,
      primary,
      legacy,
      now: () => '2026-08-20T00:00:00.000Z',
    })

    const result = await repository.load()
    expect(result).toMatchObject({
      ok: true,
      migrated: true,
      value: { name: 'old' },
    })
    expect((await primary.get('example')).value).toEqual({
      ...definition,
      revision: 1,
      updatedAt: '2026-08-20T00:00:00.000Z',
      payload: { name: 'old' },
    })
  })

  it('falls back to legacy storage when the primary backend fails', async () => {
    const primary = {
      get: async () => failure('read'),
      put: async () => failure(),
    }
    const legacy = {
      get: async () => ({ ok: true, value: null }),
      put: async () => ({ ok: true }),
    }
    const repository = createDocumentRepository({
      ...definition,
      primary,
      legacy,
    })
    const result = await repository.save({ round: 3 })
    expect(result).toMatchObject({ ok: true, fallback: true })
    expect(result.warning.kind).toBe('unavailable')
  })

  it('does not hide malformed legacy input when migration cannot read it', async () => {
    const repository = createDocumentRepository({
      ...definition,
      primary: createMemoryBackend(),
      legacy: { get: async () => failure('parse') },
    })
    expect(await repository.load()).toMatchObject({
      ok: false,
      error: { operation: 'parse' },
    })
  })

  it('serializes saves and increments revisions in completion order', async () => {
    const revisions = []
    const primary = {
      get: async () => ({ ok: true, value: null }),
      put: async (envelope) => {
        await Promise.resolve()
        revisions.push([envelope.revision, envelope.payload.value])
        return { ok: true }
      },
    }
    const legacy = { put: async () => ({ ok: true }) }
    const repository = createDocumentRepository({
      ...definition,
      primary,
      legacy,
    })
    await Promise.all([
      repository.save({ value: 'first' }),
      repository.save({ value: 'last' }),
    ])
    expect(revisions).toEqual([
      [1, 'first'],
      [2, 'last'],
    ])
  })

  it('reports a degraded warning when legacy mirroring fails', async () => {
    const repository = createDocumentRepository({
      ...definition,
      primary: createMemoryBackend(),
      legacy: { put: async () => failure() },
    })
    const result = await repository.save({ value: 1 })
    expect(result).toMatchObject({ ok: true, warning: { degraded: true } })
  })

  it('removes both primary and legacy copies', async () => {
    const primary = createMemoryBackend([
      { ...definition, revision: 1, updatedAt: '', payload: {} },
    ])
    let legacyRemoved = false
    const repository = createDocumentRepository({
      ...definition,
      primary,
      legacy: {
        remove: async () => {
          legacyRemoved = true
          return { ok: true }
        },
      },
    })
    expect(await repository.remove()).toEqual({ ok: true })
    expect((await primary.get('example')).value).toBeNull()
    expect(legacyRemoved).toBe(true)
  })
})
