import { describe, expect, it } from 'vitest'

import {
  handleRequest,
  observationRetentionCutoff,
  storeObservations,
} from '../../cloudflare/rifts-data-api/worker.js'

describe('Rifts data API', () => {
  it('retains exactly 30 days of shared listing observations', async () => {
    const batches = []
    const db = {
      prepare: (sql) => ({
        sql,
        bind(...values) {
          return { sql, values }
        },
      }),
      batch: async (statements) => batches.push(statements),
    }
    const now = new Date('2026-09-15T12:00:00.000Z')
    const observation = {
      source: 'ebay',
      source_listing_id: 'listing-1',
      product_id: 'product-1',
      observed_at: now.toISOString(),
      delivered_price: '25.00',
      title: 'Example listing',
      url: 'https://www.ebay.com/itm/listing-1',
    }

    expect(observationRetentionCutoff(now)).toBe('2026-08-16T12:00:00.000Z')
    await expect(storeObservations(db, [observation], now)).resolves.toBe(1)
    expect(batches).toHaveLength(1)
    expect(batches[0][0]).toEqual({
      sql: 'DELETE FROM deal_observations WHERE observed_at < ?',
      values: ['2026-08-16T12:00:00.000Z'],
    })
    expect(batches[0][1].sql).toContain('INSERT INTO deal_observations')
  })

  it('exposes a public health check without database access', async () => {
    const response = await handleRequest(
      new Request('https://rifts-data-api.example/health'),
      {},
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('rejects unauthenticated private requests before database access', async () => {
    const response = await handleRequest(
      new Request('https://rifts-data-api.example/v1/purchases'),
      { DATA_API_TOKEN: 'secret' },
    )
    expect(response.status).toBe(401)
  })

  it('requires a Cloudflare Access identity for browser watchlists', async () => {
    const response = await handleRequest(
      new Request('https://rifts-data-api.example/v1/watchlist'),
      {},
      {},
    )
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'Cloudflare Access sign-in required',
    })
  })

  it('requires a Cloudflare Access identity for chair settings', async () => {
    const response = await handleRequest(
      new Request('https://rifts-data-api.example/v1/watchlist/chair-settings'),
      {},
      {},
    )
    expect(response.status).toBe(403)
  })

  it('recognizes the identity header supplied by path-based Cloudflare Access', async () => {
    const response = await handleRequest(
      new Request('https://rifts-data-api.example/v1/watchlist', {
        headers: {
          'Cf-Access-Authenticated-User-Email': 'Owner@Example.com',
        },
      }),
      {
        DB: {
          batch: async () => {},
          prepare: (sql) => ({
            bind: () => ({
              run: async () => ({}),
              first: async () =>
                sql.includes('FROM users')
                  ? {
                      id: 'stable-user-id',
                      email: 'owner@example.com',
                      created_at: '2026-09-15T00:00:00Z',
                      updated_at: '2026-09-15T00:00:00Z',
                    }
                  : null,
              all: async () => ({ results: [] }),
            }),
          }),
        },
      },
      {},
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: {
        id: 'stable-user-id',
        email: 'owner@example.com',
        created_at: '2026-09-15T00:00:00Z',
        updated_at: '2026-09-15T00:00:00Z',
      },
      products: [],
    })
  })
})
