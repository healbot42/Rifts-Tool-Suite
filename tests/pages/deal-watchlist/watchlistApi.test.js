import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  WATCHLIST_API,
  watchlistApi,
} from '../../../src/pages/deal-watchlist/lib/watchlistApi.js'

afterEach(() => vi.unstubAllGlobals())

describe('deal watchlist API client', () => {
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
})
