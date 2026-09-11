import { describe, expect, it } from 'vitest'

import {
  catalogProductVisible,
  watchlistDraft,
} from '../../../src/pages/deal-watchlist/lib/catalog.js'

const options = {
  query: '',
  system: 'All',
  includeResin: false,
  includeCharacters: false,
  includeAccessories: false,
}

describe('Warhammer product catalog', () => {
  it('hides resin, characters, and upgrade sets by default', () => {
    expect(
      catalogProductVisible(
        {
          name: 'Legion Captain',
          faction: 'Characters',
          system: 'Horus Heresy',
          suspected_single: true,
        },
        options,
      ),
    ).toBe(false)
    expect(
      catalogProductVisible(
        {
          name: 'Tactical Squad',
          faction: 'Legiones Astartes',
          system: 'Horus Heresy',
          suspected_resin: true,
        },
        options,
      ),
    ).toBe(false)
    expect(
      catalogProductVisible(
        {
          name: 'Heavy Weapons Upgrade Set',
          faction: 'Space Marines',
          system: 'Warhammer 40,000',
        },
        options,
      ),
    ).toBe(false)
  })

  it('creates a draft without inventing MSRP', () => {
    expect(
      watchlistDraft({ id: 'possessed', name: 'Possessed', msrp: null }),
    ).toMatchObject({
      id: 'possessed',
      name: 'Possessed',
      msrp: '',
      queries: 'Possessed',
    })
  })

  it('finds products by faction as well as name', () => {
    expect(
      catalogProductVisible(
        {
          name: 'Tactical Squad',
          faction: 'Word Bearers',
          system: 'Horus Heresy',
        },
        { ...options, query: 'word bearers' },
      ),
    ).toBe(true)
  })

  it('publishes unique stable IDs for the generated catalog', async () => {
    const catalog =
      await import('../../../src/data/warhammer-product-catalog.json')
    const ids = catalog.default.products.map((product) => product.id)
    expect(ids.length).toBeGreaterThan(1000)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
