export const ARMORY_CATEGORY_ORDER = Object.freeze([
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

const searchableText = (item) =>
  `${item.name} ${item.category} ${item.subcategory ?? ''} ${item.source} ${item.description}`.toLocaleLowerCase()

export function searchArmoryItems(items, query = '') {
  const terms = String(query)
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!terms.length) return items
  return items.filter((item) => {
    const haystack = searchableText(item)
    return terms.every((term) => haystack.includes(term))
  })
}

export function resolveArmorySelection(items, selectedId) {
  return items.find((item) => item.id === selectedId) ?? items[0] ?? null
}

export function groupArmoryCatalog(items) {
  const categories = new Map(
    ARMORY_CATEGORY_ORDER.map((category) => [category, new Map()]),
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
      const subgroups = [...groups]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([subcategory, entries]) => ({ subcategory, entries }))
      return {
        category,
        count: subgroups.reduce((sum, group) => sum + group.entries.length, 0),
        entries: subgroups.length === 1 ? subgroups[0].entries : [],
        subcategories: subgroups.length === 1 ? [] : subgroups,
      }
    })
    .filter((group) => group.count)
}
