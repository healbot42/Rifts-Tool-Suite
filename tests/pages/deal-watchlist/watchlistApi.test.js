import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  WATCHLIST_API,
  watchlistApi,
} from '../../../src/pages/deal-watchlist/lib/watchlistApi.js'

afterEach(() => vi.unstubAllGlobals())

describe('deal watchlist API client', () => {
  it('loads and saves chair settings separately', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await watchlistApi.chairSettings()
    await watchlistApi.saveChairSettings({ enabled: true })
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${WATCHLIST_API}/v1/watchlist/chair-settings`,
      {
        credentials: 'include',
        headers: {},
      },
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${WATCHLIST_API}/v1/watchlist/chair-settings`,
      {
        credentials: 'include',
        method: 'PUT',
        body: JSON.stringify({ enabled: true }),
        headers: { 'Content-Type': 'application/json' },
      },
    )
  })
  it('sends browser credentials when saving a product', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ product: { id: 'possessed' } }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await watchlistApi.save({ id: 'possessed' })

    expect(fetchMock).toHaveBeenCalledWith(
      `${WATCHLIST_API}/v1/watchlist/possessed`,
      {
        credentials: 'include',
        method: 'PUT',
        body: JSON.stringify({ id: 'possessed' }),
        headers: { 'Content-Type': 'application/json' },
      },
    )
  })

  it('keeps list requests simple so Cloudflare Access does not preflight', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ products: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await watchlistApi.list()

    expect(fetchMock).toHaveBeenCalledWith(`${WATCHLIST_API}/v1/watchlist`, {
      credentials: 'include',
      headers: {},
    })
  })
})
