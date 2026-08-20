import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('Shared interface patterns', () => {
  it('uses a responsive master-detail sheet for catalog selection', () => {
    const picker = read('../../src/components/CatalogPickerModal.vue')
    expect(picker).toContain('place-items: stretch end')
    expect(picker).toContain('place-items: end stretch')
    expect(picker).toContain("document.body.style.overflow = 'hidden'")
    expect(picker).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('presents repeated catalog statistics as divided data rows', () => {
    const details = read('../../src/components/CatalogEntryDetails.vue')
    expect(details).toMatch(/\.catalog-statistics-grid[\s\S]+gap: 1px/)
    expect(details).toMatch(/\.catalog-statistic-card[\s\S]+background:/)
  })

  it('keeps character context visible without making mobile content sticky', () => {
    const styles = read('../../src/pages/character-sheet/character-sheet.css')
    expect(styles).toMatch(/\.play-live-status[\s\S]+position: sticky/)
    expect(styles).toMatch(
      /@media \(max-width: 850px\)[\s\S]+\.play-live-status[\s\S]+position: static/,
    )
  })

  it('uses compact divided rows for repeated calculator information', () => {
    const styles = read('../../src/pages/tw-calculator/tw-calculator.css')
    expect(styles).toMatch(/\.spell-list[\s\S]+gap: 1px/)
    expect(styles).toMatch(/\.results-sidebar-inner[\s\S]+gap: 1px/)
    expect(styles).toMatch(/\.stat:not\(\.skill-stat\)[\s\S]+box-shadow/)
  })

  it('uses a divided live-order list while retaining combatant work cards', () => {
    const tracker = read(
      '../../src/pages/initiative-tracker/components/InitiativeTrackerApp.vue',
    )
    expect(tracker).toMatch(/\.turn-queue[\s\S]+gap: 1px/)
    expect(tracker).toMatch(/\.queue-entry[\s\S]+border-radius: 0/)
    expect(tracker).toContain('.combatant-card')
  })

  it('uses a consistent segmented suite navigation treatment', () => {
    const styles = read('../../src/style.css')
    expect(styles).toMatch(/\.app-page-link[\s\S]+border-radius: 8px/)
    expect(styles).toContain('@media (prefers-reduced-motion: no-preference)')
  })
})
