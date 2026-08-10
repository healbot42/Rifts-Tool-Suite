import { rangedWeapons } from './rangedWeapons.js'
import { tools } from './tools.js'

function statisticValue(entry, label) {
  return entry.statistics.find((statistic) => statistic.label === label)?.value
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

const weaponEntries = rangedWeapons.map((entry) => ({
  ...entry,
  facets: { kind: 'weapons' },
  options: quantityAndNotes,
  metadata: {
    kind: 'weapons',
    source: { book: entry.source, pages: String(entry.page) },
    defaults: {
      category: entry.subcategory,
      damage: statisticValue(entry, 'Mega-Damage'),
      range: statisticValue(entry, 'Effective Range'),
      rateOfFire: statisticValue(entry, 'Rate of Fire'),
      bonuses:
        statisticValue(entry, 'Bonus to Strike') ||
        statisticValue(entry, 'Laser Targeting Bonus') ||
        '',
      ammoMax: 0,
      description: entry.description,
      statistics: entry.statistics,
      source: entry.source,
      page: entry.page,
    },
  },
}))

const toolEntries = tools.map((entry) => ({
  ...entry,
  facets: { kind: 'items' },
  options: quantityAndNotes,
  metadata: {
    kind: 'items',
    source: { book: entry.source, pages: String(entry.page) },
    defaults: {
      weight: statisticValue(entry, 'Weight') || '',
      value: statisticValue(entry, 'Black Market Cost') || '',
      description: entry.description,
      statistics: entry.statistics,
      source: entry.source,
      page: entry.page,
      subcategory: entry.subcategory,
    },
  },
}))

export const characterEquipmentCatalog = [...weaponEntries, ...toolEntries]

export function applyEquipmentCatalogSelection(
  selection,
  equipmentState,
  ownedAssets,
  _assetFactory,
  id,
) {
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
    ownedAssets,
  }
}
