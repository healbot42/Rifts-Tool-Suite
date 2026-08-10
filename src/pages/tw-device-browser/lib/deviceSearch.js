export const CATEGORY_ORDER = Object.freeze([
  'Melee Weapons',
  'Pistols & Revolvers',
  'Rifles & Shotguns',
  'Heavy Weapons',
  'Explosives & Pyrotechnics',
  'Vampire-Slaying Weapons',
  'Bionics',
  'Tools & Equipment',
  'Vehicle Systems',
])

const searchableText = (device) =>
  `${device.name} ${device.category} ${device.description}`.toLocaleLowerCase()

export function searchDevices(devices, query = '') {
  const terms = String(query)
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!terms.length) return devices
  return devices.filter((device) => {
    const haystack = searchableText(device)
    return terms.every((term) => haystack.includes(term))
  })
}

export function groupDevices(devices) {
  const groups = new Map(CATEGORY_ORDER.map((category) => [category, []]))
  for (const device of devices) {
    if (!groups.has(device.category)) groups.set(device.category, [])
    groups.get(device.category).push(device)
  }
  return [...groups.entries()]
    .map(([category, entries]) => ({ category, devices: entries }))
    .filter((group) => group.devices.length)
}
