import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(
  new URL(
    '../../../src/pages/character-sheet/components/CharacterSheetApp.vue',
    import.meta.url,
  ),
  'utf8',
)
const styles = readFileSync(
  new URL(
    '../../../src/pages/character-sheet/character-sheet.css',
    import.meta.url,
  ),
  'utf8',
)

describe('Character Sheet weapon roster', () => {
  it('uses the compact Rifts columns in both edit and play views', () => {
    expect(component.match(/class="weapon-roster-heading"/g)).toHaveLength(2)
    expect(component.match(/class="weapon-roster-row"/g)).toHaveLength(2)
    expect(component).toContain('<span>Damage</span>')
    expect(component).toContain('<span>Range</span>')
    expect(component).toContain('<span>Ammunition</span>')
  })

  it('omits the unused equipped flag while retaining Armory details', () => {
    expect(component).not.toContain('item.equipped')
    expect(component).not.toContain('<span>Eqp</span>')
    expect(styles).not.toContain('.weapon-equipped-toggle')
    expect(component).toContain('<CatalogEntryDetails')
  })

  it('collapses the roster into labeled fields on narrow screens', () => {
    expect(styles).toContain('@media (max-width: 650px)')
    expect(styles).toContain('.weapon-roster-row > [data-label]::before')
    expect(styles).toContain("content: attr(data-label) ': ';")
  })

  it('starts equipment details collapsed and uses three wide-screen columns', () => {
    expect(component).not.toContain(':open="section.id !== \'weapons\'"')
    expect(component.match(/class="equipment-simple-summary"/g)).toHaveLength(2)
    expect(styles).toContain('@media (min-width: 1400px)')
    expect(styles).toContain(
      'grid-template-columns: repeat(3, minmax(0, 1fr));',
    )
    expect(styles).toContain(
      '.equipment-editor > .equipment-section:first-of-type',
    )
  })

  it('organizes the wide Play sheet into three explicit content columns', () => {
    expect(component).toContain('class="play-column play-column-left"')
    expect(component).toContain('class="play-column play-column-middle"')
    expect(component).toContain('class="play-column play-column-right"')
    expect(component.indexOf('class="panel play-combat"')).toBeLessThan(
      component.indexOf('class="panel play-equipment"'),
    )
    expect(
      component.indexOf('class="panel spellbook play-spellbook"'),
    ).toBeLessThan(component.indexOf('<h2>Class abilities</h2>'))
    expect(styles).toContain(
      '.play-sheet {\n    grid-template-columns: repeat(3, minmax(0, 1fr));',
    )
  })

  it('does not render unresolved starting choices as owned equipment', () => {
    expect(component).toContain("Boolean(String(item.name || '').trim())")
    expect(component).toContain('else delete state.play.equipment[item.id]')
  })
})
