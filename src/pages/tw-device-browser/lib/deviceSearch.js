// Product navigation order is intentional; unknown future categories append
// after these entries rather than silently disappearing.
export const CATEGORY_ORDER = Object.freeze([
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

const SUBCATEGORY_ORDER = Object.freeze([
  'Conventional Blades',
  'Vibro-Blades & Integrated Blades',
  'Impact & Neural',
  'Piercing & Anti-Vampire',
  'Laser',
  'Ion',
  'Plasma',
  'Particle Beam',
  'Projectile & Rail Gun',
  'Missile, Rocket & Grenade Launchers',
  'Hybrid / Multi-System',
  'Mini-Missiles',
  'Short-Range Missiles',
  'Medium-Range Missiles',
  'Long-Range Missiles & Torpedoes',
  'Grenades',
  'Demolitions & Fusion Blocks',
])

const searchableText = (device) =>
  `${device.name} ${device.category} ${device.subcategory ?? ''} ${device.source} ${device.description}`.toLocaleLowerCase()

/**
 * Filters catalog records using AND semantics across normalized query terms.
 *
 * @param {Array<object>} devices Catalog records in their existing order.
 * @param {string} query Free-text query matched against all searchable fields.
 * @returns {Array<object>} The original array for an empty query, or matches.
 */
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

/**
 * Keeps detail selection inside the current filtered result set.
 *
 * @param {Array<object>} filteredDevices Search results in display order.
 * @param {string} selectedId Previously selected catalog ID.
 * @returns {object|null} The retained match, first result, or no selection.
 */
export function resolveFilteredSelection(filteredDevices, selectedId) {
  return (
    filteredDevices.find((device) => device.id === selectedId) ??
    filteredDevices[0] ??
    null
  )
}

/**
 * Groups the legacy flat TW catalog while preserving canonical category order.
 *
 * @param {Array<object>} devices TW device records.
 * @returns {Array<{category: string, devices: Array<object>}>} Non-empty
 * groups.
 */
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

/**
 * Groups mixed Armory records by category and subgroup for nested navigation.
 * A sole subgroup is also exposed as directDevices so legacy TW categories do
 * not gain a redundant second disclosure level.
 *
 * @param {Array<object>} items Armory records with category metadata.
 * @returns {Array<object>} Ordered, non-empty navigation groups.
 */
export function groupArmoryItems(items) {
  const categories = new Map(
    CATEGORY_ORDER.map((category) => [category, new Map()]),
  )
  for (const item of items) {
    if (!categories.has(item.category)) categories.set(item.category, new Map())
    const groups = categories.get(item.category)
    const subgroup = item.subcategory ?? 'Other'
    if (!groups.has(subgroup)) groups.set(subgroup, [])
    groups.get(subgroup).push(item)
  }
  return [...categories]
    .map(([category, groups]) => {
      const orderedGroups = [...groups]
        .sort(([left], [right]) => {
          const leftRank = SUBCATEGORY_ORDER.indexOf(left)
          const rightRank = SUBCATEGORY_ORDER.indexOf(right)
          if (leftRank < 0 && rightRank < 0) return left.localeCompare(right)
          if (leftRank < 0) return 1
          if (rightRank < 0) return -1
          return leftRank - rightRank
        })
        .map(([subcategory, devices]) => ({ subcategory, devices }))
      return {
        category,
        groups: orderedGroups,
        directDevices:
          orderedGroups.length === 1 ? orderedGroups[0].devices : [],
      }
    })
    .filter(({ groups }) => groups.length)
}
