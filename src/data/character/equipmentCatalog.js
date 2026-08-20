import { armoryItems } from '../items/armory.js'

function statisticValue(entry, ...labels) {
  return labels
    .map((label) =>
      entry.statistics?.find((statistic) => statistic.label === label),
    )
    .find(Boolean)?.value
}

function equipmentKind(entry) {
  if (['Melee Weapons', 'Ranged Weapons'].includes(entry.category))
    return 'weapons'
  if (entry.category === 'Armor') return 'armor'
  if (['Vehicles', 'Power Armor', 'Robots'].includes(entry.category))
    return 'vehicles'
  if (
    entry.category === 'TW Devices' &&
    /weapon|rifle|pistol|launcher|blade|grenade/i.test(entry.subcategory)
  )
    return 'weapons'
  return 'items'
}

function payloadMaximum(entry) {
  const payload = statisticValue(entry, 'Payload')
  const match = String(payload || '').match(
    /(\d+)\s+(?:shots?|rounds?|charges?)/i,
  )
  return match ? Number(match[1]) : 0
}

function numericStatisticValue(entry, ...labels) {
  const match = String(statisticValue(entry, ...labels) || '')
    .replace(/,/g, '')
    .match(/\d+/)
  return match ? Number(match[0]) : 0
}

const quantityAndNotes = [
  {
    id: 'quantity',
    label: 'Quantity',
    type: 'number',
    required: true,
    default: 1,
  },
  { id: 'notes', label: 'Character notes', type: 'text', default: '' },
]

/**
 * Adapts the complete Armory into character-owned snapshots. The snapshot
 * insulates saved characters from later catalog edits or removals.
 */
export const characterEquipmentCatalog = armoryItems.map((entry) => {
  const kind = equipmentKind(entry)
  return {
    ...entry,
    facets: { kind },
    options: quantityAndNotes,
    metadata: {
      kind,
      source: { book: entry.source, pages: String(entry.page) },
      defaults: {
        category: entry.subcategory || entry.category,
        damage: statisticValue(entry, 'Mega-Damage', 'Damage') || '',
        range: statisticValue(entry, 'Effective Range', 'Range') || '',
        rateOfFire: statisticValue(entry, 'Rate of Fire') || '',
        bonuses:
          statisticValue(entry, 'Bonus to Strike', 'Laser Targeting Bonus') ||
          '',
        ammoMax: payloadMaximum(entry),
        maxSdc: numericStatisticValue(entry, 'S.D.C.'),
        maxMdc: numericStatisticValue(entry, 'M.D.C.', 'Main Body M.D.C.'),
        weight: statisticValue(entry, 'Weight', 'Weight / Capacity') || '',
        value:
          statisticValue(entry, 'Black Market Cost', 'Price', 'Cost') || '',
        description: entry.description,
        statistics: entry.statistics || [],
        source: entry.source,
        page: entry.page,
        subcategory: entry.subcategory,
        image: entry.image,
      },
    },
  }
})

const characterEquipmentById = new Map(
  characterEquipmentCatalog.map((entry) => [entry.id, entry]),
)

export function armoryDefaultsForCatalogSelection(catalogSelectionId) {
  const entry = characterEquipmentById.get(catalogSelectionId)
  return entry ? { ...entry.metadata.defaults } : null
}

const startingEquipmentAliases = new Map([
  ['vibro knife', 'rue-vibro-knife'],
  ['ja 11 juicer assassin energy rifle', 'rue-ng-juicer-assault-rifle-ja-11'],
  ['usa g10 glitter boy power armor', 'rue-glitter-boy-power-armor'],
  ['ng samson power armor', 'rue-northern-gun-ng-x9-samson-power-armor'],
  ['portable irmss', 'rue-irmss-internal-robot-medical-surgeon-system'],
  ['irmss', 'rue-irmss-internal-robot-medical-surgeon-system'],
])

function normalizedEquipmentName(name) {
  return String(name)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const armoryByNormalizedName = new Map()
for (const entry of characterEquipmentCatalog) {
  const key = normalizedEquipmentName(entry.name)
  if (!armoryByNormalizedName.has(key)) armoryByNormalizedName.set(key, entry)
}

/** Returns an unambiguous Armory snapshot for a fixed starting item. */
export function armoryDefaultsForStartingItem(item) {
  if (!item?.name) return null
  const normalizedName = normalizedEquipmentName(item.name)
  const aliasId = startingEquipmentAliases.get(normalizedName)
  const entry = aliasId
    ? characterEquipmentCatalog.find((candidate) => candidate.id === aliasId)
    : armoryByNormalizedName.get(normalizedName)
  if (!entry) return null
  return {
    ...entry.metadata.defaults,
    catalogSelectionId: entry.id,
  }
}

const choiceRules = {
  'Choose light or medium body armor': (entry) =>
    [
      'rue-cs-dog-pack-light-riot-armor',
      'rue-huntsman-partial-body-armor',
    ].includes(entry.id),
  'Choose light or medium M.D.C. body armor': (entry) =>
    [
      'rue-cs-dog-pack-light-riot-armor',
      'rue-huntsman-partial-body-armor',
    ].includes(entry.id),
  'Choose light or medium flexible M.D.C. body armor': (entry) =>
    [
      'rue-cs-dog-pack-light-riot-armor',
      'rue-huntsman-partial-body-armor',
    ].includes(entry.id),
  'Choose medium or heavy body armor': (entry) =>
    [
      'rue-cs-dead-boy-body-armor',
      'rue-gladiator-full-environmental-body-armor',
      'rue-bushman-trooper-environmental-body-armor',
      'rue-urban-warrior-environmental-body-armor',
    ].includes(entry.id),
  'Choose two ancient weapons': ancientWeapon,
  'Choose an ancient weapon': ancientWeapon,
  'Choose an energy handgun': energySidearm,
  'Choose an energy pistol': energySidearm,
  'Choose an energy sidearm': energySidearm,
  'Choose a sidearm': energySidearm,
  'Choose an energy rifle': (entry) =>
    entry.category === 'Ranged Weapons' && /\brifle\b/i.test(entry.name),
  'Choose a modern handgun': energySidearm,
  'Choose a modern rifle': (entry) =>
    entry.category === 'Ranged Weapons' && /\brifle\b/i.test(entry.name),
  'Choose a non-energy weapon': (entry) =>
    entry.category === 'Melee Weapons' ||
    ['Projectile & Rail Gun', 'Missile, Rocket & Grenade Launchers'].includes(
      entry.subcategory,
    ),
  'Choose three additional weapons': (entry) =>
    ['Melee Weapons', 'Ranged Weapons'].includes(entry.category),
  'Choose one weapon for each W.P.': (entry) =>
    ['Melee Weapons', 'Ranged Weapons'].includes(entry.category),
  'Choose a Vibro-weapon': (entry) =>
    entry.subcategory === 'Vibro-Blades & Integrated Blades',
  'Choose transportation': (entry) =>
    ['rue-speedster-hovercycle', 'rue-highwayman-motorcycle'].includes(
      entry.id,
    ),
  'Choose a second open-market power armor': (entry) =>
    [
      'rue-northern-gun-ng-x9-samson-power-armor',
      'rue-titan-industries-ft-005-flying-titan-power-armor',
    ].includes(entry.id),
  'Choose an open-market giant robot': (entry) =>
    entry.category === 'Robots' && !/coalition/i.test(entry.name),
  'Choose four bionic weapons or tools': () => false,
  'Choose four bionic features or accessories': () => false,
}

function energySidearm(entry) {
  return (
    entry.category === 'Ranged Weapons' &&
    /pistol|blaster|sidearm/i.test(entry.name)
  )
}

function ancientWeapon(entry) {
  return ['Conventional Blades', 'Piercing & Anti-Vampire'].includes(
    entry.subcategory,
  )
}

function weaponMatchesProficiency(entry, proficiency) {
  const name = entry.name.toLocaleLowerCase()
  const family = entry.subcategory
  const matchers = {
    'wp-knife': () => /knife|bayonet/.test(name),
    'wp-sword': () => /sword|saber|machete/.test(name),
    'wp-blunt': () => /mace/.test(name),
    'wp-handguns': () => /pistol|blaster/.test(name),
    'wp-rifles': () => /rifle/.test(name),
    'wp-energy-pistol': () =>
      /pistol|blaster/.test(name) &&
      ['Laser', 'Ion', 'Plasma', 'Particle Beam'].includes(family),
    'wp-energy-rifle': () =>
      /rifle/.test(name) &&
      [
        'Laser',
        'Ion',
        'Plasma',
        'Particle Beam',
        'Hybrid / Multi-System',
      ].includes(family),
    'wp-heavy-military-weapons': () =>
      ['Projectile & Rail Gun', 'Missile, Rocket & Grenade Launchers'].includes(
        family,
      ),
    'wp-heavy-m-d-weapons': () =>
      ['Plasma', 'Particle Beam', 'Projectile & Rail Gun'].includes(family),
  }
  return matchers[proficiency]?.() ?? false
}

function customChoiceEntry(choice, expectedKind) {
  const kind =
    expectedKind ||
    (/features|accessories/i.test(choice.prompt) ? 'items' : 'weapons')
  const categories = {
    weapons: 'Weapons',
    armor: 'Armor',
    vehicles: 'Vehicles',
    items: 'Utility & Field Gear',
  }
  return {
    id: `custom-choice:${choice.prompt.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: 'Custom equipment choice',
    category: categories[kind],
    subcategory: 'Custom choice',
    source: 'Rifts Ultimate Edition',
    page: null,
    description:
      'Use this option when the audited Armory does not contain a legal named record for the class-granted choice.',
    statistics: [],
    options: [
      {
        id: 'customName',
        label: 'Equipment name',
        type: 'text',
        required: true,
        default: '',
      },
      { id: 'notes', label: 'Character notes', type: 'text', default: '' },
    ],
    metadata: {
      kind,
      customChoice: true,
      defaults: { description: '', statistics: [], source: '', page: null },
    },
  }
}

export function legalStartingEquipmentEntries(choice, expectedKind) {
  const rule = choiceRules[choice?.rulePrompt || choice?.prompt]
  let entries = rule
    ? characterEquipmentCatalog.filter(rule)
    : characterEquipmentCatalog.filter(
        (entry) => entry.metadata.kind === expectedKind,
      )
  if (
    expectedKind === 'vehicles' &&
    /commercial vehicle|car|motorcycle|hovercycle|vehicle matching/i.test(
      choice?.prompt,
    )
  )
    entries = entries.filter((entry) => entry.category === 'Vehicles')
  if (choice?.weaponProficiency)
    entries = entries.filter((entry) =>
      weaponMatchesProficiency(entry, choice.weaponProficiency),
    )
  return entries.length ? entries : [customChoiceEntry(choice, expectedKind)]
}

export function applyEquipmentCatalogSelection(selection, equipmentState, id) {
  return {
    equipment: {
      ...equipmentState,
      [selection.metadata.kind]: [
        ...equipmentState[selection.metadata.kind],
        {
          ...selection.metadata.defaults,
          id,
          name: selection.name,
          quantity: selection.values.quantity,
          notes: selection.values.notes,
          catalogSelectionId: selection.catalogId,
        },
      ],
    },
  }
}
