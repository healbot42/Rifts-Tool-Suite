import { describe, expect, it } from 'vitest'
import catalog from '../../../src/data/tw-devices/tw-devices.json'
import {
  groupDevices,
  resolveFilteredSelection,
  searchDevices,
} from '../../../src/pages/tw-device-browser/lib/deviceSearch.js'

describe('Armory search and selection', () => {
  it('searches names, categories, and entry text with all query terms', () => {
    expect(
      searchDevices(catalog.devices, 'flaming sword').some((device) =>
        device.name.includes('Flaming Sword'),
      ),
    ).toBe(true)
    expect(
      searchDevices(catalog.devices, 'vehicle system').every((device) =>
        /vehicle|system/i.test(`${device.category} ${device.description}`),
      ),
    ).toBe(true)
    expect(
      searchDevices(catalog.devices, 'psychic camera').map(
        (device) => device.name,
      ),
    ).toContain('Psychic Camera')
  })

  it('keeps detail selection inside the current filtered results', () => {
    const devices = [
      { id: 'one', name: 'One' },
      { id: 'two', name: 'Two' },
    ]
    expect(resolveFilteredSelection(devices, 'two')).toBe(devices[1])
    expect(resolveFilteredSelection([devices[0]], 'two')).toBe(devices[0])
    expect(resolveFilteredSelection([], 'two')).toBeNull()
  })

  it('groups filtered entries without empty categories', () => {
    const groups = groupDevices(searchDevices(catalog.devices, 'water'))
    expect(groups.length).toBeGreaterThan(1)
    expect(groups.every((group) => group.devices.length > 0)).toBe(true)
  })
})
