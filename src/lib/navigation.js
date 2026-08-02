export const PAGE_IDS = Object.freeze([
  'tw-calculator',
  'tw-device-browser',
  'initiative-tracker',
  'character-sheet',
])

const pageIds = new Set(PAGE_IDS)

export function pageFromHash(hash = '') {
  const requestedPage = String(hash).replace(/^#/, '')
  return pageIds.has(requestedPage) ? requestedPage : 'tw-calculator'
}
