import { describe, expect, it } from 'vitest'
import {
  reconcileStartingEquipment,
  specializationEquipmentPackages,
  startingEquipmentPackages,
} from '../../../src/data/character/startingEquipment.js'
import { occs } from '../../../src/data/character/occs.js'
import { legalStartingEquipmentEntries } from '../../../src/data/character/equipmentCatalog.js'

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
  })

  it('keeps source-listed gear as distinct inventory records', () => {
    const cyberKnightNames = startingEquipmentPackages['cyber-knight'].entries
      .map((item) => item.name)
      .filter(Boolean)
    expect(cyberKnightNames).toContain('Gas mask')
    expect(cyberKnightNames).toContain('First-aid kit')
    expect(cyberKnightNames).toContain('Geiger counter')
    expect(cyberKnightNames).not.toContain(
      expect.stringContaining('Gas mask, goggles'),
    )

    const robotPilotNames = startingEquipmentPackages['robot-pilot'].entries
      .map((item) => item.name)
      .filter(Boolean)
    expect(robotPilotNames).toContain('Gyro-Compass implant')
    expect(robotPilotNames).toContain('Clock Calendar implant')
  })

  it('marks every unresolved starting selection as an explicit choice', () => {
    const choices = Object.values(startingEquipmentPackages)
      .flatMap((equipmentPackage) => equipmentPackage.entries)
      .filter((item) => item.choice)
    expect(choices.length).toBeGreaterThan(0)
    for (const item of choices) {
      expect(item.name).toBe('')
      expect(item.choice.prompt).toEqual(expect.any(String))
    }
    expect(
      startingEquipmentPackages['robot-pilot'].entries.find(
        (item) => item.id === 'vibro-weapon',
      ).choice,
    ).toMatchObject({ prompt: 'Choose a Vibro-weapon' })
  })

  it('limits starting choices to legal Armory records', () => {
    const robotChoices = startingEquipmentPackages['robot-pilot'].entries
      .filter((item) => item.choice)
      .map((item) => [
        item.choice.prompt,
        legalStartingEquipmentEntries(item.choice),
      ])
    const vibroEntries = robotChoices.find(
      ([prompt]) => prompt === 'Choose a Vibro-weapon',
    )[1]
    expect(vibroEntries.length).toBeGreaterThan(0)
    expect(
      vibroEntries.every(
        (entry) => entry.subcategory === 'Vibro-Blades & Integrated Blades',
      ),
    ).toBe(true)

    const sidearms = robotChoices.find(
      ([prompt]) => prompt === 'Choose a sidearm',
    )[1]
    expect(sidearms.length).toBeGreaterThan(0)
    expect(
      sidearms.every(
        (entry) =>
          entry.category === 'Ranged Weapons' &&
          /pistol|blaster|sidearm/i.test(entry.name),
      ),
    ).toBe(true)

    const wpWeapons = robotChoices.find(
      ([prompt]) => prompt === 'Choose one weapon for each W.P.',
    )[1]
    expect(wpWeapons.length).toBeGreaterThan(0)
    expect(
      wpWeapons.every((entry) =>
        ['Melee Weapons', 'Ranged Weapons'].includes(entry.category),
      ),
    ).toBe(true)
  })

  it('filters armor and vehicle choices by their inventory section', () => {
    const armorChoice = startingEquipmentPackages.operator.entries.find(
      (item) => item.kind === 'armor' && item.choice,
    )
    const armorEntries = legalStartingEquipmentEntries(
      armorChoice.choice,
      armorChoice.kind,
    )
    expect(armorEntries.length).toBeGreaterThan(0)
    expect(armorEntries.every((entry) => entry.metadata.kind === 'armor')).toBe(
      true,
    )

    const vehicleChoice = startingEquipmentPackages.operator.entries.find(
      (item) => item.kind === 'vehicles' && item.choice,
    )
    const vehicleEntries = legalStartingEquipmentEntries(
      vehicleChoice.choice,
      vehicleChoice.kind,
    )
    expect(vehicleEntries.length).toBeGreaterThan(0)
    expect(
      vehicleEntries.every(
        (entry) =>
          entry.metadata.kind === 'vehicles' && entry.category === 'Vehicles',
      ),
    ).toBe(true)
  })

  it('expands repeated and W.P.-bound choices into distinct inventory slots', () => {
    const equipment = reconcileStartingEquipment(
      blankEquipment(),
      startingEquipmentPackages['merc-soldier'],
      'merc-soldier',
      {
        weaponProficiencies: [
          { id: 'wp-knife', name: 'W.P. Knife' },
          { id: 'wp-energy-rifle', name: 'W.P. Energy Rifle' },
        ],
      },
    )
    const wpChoices = equipment.weapons.filter(
      (item) => item.choice?.weaponProficiency,
    )
    expect(wpChoices).toHaveLength(2)
    expect(new Set(wpChoices.map((item) => item.id)).size).toBe(2)
    const energyRifleChoice = wpChoices.find(
      (item) => item.choice.weaponProficiency === 'wp-energy-rifle',
    )
    const legalRifles = legalStartingEquipmentEntries(energyRifleChoice.choice)
    expect(legalRifles.length).toBeGreaterThan(0)
    expect(
      legalRifles.every(
        (entry) =>
          entry.category === 'Ranged Weapons' && /rifle/i.test(entry.name),
      ),
    ).toBe(true)

    const crazy = reconcileStartingEquipment(
      blankEquipment(),
      startingEquipmentPackages.crazy,
      'crazy',
    )
    expect(
      crazy.weapons.filter((item) =>
        item.choice?.rulePrompt?.includes('ancient weapons'),
      ),
    ).toHaveLength(2)
  })

  it('offers an explicit custom record when Armory has no legal bionic item', () => {
    const choice = startingEquipmentPackages['combat-cyborg'].entries.find(
      (item) => item.id === 'bionic-weapons-tools',
    ).choice
    const entries = legalStartingEquipmentEntries(choice)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      name: 'Custom equipment choice',
      metadata: { kind: 'weapons', customChoice: true },
    })
    const equipment = reconcileStartingEquipment(
      blankEquipment(),
      startingEquipmentPackages['combat-cyborg'],
      'combat-cyborg',
    )
    expect(
      equipment.weapons.filter(
        (item) =>
          item.choice?.rulePrompt === 'Choose four bionic weapons or tools',
      ),
    ).toHaveLength(4)
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

  it('hydrates unambiguous class equipment from the shared Armory', () => {
    const equipment = reconcileStartingEquipment(
      blankEquipment(),
      startingEquipmentPackages.crazy,
      'crazy',
    )
    const vibroKnife = equipment.weapons.find(
      (item) => item.id === 'starting:crazy:vibro-knife',
    )
    expect(vibroKnife).toMatchObject({
      name: 'Vibro-Knife',
      catalogSelectionId: 'rue-vibro-knife',
      source: { book: 'Rifts Ultimate Edition', pages: '56-57' },
    })
    expect(vibroKnife.statistics.length).toBeGreaterThan(0)
    expect(vibroKnife.damage).toBeTruthy()
  })

  it('migrates obsolete bundles and legacy choice labels safely', () => {
    const equipment = blankEquipment()
    equipment.items.push({
      id: 'starting:robot-pilot:field-gear',
      name: 'Four flares, survival knife, first-aid kit and more',
      startingOrigin: 'robot-pilot',
    })
    equipment.weapons.push({
      id: 'starting:robot-pilot:vibro-weapon',
      name: 'Vibro-Knife or Vibro-Sword',
      startingOrigin: 'robot-pilot',
    })

    const migrated = reconcileStartingEquipment(
      equipment,
      startingEquipmentPackages['robot-pilot'],
      'robot-pilot',
    )
    expect(migrated.items.some((item) => item.id.endsWith(':field-gear'))).toBe(
      false,
    )
    expect(
      migrated.weapons.find((item) => item.id.endsWith(':vibro-weapon')),
    ).toMatchObject({
      name: '',
      choice: { options: ['Vibro-Knife', 'Vibro-Sword'] },
    })
  })
})
