import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import catalog from '../data/tw-devices.json'
import { groupDevices, searchDevices } from './deviceSearch.js'

const statisticOrder = [
  'Damage', 'Powers / Effects', 'Modes', 'Range', 'Rate of Fire', 'Payload',
  'Activation / Reload Cost', 'Duration', 'Price', 'Durability / Protection',
  'Bonuses', 'Penalties / Limitations', 'Speed', 'Altitude', 'Weight / Capacity',
  'Crew', 'Model / Manufacturer', 'Construction Cost', 'Construction Time',
  'Construction Requirements',
]

describe('TW device catalog', () => {
  it('contains valid, uniquely identified entries', () => {
    expect(catalog.devices.length).toBeGreaterThan(100)
    expect(new Set(catalog.devices.map(device => device.id)).size).toBe(catalog.devices.length)
    expect(new Set(catalog.devices.map(device => device.name)).size).toBe(catalog.devices.length)
    for (const device of catalog.devices) {
      expect(device).toMatchObject({
        id: expect.any(String), name: expect.any(String), category: expect.any(String),
        source: expect.any(String), page: expect.any(Number), description: expect.any(String),
        image: expect.stringMatching(/^\/assets\/tw-devices\/[a-z0-9-]+\.webp$/),
        statistics: expect.any(Array),
      })
      expect(device.description.length).toBeGreaterThan(39)
      expect(device.name).not.toMatch(/\([^)]*(?:\bby\b|rifts(?:®)?\s*(?:rpg|book|ultimate|edition|sourcebook))[^)]*\)/i)
      expect(existsSync(new URL(`../../../../public${device.image}`, import.meta.url))).toBe(true)
      for (const statistic of device.statistics) {
        expect(statistic).toMatchObject({ label: expect.any(String), value: expect.any(String) })
        if (statistic.details) expect(statistic.details).toEqual(expect.any(String))
      }
    }
    expect(catalog.devices.filter(device => device.statistics.length).length).toBeGreaterThanOrEqual(110)
  })

  it('searches names, categories, and entry text with all query terms', () => {
    expect(searchDevices(catalog.devices, 'flaming sword').some(device => device.name.includes('Flaming Sword'))).toBe(true)
    expect(searchDevices(catalog.devices, 'vehicle system').every(device => /vehicle|system/i.test(`${device.category} ${device.description}`))).toBe(true)
    expect(searchDevices(catalog.devices, 'psychic camera').map(device => device.name)).toContain('Psychic Camera')
  })

  it('groups filtered entries without empty categories', () => {
    const groups = groupDevices(searchDevices(catalog.devices, 'water'))
    expect(groups.length).toBeGreaterThan(1)
    expect(groups.every(group => group.devices.length > 0)).toBe(true)
  })

  it('has normalized damage summaries for every weapon entry', () => {
    const weaponCategories = new Set([
      'Melee Weapons', 'Pistols & Revolvers', 'Rifles & Shotguns',
      'Heavy Weapons', 'Explosives & Pyrotechnics', 'Vampire-Slaying Weapons',
    ])
    const weapons = catalog.devices.filter(device => weaponCategories.has(device.category))
    expect(weapons.length).toBeGreaterThan(80)
    for (const weapon of weapons) {
      expect(weapon.statistics.some(statistic => statistic.label === 'Damage')).toBe(true)
      expect(weapon.description).not.toMatch(/Zach Westendorf|Order #|\b[1-9]0[468]\b|\b[Ll]S\.P\./)
    }
  })

  it('uses a fixed card order and separates purchase, activation, and construction costs', () => {
    for (const device of catalog.devices) {
      const ranks = device.statistics.map(statistic => statisticOrder.indexOf(statistic.label))
      expect(ranks.every(rank => rank >= 0)).toBe(true)
      expect(ranks).toEqual([...ranks].sort((left, right) => left - right))
      expect(device.statistics.some(statistic => ['Price / Cost', 'Activation / Energy Cost'].includes(statistic.label))).toBe(false)
    }

    const flamingSword = catalog.devices.find(device => device.id === 'flaming-sword-rifts-rpg')
    expect(flamingSword.statistics.find(statistic => statistic.label === 'Price')?.value).toContain('90,000 credits')
    expect(flamingSword.statistics.find(statistic => statistic.label === 'Construction Cost')?.value).toContain('275')
    expect(flamingSword.statistics.find(statistic => statistic.label === 'Activation / Reload Cost')?.value).toMatch(/14 P\.P\.E\.|28 I\.S\.P\./)

    const fireboltPistol = catalog.devices.find(device => device.id === 'tw-firebolt-pistol')
    expect(fireboltPistol.statistics.find(statistic => statistic.label === 'Price')?.value).toMatch(/Gun: 80,000 credits.*clip: 40,000 cr/i)
    expect(fireboltPistol.statistics.some(statistic => statistic.label === 'Activation / Reload Cost')).toBe(false)
  })

  it('keeps Book of Magic entries free of known PDF extraction artifacts', () => {
    const bookEntries = catalog.devices.filter(device => device.source === 'Rifts Book of Magic')
    expect(bookEntries.length).toBeGreaterThan(110)
    for (const device of bookEntries) {
      expect(device.description).not.toMatch(
        /Zach Westendorf|Order #|\b[1-9]0[468]\b|\b[IiLl]D\d|x(?:1|I|l|J)[Oo]|\b[Ll]S\.P\.|\b\d\s+\d{1,2}\b|\s+[,.!?;]/,
      )
      for (const statistic of device.statistics) {
        expect(statistic.value).not.toMatch(/Zach Westendorf|Order #|\b[1-9]0[468]\b|\b[Ll]S\.P\./)
      }
    }
  })
})
