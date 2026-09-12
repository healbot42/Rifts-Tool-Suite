const DEFAULT_EXCLUSIONS = [
  'upgrade',
  'weapons',
  'weapon set',
  'transfer',
  'shoulder pads',
  'heads',
  'dice',
  'cards',
  'tokens',
]

export const CATALOG_FACTION_GROUPS = [
  {
    label: 'Space Marines',
    options: [
      {
        value: 'space-marines',
        label: 'All Space Marines',
        factions: ['Space Marines'],
      },
      {
        value: 'black-templars',
        label: 'Black Templars',
        terms: ['black templar'],
      },
      { value: 'blood-angels', label: 'Blood Angels', terms: ['blood angel'] },
      { value: 'dark-angels', label: 'Dark Angels', terms: ['dark angel'] },
      { value: 'deathwatch', label: 'Deathwatch', terms: ['deathwatch'] },
      { value: 'grey-knights', label: 'Grey Knights', terms: ['grey knight'] },
      {
        value: 'imperial-fists',
        label: 'Imperial Fists',
        terms: ['imperial fist'],
      },
      { value: 'iron-hands', label: 'Iron Hands', terms: ['iron hand'] },
      { value: 'raven-guard', label: 'Raven Guard', terms: ['raven guard'] },
      { value: 'salamanders', label: 'Salamanders', terms: ['salamander'] },
      {
        value: 'space-wolves',
        label: 'Space Wolves',
        terms: ['space wolves', 'space wolf'],
      },
      { value: 'ultramarines', label: 'Ultramarines', terms: ['ultramarine'] },
      { value: 'white-scars', label: 'White Scars', terms: ['white scar'] },
    ],
  },
  {
    label: 'Armies of the Imperium',
    options: [
      {
        value: 'imperium',
        label: 'All Armies of the Imperium',
        factions: ['Armies of the Imperium'],
      },
      {
        value: 'adepta-sororitas',
        label: 'Adepta Sororitas',
        terms: ['sororitas', 'battle sister', 'sisters of battle'],
      },
      {
        value: 'adeptus-custodes',
        label: 'Adeptus Custodes',
        terms: ['custodes', 'custodian', 'sisters of silence'],
      },
      {
        value: 'adeptus-mechanicus',
        label: 'Adeptus Mechanicus',
        terms: ['mechanicus', 'skitarii'],
      },
      {
        value: 'astra-militarum',
        label: 'Astra Militarum',
        terms: [
          'astra militarum',
          'cadian',
          'catachan',
          'death korps of krieg',
        ],
      },
      {
        value: 'agents-of-the-imperium',
        label: 'Agents of the Imperium',
        terms: [
          'agents of the imperium',
          'imperial agents',
          'inquisitor',
          'assassinorum',
          'rogue trader',
        ],
      },
      {
        value: 'imperial-knights',
        label: 'Imperial Knights',
        terms: ['imperial knight', 'knight questoris', 'knight dominus'],
      },
    ],
  },
  {
    label: 'Armies of Chaos',
    options: [
      {
        value: 'chaos',
        label: 'All Armies of Chaos',
        factions: ['Armies of Chaos', 'Chaos', 'Grand Alliance Chaos'],
      },
      {
        value: 'chaos-daemons',
        label: 'Chaos Daemons',
        terms: ['chaos daemon', 'daemons of chaos', 'daemons of'],
      },
      {
        value: 'chaos-knights',
        label: 'Chaos Knights',
        terms: ['chaos knight'],
      },
      {
        value: 'chaos-space-marines',
        label: 'Chaos Space Marines',
        terms: ['chaos space marine'],
      },
      { value: 'death-guard', label: 'Death Guard', terms: ['death guard'] },
      {
        value: 'emperors-children',
        label: "Emperor's Children",
        terms: ["emperor's children", 'emperors children'],
      },
      {
        value: 'iron-warriors',
        label: 'Iron Warriors',
        terms: ['iron warrior'],
      },
      { value: 'red-corsairs', label: 'Red Corsairs', terms: ['red corsair'] },
      {
        value: 'thousand-sons',
        label: 'Thousand Sons',
        terms: ['thousand sons'],
      },
      { value: 'world-eaters', label: 'World Eaters', terms: ['world eater'] },
    ],
  },
  {
    label: 'Xenos Armies',
    options: [
      {
        value: 'xenos',
        label: 'All Xenos Armies',
        factions: [
          'Aeldari',
          'Drukhari',
          'Genestealer Cults',
          'Leagues of Votann',
          'Necrons',
          'Orks',
          "T'au Empire",
          'Tyranids',
        ],
      },
      { value: 'aeldari', label: 'Aeldari', factions: ['Aeldari'] },
      { value: 'drukhari', label: 'Drukhari', factions: ['Drukhari'] },
      {
        value: 'genestealer-cults',
        label: 'Genestealer Cults',
        factions: ['Genestealer Cults'],
      },
      {
        value: 'leagues-of-votann',
        label: 'Leagues of Votann',
        factions: ['Leagues of Votann'],
      },
      { value: 'necrons', label: 'Necrons', factions: ['Necrons'] },
      { value: 'orks', label: 'Orks', factions: ['Orks'] },
      { value: 'tau-empire', label: "T'au Empire", factions: ["T'au Empire"] },
      { value: 'tyranids', label: 'Tyranids', factions: ['Tyranids'] },
    ],
  },
]

const FACTION_OPTIONS = CATALOG_FACTION_GROUPS.flatMap((group) => group.options)

function productMatchesFaction(product, selectedFaction) {
  if (selectedFaction === 'All') return true
  const option = FACTION_OPTIONS.find(({ value }) => value === selectedFaction)
  if (!option) return false
  if (option.factions?.includes(product.faction)) return true
  const searchable = `${product.name} ${product.url || ''}`
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
  return option.terms?.some((term) => searchable.includes(term)) ?? false
}

export function catalogProductVisible(product, options) {
  const query = options.query.trim().toLocaleLowerCase()
  const searchable =
    `${product.name} ${product.faction} ${product.system}`.toLocaleLowerCase()
  if (query && !searchable.includes(query)) return false
  if (options.system !== 'All' && product.system !== options.system)
    return false
  if (!productMatchesFaction(product, options.faction ?? 'All')) return false
  if (!options.includeResin && product.suspected_resin) return false
  if (!options.includeCharacters && product.suspected_single) return false
  if (!options.includeAccessories) {
    const name = product.name.toLocaleLowerCase()
    if (DEFAULT_EXCLUSIONS.some((term) => name.includes(term))) return false
  }
  return true
}

export function watchlistDraft(product) {
  const isDrukhariReavers =
    product.id === 'reavers' && product.faction === 'Drukhari'
  // The editor uses commas as list separators, so punctuation commas cannot
  // remain inside a generated query. Marketplace search treats them as spaces.
  const searchableName = product.name.replaceAll(',', '')
  const contextualQueries = [
    searchableName,
    product.faction && !['General', 'Uncategorized'].includes(product.faction)
      ? `${searchableName} ${product.faction}`
      : '',
    product.system ? `${searchableName} ${product.system}` : '',
  ].filter((query, index, queries) => query && queries.indexOf(query) === index)
  return {
    id: product.id,
    name: product.name,
    msrp: product.msrp ?? '',
    // Keep the bare-name query first for recall. Contextual queries improve
    // marketplace relevance without making faction wording a match requirement.
    queries: isDrukhariReavers
      ? [...contextualQueries, 'Dark Eldar Reavers'].join(', ')
      : contextualQueries.join(', '),
    aliases: isDrukhariReavers ? 'Drukhari Reavers, Dark Eldar Reavers' : '',
    expected_models: '',
    minimum_models: '',
    required_terms: '',
    excluded_terms: isDrukhariReavers
      ? 'Blood Bowl, Reikland Reavers, Warmachine, Doom Reavers'
      : '',
  }
}
