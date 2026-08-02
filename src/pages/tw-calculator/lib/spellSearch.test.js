import { describe, expect, it } from 'vitest'
import { createSpellSearchIndex, findMatchingSpells } from './spellSearch.js'

const spells = [
  { name: 'Armor of Ithan' },
  { name: 'Magic Armor' },
  { name: 'Impervious to Energy' },
  { name: 'Energy Field' },
]
const index = createSpellSearchIndex(spells)

describe('spell-name lookup', () => {
  it('finds a phrase at the beginning or inside a name', () => {
    expect(findMatchingSpells(index, 'armor').map(spell => spell.name)).toEqual(['Armor of Ithan', 'Magic Armor'])
  })

  it('finds multiple terms even when they are not adjacent', () => {
    expect(findMatchingSpells(index, 'impervious energy').map(spell => spell.name)).toEqual(['Impervious to Energy'])
  })

  it('is case insensitive and ranks exact matches first', () => {
    expect(findMatchingSpells(index, 'ENERGY FIELD')[0].name).toBe('Energy Field')
  })
})
