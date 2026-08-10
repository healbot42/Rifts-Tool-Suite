export function catalogSearch(
  entries,
  query,
  fields = ['name', 'description'],
) {
  const needle = String(query || '')
    .trim()
    .toLowerCase()
  if (!needle) return entries
  return entries.filter((entry) =>
    fields.some((field) =>
      String(entry[field] || '')
        .toLowerCase()
        .includes(needle),
    ),
  )
}

export function catalogFilter(entries, filters = {}) {
  return entries.filter((entry) =>
    Object.entries(filters).every(
      ([key, value]) =>
        !value ||
        (Array.isArray(value) ? value : [value]).includes(entry.facets?.[key]),
    ),
  )
}

export function catalogCounts(entries) {
  const counts = {}
  for (const entry of entries) {
    counts[entry.category] = (counts[entry.category] || 0) + 1
    const key = `${entry.category}:${entry.subcategory || ''}`
    counts[key] = (counts[key] || 0) + 1
    const allCategoriesKey = `:${entry.subcategory || ''}`
    counts[allCategoriesKey] = (counts[allCategoriesKey] || 0) + 1
  }
  return counts
}

export function defaultCatalogOptions(entry) {
  return Object.fromEntries(
    (entry?.options || []).map((option) => [
      option.id,
      option.multiple
        ? [...(option.default || [])]
        : (option.default ??
          (option.type === 'boolean'
            ? false
            : option.type === 'number'
              ? 1
              : '')),
    ]),
  )
}

export function validateCatalogOptions(entry, values) {
  return (entry?.options || [])
    .filter(
      (option) =>
        option.required &&
        (option.multiple
          ? !values?.[option.id]?.length
          : values?.[option.id] === '' || values?.[option.id] == null),
    )
    .map((option) => option.id)
}

export function normalizeCatalogSelection(entry, values = {}) {
  return {
    catalogId: entry.id,
    category: entry.category,
    subcategory: entry.subcategory || '',
    name: entry.name,
    values: Object.fromEntries(
      (entry.options || []).map((option) => [
        option.id,
        option.type === 'number'
          ? Number(values[option.id])
          : option.type === 'boolean'
            ? Boolean(values[option.id])
            : option.multiple
              ? [...(values[option.id] || [])]
              : String(values[option.id] ?? ''),
      ]),
    ),
    metadata: { ...(entry.metadata || {}) },
  }
}
