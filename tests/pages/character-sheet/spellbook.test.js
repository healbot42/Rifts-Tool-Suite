import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  groupInvocationsByLevel,
  invocations,
  invocationsById,
} from '../../../src/data/magic/invocations.js'

const characterSheet = readFileSync(
  new URL(
    '../../../src/pages/character-sheet/components/CharacterSheetApp.vue',
    import.meta.url,
  ),
  'utf8',
)
const picker = readFileSync(
  new URL(
    '../../../src/pages/character-sheet/components/SpellPickerModal.vue',
    import.meta.url,
  ),
  'utf8',
)

describe('Character Sheet spellbook', () => {
  it('provides all invocations with stable IDs and full rules', () => {
    expect(invocations).toHaveLength(297)
    expect(Object.keys(invocationsById)).toHaveLength(invocations.length)
    for (const spell of invocations) {
      expect(spell.id).toMatch(/^level-\d{2}-/)
      expect(spell.level).toBeGreaterThanOrEqual(1)
      expect(spell.level).toBeLessThanOrEqual(15)
      expect(spell.ppe).toBeGreaterThanOrEqual(0)
      expect(spell.cost).toBeTruthy()
      expect(spell.description.length).toBeGreaterThan(40)
      expect(spell.source.book).toBe('Rifts Book of Magic')
    }
  })

  it('sorts by level and alphabetically within each level', () => {
    const groups = groupInvocationsByLevel([...invocations].reverse())
    expect(groups.map((group) => group.level)).toEqual(
      [...groups].map((group) => group.level).sort((a, b) => a - b),
    )
    for (const group of groups)
      expect(group.entries.map((spell) => spell.name)).toEqual(
        group.entries
          .map((spell) => spell.name)
          .sort((a, b) => a.localeCompare(b)),
      )
  })

  it('keeps mutation in Edit while Play is a detail-only view', () => {
    expect(characterSheet).toContain("['magic', 'Magic']")
    expect(characterSheet).toContain('@click="spellPickerOpen = true"')
    expect(characterSheet).toContain('@click="removeKnownSpell(spell.id)"')
    expect(characterSheet).toContain('class="panel spellbook play-spellbook"')
    expect(characterSheet).toContain('@click="openSpellDetail(spell)"')
    expect(characterSheet).toContain(':known-ids="state.spells"')
  })

  it('supports searching, level filtering, duplicate prevention, and details', () => {
    expect(picker).toContain('.includes(search.value.toLocaleLowerCase())')
    expect(picker).toContain('spell.level === Number(level.value)')
    expect(picker).toContain('known.has(selected.id)')
    expect(picker).toContain('<SpellDetails')
  })
})
