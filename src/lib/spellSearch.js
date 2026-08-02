const normalized = value => String(value || '').toLowerCase().trim()

export function createSpellSearchIndex(spells) {
  return spells.map(spell => ({ spell, searchName: normalized(spell.name) }))
}

export function findMatchingSpells(searchIndex, queryValue, limit = 50) {
  const query = normalized(queryValue)
  if (!query) return searchIndex.slice(0, Math.min(30, limit)).map(item => item.spell)
  const terms = query.split(/\s+/).filter(Boolean)
  return searchIndex
    .filter(item => item.searchName.includes(query) || terms.every(term => item.searchName.includes(term)))
    .map(item => {
      const wordStart = item.searchName.split(/[^a-z0-9]+/).some(word => word.startsWith(query))
      const rank = item.searchName === query ? 0
        : item.searchName.startsWith(query) ? 1
          : wordStart ? 2
            : item.searchName.includes(query) ? 3 : 4
      return { ...item, rank }
    })
    .sort((a, b) => a.rank - b.rank || a.searchName.localeCompare(b.searchName))
    .slice(0, limit)
    .map(item => item.spell)
}
