import twCatalog from '../tw-devices/tw-devices.json'
import rueCatalog from './rifts-ultimate-edition.json'

// The prefix prevents collisions without changing either canonical source ID.
export const armoryItems = Object.freeze([
  ...twCatalog.devices.map((device) => ({
    ...device,
    id: `tw-${device.id}`,
    category: 'TW Devices',
    subcategory: device.category,
    catalog: 'tw-devices',
    sourceId: device.id,
  })),
  ...rueCatalog.items.map((item) => ({
    ...item,
    catalog: 'rifts-ultimate-edition',
    sourceId: item.id,
  })),
])
