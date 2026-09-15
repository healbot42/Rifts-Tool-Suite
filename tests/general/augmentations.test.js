import { describe, expect, it } from 'vitest'
import {
  augmentationCatalog,
  augmentationChoices,
  augmentationsForChoice,
} from '../../src/data/character/augmentations.js'
import { startingEquipmentPackages } from '../../src/data/character/startingEquipment.js'

describe('RUE augmentation data', () => {
  it('provides stable, source-backed records from the core-book catalog', () => {
    expect(augmentationCatalog.length).toBeGreaterThan(50)
    expect(new Set(augmentationCatalog.map((entry) => entry.id)).size).toBe(
      augmentationCatalog.length,
    )
    for (const entry of augmentationCatalog) {
      expect(entry.id).toMatch(/^rue-/)
      expect(entry.description).toEqual(expect.any(String))
      expect(entry.statistics.length).toBeGreaterThan(0)
      expect(entry.source).toMatchObject({
        book: 'Rifts Ultimate Edition',
        pages: expect.stringMatching(/^(?:4[89]|5[0-3])$/),
      })
    }
  })

  it('filters Combat Cyborg choices by augmentation category', () => {
    const sensors = augmentationsForChoice('combat-cyborg-sensory-systems')
    const weapons = augmentationsForChoice('combat-cyborg-weapons-tools')
    const features = augmentationsForChoice(
      'combat-cyborg-features-accessories',
    )
    expect(sensors.length).toBeGreaterThan(0)
    expect(weapons.length).toBeGreaterThan(0)
    expect(features.length).toBeGreaterThan(0)
    expect(sensors.every((entry) => entry.category === 'sensory-optics')).toBe(
      true,
    )
    expect(weapons.every((entry) => entry.category === 'weapons-tools')).toBe(
      true,
    )
    expect(
      features.every((entry) => entry.category === 'features-accessories'),
    ).toBe(true)
  })

  it('links class starting choices to stable augmentation contracts', () => {
    const combatCyborg = startingEquipmentPackages['combat-cyborg'].entries
    expect(
      combatCyborg
        .filter((entry) => entry.choice?.augmentationChoiceId)
        .map((entry) => entry.choice.augmentationChoiceId),
    ).toEqual([
      'combat-cyborg-sensory-systems',
      'combat-cyborg-weapons-tools',
      'combat-cyborg-features-accessories',
    ])
    expect(
      startingEquipmentPackages.headhunter.entries.find(
        (entry) => entry.id === 'implants',
      ).choice.augmentationChoiceId,
    ).toBe('headhunter-implant-package')
    for (const equipmentPackage of Object.values(startingEquipmentPackages)) {
      for (const entry of equipmentPackage.entries) {
        if (entry.choice?.augmentationChoiceId)
          expect(
            augmentationChoices[entry.choice.augmentationChoiceId],
          ).toBeDefined()
      }
    }
  })

  it('preserves the Headhunter package alternatives and source dice', () => {
    expect(augmentationChoices['headhunter-implant-package']).toMatchObject({
      alternatives: [
        {
          id: 'implants-and-limb',
          grants: [
            { count: { dice: '1D4+1' } },
            { count: 1, kind: 'bionic-limb' },
            { count: 2, location: 'limb' },
          ],
        },
        { id: 'partial-conversion' },
      ],
      source: { book: 'Rifts Ultimate Edition', pages: '76-77' },
    })
  })
})
