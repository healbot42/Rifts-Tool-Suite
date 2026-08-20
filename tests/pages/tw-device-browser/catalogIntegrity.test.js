import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import catalog from '../../../src/data/tw-devices/tw-devices.json'
import { STATISTIC_ORDER } from '../../../src/data/tw-devices/statistics.js'
import { resolveDeviceImageUrl } from '../../../src/pages/tw-device-browser/lib/deviceAssets.js'
import { groupArmoryItems } from '../../../src/pages/tw-device-browser/lib/deviceSearch.js'
import rueCatalog from '../../../src/data/items/rifts-ultimate-edition.json'

describe('TW device catalog', () => {
  it('classifies every RUE and TW record in the direct Armory hierarchy', () => {
    expect(catalog.devices).toHaveLength(120)
    const merged = [
      ...catalog.devices.map((device) => ({
        ...device,
        category: 'TW Devices',
        subcategory: device.category,
      })),
      ...rueCatalog.items,
    ]
    expect(merged).toHaveLength(323)
    expect(
      merged.every(({ category, subcategory }) => category && subcategory),
    ).toBe(true)
    expect(
      new Set(
        merged
          .filter(({ category }) => category === 'TW Devices')
          .map(({ subcategory }) => subcategory),
      ),
    ).toEqual(new Set(catalog.devices.map(({ category }) => category)))
    expect(groupArmoryItems(merged).map(({ category }) => category)).toEqual([
      'TW Devices',
      'Melee Weapons',
      'Ranged Weapons',
      'Ammunition & Explosives',
      'Armor',
      'Power Armor',
      'Robots',
      'Vehicles',
      'Medical',
      'Utility & Field Gear',
      'Communications',
      'Computers & Media',
      'Optics & Surveillance',
      'Sensors & Detection',
      'Scientific & Laboratory',
    ])
    const grouped = groupArmoryItems(merged)
    expect(
      grouped.find(({ category }) => category === 'Medical'),
    ).toMatchObject({
      groups: [{ subcategory: 'Treatment & Medical Systems' }],
      directDevices: expect.arrayContaining([
        expect.objectContaining({ id: 'rue-standard-first-aid-kit' }),
      ]),
    })
    expect(
      grouped.find(({ category }) => category === 'Ranged Weapons')
        ?.directDevices,
    ).toEqual([])
  })

  it('includes the complete source-defined RUE armory inventory', () => {
    expect(rueCatalog.items).toHaveLength(203)
    expect(new Set(rueCatalog.items.map((item) => item.id)).size).toBe(203)
    expect(new Set(rueCatalog.items.map((item) => item.description)).size).toBe(
      203,
    )
    expect(rueCatalog.items.filter((item) => item.image)).toHaveLength(185)
    expect(rueCatalog.items.map((item) => item.id)).not.toEqual(
      expect.arrayContaining([
        'rue-ng-45lp-long-pistol',
        'rue-ng-56-light-ion-pistol',
        'rue-ng-59-ion-blaster',
        'rue-ng-e4-plasma-ejector',
        'rue-explorer-lightweight-environmental-body-armor',
        'rue-hover-platform',
        'rue-wilderness-crusader-armored-all-terrain-vehicle',
      ]),
    )
    expect(
      rueCatalog.items.find(
        (item) => item.id === 'rue-ng-juicer-variable-laser-rifle-ja-12',
      ),
    ).toMatchObject({
      name: 'JA-9 Juicer Assassin Variable Laser Rifle',
      page: 270,
      compatibility: { legacyId: 'rue-ng-juicer-variable-laser-rifle-ja-12' },
    })
    expect(
      rueCatalog.items.every(
        (item) => item.source === 'Rifts Ultimate Edition',
      ),
    ).toBe(true)
    expect(
      rueCatalog.items.every(
        (item) =>
          item.description.length > 20 &&
          item.statistics.length > 0 &&
          !/Consult the source entry/i.test(item.description) &&
          Number.isInteger(item.page) &&
          ((item.page >= 240 && item.page <= 274) || item.page === 71) &&
          ['heading', 'table-row', 'rules-block'].includes(
            item.sourceLocator?.kind,
          ) &&
          item.sourceLocator.anchor.length > 0 &&
          item.statistics.every(
            (statistic) => statistic.label !== 'Source Details',
          ),
      ),
    ).toBe(true)
    expect(
      rueCatalog.items.some(
        (item) =>
          item.id === 'rue-titan-industries-ft-005-flying-titan-power-armor' &&
          item.page === 272,
      ),
    ).toBe(true)
    expect(
      rueCatalog.items.every(
        ({ category, subcategory }) =>
          category &&
          subcategory &&
          ![
            'Rifts Ultimate Edition',
            'Basic / Common Equipment',
            'Technical Equipment',
            'Weapons',
            'Armor, Vehicles & Machines',
          ].includes(category),
      ),
    ).toBe(true)
    for (const sharedId of [
      'basic-gear-disposable-lighter-or-matches',
      'basic-gear-cheap-sunglasses-or-goggles',
      'thermal-imager-forms',
      'passive-night-sight-forms',
    ]) {
      expect(
        rueCatalog.items.filter((item) => item.sharedRules?.id === sharedId),
      ).toHaveLength(2)
    }
    expect(
      rueCatalog.items.some(
        (item) =>
          item.id === 'rue-titan-industries-tr-001-titan-combat-robot' &&
          item.page === 273,
      ),
    ).toBe(true)
    expect(
      groupArmoryItems([
        { category: 'TW Devices', subcategory: 'Tools', id: 'one' },
        { category: 'Medical', subcategory: 'Field Care', id: 'two' },
      ]),
    ).toHaveLength(2)
  })
  it('keeps RUE descriptions and statistics free of known OCR artifacts', () => {
    const artifactPattern =
      /\u00ad|\uFFFD|\s+[,.!?;:]|\b[IiLl]\s*D\s*(?:4|6|8|10|12|20)\b|\b[1-9]0(?:4|6|8|10|12|20)\b|\b(?:avail abil ity|bla ck|com puter|cred its|dam age|des igned|mega-dam age|pay load|reloa d|tem porarily|vib ro|weig ht|footl|Ibs|Ian)\b/i
    for (const item of rueCatalog.items) {
      expect(item.description).not.toMatch(artifactPattern)
      for (const statistic of item.statistics) {
        expect(statistic.value).not.toMatch(artifactPattern)
        if (statistic.details)
          expect(statistic.details).not.toMatch(artifactPattern)
      }
    }
    expect(
      rueCatalog.items.find(({ id }) => id === 'rue-c-18-laser-pistol'),
    ).toMatchObject({
      statistics: expect.arrayContaining([
        { label: 'Damage', value: '2D4 M.D.' },
      ]),
    })
    expect(
      rueCatalog.items.find(({ id }) => id === 'rue-vibro-claws')?.description,
    ).not.toMatch(/Vibro-Knife|Neural Mace/)
    expect(
      rueCatalog.items.find(({ id }) => id === 'rue-neural-mace')?.description,
    ).not.toMatch(/Vibro-Knife|Vibro-Bayonet/)
    const communicationsHelmet = rueCatalog.items.find(
      ({ id }) => id === 'rue-communications-helmet',
    )
    expect(communicationsHelmet?.description).not.toMatch(/portable computer/i)
    expect(communicationsHelmet?.statistics).toContainEqual({
      label: 'Price',
      value: '5,500 or 10,000 credits respectively',
    })
    const portableComputer = rueCatalog.items.find(
      ({ id }) => id === 'rue-portable-computer',
    )
    expect(portableComputer?.description).toMatch(/24 hours/)
    expect(portableComputer?.description).not.toMatch(/communications helmet/i)
    const compuDrugDispenser = rueCatalog.items.find(
      ({ id }) => id === 'rue-compu-drug-dispenser',
    )
    expect(compuDrugDispenser?.description).toMatch(/48 measured drug shots/)
    expect(compuDrugDispenser?.description).not.toMatch(
      /first-aid|hypodermic gun:/i,
    )
    expect(
      rueCatalog.items.find(({ id }) => id === 'rue-standard-first-aid-kit')
        ?.description,
    ).not.toMatch(/hypodermic gun:/i)
    expect(
      rueCatalog.items.find(({ id }) => id === 'rue-hypodermic-syringe')
        ?.description,
    ).not.toMatch(/IRMSS/i)
    const technicalEquipment = rueCatalog.items.filter(({ page }) =>
      [263, 264, 265].includes(page),
    )
    expect(
      technicalEquipment.find(({ id }) => id === 'rue-wireless-microphone'),
    ).toMatchObject({
      page: 265,
      sourceLocator: { kind: 'heading', anchor: 'Wireless Microphone' },
      statistics: expect.arrayContaining([
        { label: 'Price', value: '250 credits; poor availability' },
      ]),
    })
    expect(
      Object.fromEntries(
        [...new Set(rueCatalog.items.map(({ category }) => category))].map(
          (category) => [
            category,
            rueCatalog.items.filter((item) => item.category === category)
              .length,
          ],
        ),
      ),
    ).toEqual({
      'Utility & Field Gear': 35,
      Medical: 19,
      Vehicles: 6,
      'Optics & Surveillance': 23,
      'Sensors & Detection': 16,
      'Melee Weapons': 20,
      Communications: 8,
      'Scientific & Laboratory': 3,
      'Computers & Media': 6,
      'Ranged Weapons': 18,
      'Power Armor': 4,
      Robots: 4,
      Armor: 7,
      'Ammunition & Explosives': 34,
    })
    expect(
      rueCatalog.items.filter(({ category }) => category === 'Melee Weapons'),
    ).toHaveLength(20)
    expect(
      rueCatalog.items.filter(({ category }) => category === 'Ranged Weapons'),
    ).toHaveLength(18)
    expect(
      rueCatalog.items.find(({ id }) => id === 'rue-wilks-jet-pack'),
    ).toMatchObject({ category: 'Vehicles', subcategory: 'Personal Mobility' })
    for (const [id, subcategory] of [
      ['rue-c-18-laser-pistol', 'Laser'],
      ['rue-ng-57-heavy-duty-ion-blaster', 'Ion'],
      ['rue-c-27-heavy-plasma-cannon', 'Plasma'],
      ['rue-ng-p7-particle-beam-rifle', 'Particle Beam'],
      ['rue-ng-101-rail-gun', 'Projectile & Rail Gun'],
      [
        'rue-c-14-fire-breather-assault-laser-and-grenade-launcher',
        'Hybrid / Multi-System',
      ],
      ['rue-vibro-sword', 'Vibro-Blades & Integrated Blades'],
      ['rue-neural-mace', 'Impact & Neural'],
    ])
      expect(rueCatalog.items.find((item) => item.id === id)?.subcategory).toBe(
        subcategory,
      )
    expect(
      rueCatalog.items.find(
        ({ id }) => id === 'rue-c-12-heavy-assault-laser-rifle',
      )?.description,
    ).not.toMatch(/CV-?212|rocket launcher/i)
    expect(
      rueCatalog.items.find(
        ({ id }) => id === 'rue-cv-212-variable-light-frequency-laser-rifle',
      )?.description,
    ).not.toMatch(/C-?12 Heavy|rocket launcher/i)
    expect(
      rueCatalog.items.find(({ id }) => id === 'rue-highwayman-motorcycle')
        ?.description,
    ).not.toMatch(/Big Boss|Mountaineer/i)
  })
  it('resolves catalog images beneath the deployed site base path', () => {
    expect(
      resolveDeviceImageUrl(
        '/assets/tw-devices/example.webp',
        '/Rifts-Tool-Suite/',
      ),
    ).toBe('/Rifts-Tool-Suite/assets/tw-devices/example.webp')
  })

  it('contains valid, uniquely identified entries', () => {
    expect(catalog.devices.length).toBeGreaterThan(100)
    expect(new Set(catalog.devices.map((device) => device.id)).size).toBe(
      catalog.devices.length,
    )
    expect(new Set(catalog.devices.map((device) => device.name)).size).toBe(
      catalog.devices.length,
    )
    for (const device of catalog.devices) {
      expect(device).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        category: expect.any(String),
        source: expect.any(String),
        page: expect.any(Number),
        description: expect.any(String),
        image: expect.stringMatching(
          /^\/assets\/tw-devices\/[a-z0-9-]+\.webp$/,
        ),
        statistics: expect.any(Array),
      })
      expect(device.description.length).toBeGreaterThan(39)
      expect(device.name).not.toMatch(
        /\([^)]*(?:\bby\b|rifts(?:®)?\s*(?:rpg|book|ultimate|edition|sourcebook))[^)]*\)/i,
      )
      expect(
        existsSync(new URL(`../../../public${device.image}`, import.meta.url)),
      ).toBe(true)
      for (const statistic of device.statistics) {
        expect(statistic).toMatchObject({
          label: expect.any(String),
          value: expect.any(String),
        })
        if (statistic.details)
          expect(statistic.details).toEqual(expect.any(String))
      }
    }
    expect(
      catalog.devices.filter((device) => device.statistics.length).length,
    ).toBeGreaterThanOrEqual(110)
  })

  it('has normalized damage summaries for every weapon entry', () => {
    const weaponCategories = new Set([
      'Melee Weapons',
      'Pistols & Revolvers',
      'Rifles & Shotguns',
      'Heavy Weapons',
      'Explosives & Pyrotechnics',
      'Vampire-Slaying Weapons',
    ])
    const weapons = catalog.devices.filter((device) =>
      weaponCategories.has(device.category),
    )
    expect(weapons.length).toBeGreaterThan(80)
    for (const weapon of weapons) {
      expect(
        weapon.statistics.some((statistic) => statistic.label === 'Damage'),
      ).toBe(true)
      expect(weapon.description).not.toMatch(
        /Zach Westendorf|Order #|\b[1-9]0[468]\b|\b[Ll]S\.P\./,
      )
    }
  })

  it('uses a fixed card order and separates purchase, activation, and construction costs', () => {
    for (const device of catalog.devices) {
      const ranks = device.statistics.map((statistic) =>
        STATISTIC_ORDER.indexOf(statistic.label),
      )
      expect(ranks.every((rank) => rank >= 0)).toBe(true)
      expect(ranks).toEqual([...ranks].sort((left, right) => left - right))
      expect(
        device.statistics.some((statistic) =>
          ['Price / Cost', 'Activation / Energy Cost'].includes(
            statistic.label,
          ),
        ),
      ).toBe(false)
    }

    const flamingSword = catalog.devices.find(
      (device) => device.id === 'flaming-sword-rifts-rpg',
    )
    expect(
      flamingSword.statistics.find((statistic) => statistic.label === 'Price')
        ?.value,
    ).toContain('90,000 credits')
    expect(
      flamingSword.statistics.find(
        (statistic) => statistic.label === 'Construction Cost',
      )?.value,
    ).toContain('275')
    expect(
      flamingSword.statistics.find(
        (statistic) => statistic.label === 'Activation / Reload Cost',
      )?.value,
    ).toMatch(/14 P\.P\.E\.|28 I\.S\.P\./)

    const fireboltPistol = catalog.devices.find(
      (device) => device.id === 'tw-firebolt-pistol',
    )
    expect(
      fireboltPistol.statistics.find((statistic) => statistic.label === 'Price')
        ?.value,
    ).toMatch(/Gun: 80,000 credits.*clip: 40,000 cr/i)
    expect(
      fireboltPistol.statistics.some(
        (statistic) => statistic.label === 'Activation / Reload Cost',
      ),
    ).toBe(false)
  })

  it('keeps Book of Magic entries free of known PDF extraction artifacts', () => {
    const bookEntries = catalog.devices.filter(
      (device) => device.source === 'Rifts Book of Magic',
    )
    expect(bookEntries.length).toBeGreaterThan(110)
    for (const device of bookEntries) {
      expect(device.description).not.toMatch(
        /Zach Westendorf|Order #|\b[1-9]0[468]\b|\b[IiLl]D\d|x(?:1|I|l|J)[Oo]|\b[Ll]S\.P\.|\b\d\s+\d{1,2}\b|\s+[,.!?;]/,
      )
      for (const statistic of device.statistics) {
        expect(statistic.value).not.toMatch(
          /Zach Westendorf|Order #|\b[1-9]0[468]\b|\b[Ll]S\.P\./,
        )
      }
    }
  })
})
