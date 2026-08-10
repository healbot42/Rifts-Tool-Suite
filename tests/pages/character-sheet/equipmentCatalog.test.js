import { describe, expect, it } from 'vitest'
import {
  applyEquipmentCatalogSelection,
  characterEquipmentCatalog,
} from '../../../src/data/character/equipmentCatalog.js'
import { rangedWeapons } from '../../../src/data/character/rangedWeapons.js'
import { tools } from '../../../src/data/character/tools.js'

const blank = () => ({ weapons: [], armor: [], vehicles: [], items: [] })

describe('character equipment ranged weapon catalog', () => {
  it('contains one source-backed entry for every ranged weapon in the section', () => {
    expect(rangedWeapons).toHaveLength(12)
    expect(new Set(rangedWeapons.map((entry) => entry.id)).size).toBe(12)
    expect(rangedWeapons.map((entry) => entry.name)).toEqual([
      "Wilk's 320 Laser Pistol",
      "Wilk's 447 Laser Rifle",
      'NG-57 Northern Gun Heavy-Duty Ion Blaster',
      'NG-Super Laser Pistol and Grenade Launcher',
      'NG-33 Northern Gun Laser Pistol',
      'NG-L5 Northern Gun Laser Rifle',
      'NG-P7 Northern Gun Particle Beam Rifle',
      'L-20 Pulse Rifle',
      "JA-11 Juicer Assassin's Energy Rifle",
      'JA-9 Juicer Assassin Variable Laser Rifle',
      'NG-101 Rail Gun',
      'NG-202 Rail Gun',
    ])
    expect(
      rangedWeapons.every(
        (entry) =>
          entry.source === 'Rifts Ultimate Edition' &&
          entry.page >= 268 &&
          entry.page <= 271,
      ),
    ).toBe(true)
  })

  it('does not retain grouped starting equipment or owned assets', () => {
    expect(characterEquipmentCatalog).toHaveLength(15)
    expect(
      characterEquipmentCatalog
        .filter((entry) => entry.category === 'Weapons')
        .every(
          (entry) =>
            entry.metadata.kind === 'weapons' && entry.statistics.length >= 6,
        ),
    ).toBe(true)
    expect(
      characterEquipmentCatalog.some((entry) => entry.id.startsWith('asset:')),
    ).toBe(false)
  })

  it("provides each Wilk's cutting and surgical tool separately", () => {
    expect(tools.map((entry) => entry.name)).toEqual([
      "Wilk's Portable Laser Torch",
      "Wilk's Laser Wand",
      "Wilk's Laser Scalpel",
    ])
    const catalogTools = characterEquipmentCatalog.filter(
      (entry) => entry.category === 'Tools',
    )
    expect(catalogTools).toHaveLength(3)
    expect(
      catalogTools.every(
        (entry) =>
          entry.metadata.kind === 'items' &&
          entry.source === 'Rifts Ultimate Edition' &&
          entry.page === 269,
      ),
    ).toBe(true)
  })

  it('adds a tool with its complete statistics to other items', () => {
    const entry = characterEquipmentCatalog.find(
      (candidate) => candidate.id === 'wilks-portable-laser-torch',
    )
    const result = applyEquipmentCatalogSelection(
      {
        catalogId: entry.id,
        name: entry.name,
        values: { quantity: 1, notes: 'Tool kit' },
        metadata: entry.metadata,
      },
      blank(),
      [],
      undefined,
      'tool-1',
    )
    expect(result.equipment.items[0]).toMatchObject({
      id: 'tool-1',
      name: "Wilk's Portable Laser Torch",
      quantity: 1,
      value: '7,000 credits',
      source: 'Rifts Ultimate Edition',
      page: 269,
    })
    expect(result.equipment.items[0].statistics).toEqual(entry.statistics)
  })

  it('adds a complete weapon snapshot without replacing existing equipment', () => {
    const equipment = blank()
    equipment.weapons.push({ id: 'mine', name: 'Keepsake' })
    const entry = characterEquipmentCatalog.find(
      (candidate) => candidate.id === 'ng-super-laser-pistol-grenade-launcher',
    )
    const result = applyEquipmentCatalogSelection(
      {
        catalogId: entry.id,
        name: entry.name,
        values: { quantity: 2, notes: 'One spare' },
        metadata: entry.metadata,
      },
      equipment,
      [],
      undefined,
      'new',
    )

    expect(result.equipment.weapons[0]).toEqual({
      id: 'mine',
      name: 'Keepsake',
    })
    expect(result.equipment.weapons[1]).toMatchObject({
      id: 'new',
      name: entry.name,
      quantity: 2,
      notes: 'One spare',
      catalogSelectionId: entry.id,
      category: 'Combination Weapons',
      damage:
        'Laser: 2D4 M.D.; grenade: 4D6 M.D. to a 6 foot (1.8 m) blast area',
      source: 'Rifts Ultimate Edition',
      page: 269,
    })
    expect(result.equipment.weapons[1].statistics).toEqual(entry.statistics)
  })
})
