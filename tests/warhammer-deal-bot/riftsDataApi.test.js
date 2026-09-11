import { describe, expect, it } from 'vitest'

import { handleRequest } from '../../cloudflare/rifts-data-api/worker.js'

describe('Rifts data API', () => {
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
})
