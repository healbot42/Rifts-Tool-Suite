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

export function catalogProductVisible(product, options) {
  const query = options.query.trim().toLocaleLowerCase()
  const searchable =
    `${product.name} ${product.faction} ${product.system}`.toLocaleLowerCase()
  if (query && !searchable.includes(query)) return false
  if (options.system !== 'All' && product.system !== options.system)
    return false
  if (!options.includeResin && product.suspected_resin) return false
  if (!options.includeCharacters && product.suspected_single) return false
  if (!options.includeAccessories) {
    const name = product.name.toLocaleLowerCase()
    if (DEFAULT_EXCLUSIONS.some((term) => name.includes(term))) return false
  }
  return true
}

export function watchlistDraft(product) {
  return {
    id: product.id,
    name: product.name,
    msrp: product.msrp ?? '',
    queries: product.name,
    aliases: '',
    expected_models: '',
    minimum_models: '',
    required_terms: '',
    excluded_terms: '',
  }
}
