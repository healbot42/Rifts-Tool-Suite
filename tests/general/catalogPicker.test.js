import { describe, expect, it } from 'vitest'
import {
  catalogCounts,
  catalogFilter,
  catalogSearch,
  defaultCatalogOptions,
  normalizeCatalogSelection,
  validateCatalogOptions,
} from '../../src/lib/catalogPicker.js'
const entries = [
  {
    id: 'a',
    name: 'Alpha Blade',
    description: 'Energy weapon',
    category: 'Gear',
    subcategory: 'Weapons',
    facets: { type: 'weapon' },
    options: [
      {
        id: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: true,
        default: 1,
      },
      {
        id: 'tags',
        label: 'Tags',
        type: 'multi-select',
        multiple: true,
        default: [],
      },
      { id: 'active', label: 'Active', type: 'boolean' },
    ],
  },
  {
    id: 'b',
    name: 'Scout Armor',
    description: 'Light suit',
    category: 'Gear',
    subcategory: 'Armor',
    facets: { type: 'armor' },
    options: [],
  },
]
describe('generic catalog picker helpers', () => {
  it('searches configured fields and applies facets', () => {
    expect(
      catalogSearch(entries, 'energy', ['description']).map((e) => e.id),
    ).toEqual(['a'])
    expect(catalogFilter(entries, { type: 'armor' }).map((e) => e.id)).toEqual([
      'b',
    ])
  })
  it('counts category and nested subcategory entries', () => {
    expect(catalogCounts(entries)).toMatchObject({
      Gear: 2,
      'Gear:Weapons': 1,
      'Gear:Armor': 1,
    })
  })
  it('defaults, validates, and normalizes declarative options', () => {
    const values = defaultCatalogOptions(entries[0])
    expect(values).toEqual({ quantity: 1, tags: [], active: false })
    expect(
      validateCatalogOptions(entries[0], { ...values, quantity: '' }),
    ).toEqual(['quantity'])
    expect(
      normalizeCatalogSelection(entries[0], {
        quantity: '2',
        tags: ['x'],
        active: 1,
      }),
    ).toMatchObject({
      catalogId: 'a',
      values: { quantity: 2, tags: ['x'], active: true },
    })
  })
})
