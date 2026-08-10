import { describe, expect, it } from 'vitest'
import {
  reconcileStartingEquipment,
  specializationEquipmentPackages,
  startingAssetRequirements,
  startingEquipmentPackages,
} from '../../../src/data/character/startingEquipment.js'
import { occs } from '../../../src/data/character/occs.js'

const blankEquipment = () => ({
  weapons: [],
  armor: [],
  vehicles: [],
  items: [],
})

describe('starting equipment packages', () => {
  it('covers every modeled class with provenance and stable entry IDs', () => {
    expect(Object.keys(startingEquipmentPackages)).toEqual(
      occs.map((occ) => occ.id),
    )
    for (const [occId, equipmentPackage] of Object.entries(
      startingEquipmentPackages,
    )) {
      expect(equipmentPackage.source).toMatchObject({
        book: 'Rifts Ultimate Edition',
        pages: expect.any(String),
      })
      expect(equipmentPackage.entries.length, occId).toBeGreaterThan(0)
      expect(
        new Set(equipmentPackage.entries.map((item) => item.id)).size,
      ).toBe(equipmentPackage.entries.length)
      for (const item of equipmentPackage.entries) {
        expect(['weapons', 'armor', 'vehicles', 'items']).toContain(item.kind)
        expect(item.name).toEqual(expect.any(String))
      }
    }
  })

  it('models the starting machines granted by both Robot Pilot MOS options', () => {
    expect(
      specializationEquipmentPackages[
        'robot-pilot:power-armor-pilot'
      ].entries.map((item) => item.name),
    ).toContain('NG-Samson power armor')
    expect(
      specializationEquipmentPackages['robot-pilot:robot-pilot'].entries.some(
        (item) => item.kind === 'vehicles',
      ),
    ).toBe(true)
    expect(startingAssetRequirements['glitter-boy'][0]).toMatchObject({
      type: 'power-armor',
      fixedCatalogId: 'usa-g10-glitter-boy',
    })
    expect(startingAssetRequirements['robot-pilot:robot-pilot'][0].type).toBe(
      'giant-robot',
    )
  })

  it('adds a package idempotently without changing user or edited records', () => {
    const equipment = blankEquipment()
    equipment.items.push({
      id: 'user-item',
      name: 'Family keepsake',
      quantity: 1,
    })
    const once = reconcileStartingEquipment(
      equipment,
      startingEquipmentPackages.juicer,
      'juicer',
    )
    once.weapons.find((item) => item.id === 'starting:juicer:ja11').name =
      'Customized JA-11'
    const twice = reconcileStartingEquipment(
      once,
      startingEquipmentPackages.juicer,
      'juicer',
    )
    expect(twice.items).toContainEqual(
      expect.objectContaining({ id: 'user-item', name: 'Family keepsake' }),
    )
    expect(
      twice.weapons.filter((item) => item.id === 'starting:juicer:ja11'),
    ).toHaveLength(1)
    expect(
      twice.weapons.find((item) => item.id === 'starting:juicer:ja11').name,
    ).toBe('Customized JA-11')
  })
})
