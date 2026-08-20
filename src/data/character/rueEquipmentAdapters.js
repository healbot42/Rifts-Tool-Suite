import rueCatalog from '../items/rifts-ultimate-edition.json'

const legacyEquipment = [
  ['rue-wilks-320-laser-pistol', 'wilks-320-laser-pistol', 'Energy Pistols'],
  ['rue-wilks-447-laser-rifle', 'wilks-447-laser-rifle', 'Energy Rifles'],
  ['rue-ng-57-heavy-duty-ion-blaster', 'ng-57-ion-blaster', 'Energy Pistols'],
  [
    'rue-ng-super-laser-pistol-and-grenade-launcher',
    'ng-super-laser-pistol-grenade-launcher',
    'Combination Weapons',
  ],
  ['rue-ng-33-laser-pistol', 'ng-33-laser-pistol', 'Energy Pistols'],
  ['rue-ng-l5-laser-rifle', 'ng-l5-laser-rifle', 'Energy Rifles'],
  [
    'rue-ng-p7-particle-beam-rifle',
    'ng-p7-particle-beam-rifle',
    'Energy Rifles',
  ],
  [
    'rue-ng-juicer-assault-rifle-ja-11',
    'ja-11-juicer-assassins-energy-rifle',
    'Combination Weapons',
  ],
  [
    'rue-ng-juicer-variable-laser-rifle-ja-12',
    'ja-9-juicer-assassin-variable-laser-rifle',
    'Energy Rifles',
  ],
  ['rue-ng-101-rail-gun', 'ng-101-rail-gun', 'Rail Guns'],
  ['rue-ng-202-rail-gun', 'ng-202-rail-gun', 'Rail Guns'],
  [
    'rue-wilks-portable-laser-torch',
    'wilks-portable-laser-torch',
    "Wilk's Cutting and Surgical Tools",
  ],
  [
    'rue-wilks-laser-wand',
    'wilks-laser-wand',
    "Wilk's Cutting and Surgical Tools",
  ],
  [
    'rue-wilks-laser-scalpel',
    'wilks-laser-scalpel',
    "Wilk's Cutting and Surgical Tools",
  ],
]

const itemsById = new Map(rueCatalog.items.map((item) => [item.id, item]))

function adapt([armoryId, legacyId, legacySubcategory]) {
  const item = itemsById.get(armoryId)
  if (!item) throw new Error(`Missing canonical Armory item: ${armoryId}`)
  const isTool =
    armoryId.startsWith('rue-wilks-') && /torch|wand|scalpel/.test(armoryId)
  return {
    ...item,
    id: legacyId,
    category: isTool ? 'Tools' : 'Weapons',
    subcategory: legacySubcategory,
    compatibility: { armoryId },
  }
}

const adapted = legacyEquipment.map(adapt)

// The RUE Armory's audited 203-form taxonomy does not include this source
// entry. Keep its established character-picker record here until a reviewed
// Armory expansion can add it without changing the current audited inventory.
const l20PulseRifle = {
  id: 'l-20-pulse-rifle',
  name: 'L-20 Pulse Rifle',
  category: 'Weapons',
  subcategory: 'Energy Rifles',
  description:
    'A common, lightweight frontier laser rifle capable of single shots or three-shot pulse bursts.',
  source: 'Rifts Ultimate Edition',
  page: 270,
  statistics: [
    { label: 'Weight', value: '7 lbs (3 kg)' },
    {
      label: 'Mega-Damage',
      value: '2D6 M.D. single shot or 6D6 M.D. three-shot pulse burst',
    },
    { label: 'Rate of Fire', value: 'Each blast counts as one melee attack.' },
    { label: 'Effective Range', value: '1,600 feet (488 m)' },
    {
      label: 'Payload',
      value: '40 shots per short E-Clip or 50 per Long E-Clip',
    },
    { label: 'Black Market Cost', value: '25,000 credits' },
  ],
}

export const rangedWeapons = [
  ...adapted.filter(({ category }) => category === 'Weapons').slice(0, 7),
  l20PulseRifle,
  ...adapted.filter(({ category }) => category === 'Weapons').slice(7),
]

export const tools = adapted.filter(({ category }) => category === 'Tools')
