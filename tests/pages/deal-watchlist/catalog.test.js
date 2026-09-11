import { describe, expect, it } from 'vitest'

import {
  CATALOG_FACTION_GROUPS,
  catalogProductVisible,
  watchlistDraft,
} from '../../../src/pages/deal-watchlist/lib/catalog.js'

const options = {
  query: '',
  system: 'All',
  faction: 'All',
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

  it('filters by broad and specific Warhammer faction groups', () => {
    const custodian = {
      name: 'Custodian Guard',
      faction: 'Armies of the Imperium',
      system: 'Warhammer 40,000',
      url: 'https://www.warhammer.com/en-US/shop/Adeptus-Custodes-Custodian-Guard-2018',
    }
    const necron = {
      name: 'Necron Warriors',
      faction: 'Necrons',
      system: 'Warhammer 40,000',
      url: 'https://www.warhammer.com/en-US/shop/Necron-Warriors-2020',
    }

    expect(
      catalogProductVisible(custodian, {
        ...options,
        faction: 'adeptus-custodes',
      }),
    ).toBe(true)
    expect(
      catalogProductVisible(necron, { ...options, faction: 'xenos' }),
    ).toBe(true)
    expect(
      catalogProductVisible(necron, { ...options, faction: 'imperium' }),
    ).toBe(false)
    expect(CATALOG_FACTION_GROUPS.map(({ label }) => label)).toEqual([
      'Space Marines',
      'Armies of the Imperium',
      'Armies of Chaos',
      'Xenos Armies',
    ])
  })

  it('publishes unique stable IDs for the generated catalog', async () => {
    const catalog =
      await import('../../../src/data/warhammer-product-catalog.json')
    const ids = catalog.default.products.map((product) => product.id)
    expect(ids.length).toBeGreaterThan(1000)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes exact US MSRP matches from the official price list', async () => {
    const catalog = (
      await import('../../../src/data/warhammer-product-catalog.json')
    ).default
    const possessed = catalog.products.find(
      (product) => product.product_code === '99120102140',
    )

    expect(catalog.price_source).toMatch(/^US Price Adjustment/)
    expect(catalog.priced_products).toBeGreaterThan(500)
    expect(catalog.price_effective_date).toBe('2026-09-21')
    expect(['current', 'new']).toContain(catalog.price_basis)
    expect(possessed.msrp).toBe(catalog.price_basis === 'new' ? 67.5 : 65)
  })

  it('combines exact product-code prices from both official US sheets', async () => {
    const catalog = (
      await import('../../../src/data/warhammer-product-catalog.json')
    ).default
    const razorshark = catalog.products.find(
      (product) => product.product_code === '99120113029',
    )

    expect(catalog.price_sources).toHaveLength(2)
    expect(catalog.price_sources.map((source) => source.title)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^US Price Adjustment/),
        expect.stringMatching(/^US DTT Price Adjustment/),
      ]),
    )
    expect(catalog.priced_products).toBe(672)
    expect(razorshark.msrp).toBe(catalog.price_basis === 'new' ? 94 : 89)
  })
})
