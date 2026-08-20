import { describe, expect, it, vi } from 'vitest'
import {
  localStorageErrorMessage,
  readLocalJson,
  removeLocalValue,
  writeLocalJson,
} from '../../src/lib/localStorage.js'

function storageWith(overrides = {}) {
  return {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    ...overrides,
  }
}

describe('local JSON storage', () => {
  it('distinguishes a missing value from malformed saved JSON', () => {
    expect(readLocalJson('missing', storageWith())).toEqual({
      ok: true,
      value: null,
    })
    const malformed = readLocalJson(
      'broken',
      storageWith({ getItem: () => '{nope' }),
    )
    expect(malformed).toMatchObject({
      ok: false,
      error: { operation: 'parse', key: 'broken', kind: 'malformed' },
    })
  })

  it('returns structured failures when storage access is denied', () => {
    const denied = new DOMException('Blocked', 'SecurityError')
    const result = readLocalJson(
      'character',
      storageWith({
        getItem() {
          throw denied
        },
      }),
    )
    expect(result).toMatchObject({
      ok: false,
      error: {
        operation: 'read',
        key: 'character',
        kind: 'unavailable',
        name: 'SecurityError',
      },
    })
  })

  it('reports serialization and quota failures without throwing', () => {
    const cyclic = {}
    cyclic.self = cyclic
    expect(writeLocalJson('cyclic', cyclic, storageWith())).toMatchObject({
      ok: false,
      error: { operation: 'serialize', kind: 'serialization' },
    })

    const quota = new DOMException('Full', 'QuotaExceededError')
    const result = writeLocalJson(
      'tracker',
      { round: 2 },
      storageWith({
        setItem() {
          throw quota
        },
      }),
    )
    expect(result).toMatchObject({
      ok: false,
      error: { operation: 'write', key: 'tracker', kind: 'quota' },
    })
    expect(localStorageErrorMessage(result.error, 'The tracker')).toContain(
      'browser storage is full',
    )
  })

  it('preserves JSON shape and reports remove failures', () => {
    const storage = storageWith()
    const value = { participants: [{ id: 'one' }], round: 3 }
    expect(writeLocalJson('tracker', value, storage)).toEqual({
      ok: true,
      value: undefined,
    })
    expect(storage.setItem).toHaveBeenCalledWith(
      'tracker',
      JSON.stringify(value),
    )

    const failedRemove = removeLocalValue(
      'tracker',
      storageWith({
        removeItem() {
          throw new DOMException('Blocked', 'SecurityError')
        },
      }),
    )
    expect(failedRemove).toMatchObject({
      ok: false,
      error: { operation: 'remove', key: 'tracker' },
    })
  })
})
