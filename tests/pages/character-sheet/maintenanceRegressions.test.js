import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(
  new URL(
    '../../../src/pages/character-sheet/components/CharacterSheetApp.vue',
    import.meta.url,
  ),
  'utf8',
)

describe('Character Sheet maintenance regressions', () => {
  it('removes superseded class and specialization equipment at transitions', () => {
    expect(component).toContain(
      'state.equipment = removeSupersededStartingEquipment(state.equipment)',
    )
    expect(component).toContain(
      'state.equipment = removeSupersededStartingEquipment(state.equipment, [',
    )
    expect(component).toContain("state.identity.occupation = ''")
  })

  it('keeps Play mode safe without an active class', () => {
    expect(component).not.toContain('v-if="activeOcc.saveBonuses.disease"')
    expect(component).not.toContain(
      'v-if="activeOcc.situationalBonuses.length"',
    )
    expect(component).toContain('v-if="activeOcc?.saveBonuses.disease"')
    expect(component).toContain('v-if="activeOcc?.situationalBonuses.length"')
    expect(component).toContain("mode.value = 'edit'")
    expect(component).toContain("editTab.value = 'identity'")
  })

  it('prepares and validates imports before replacing live state', () => {
    const prepare = component.indexOf(
      'const imported = prepareCharacterImport(JSON.parse(reader.result))',
    )
    const assign = component.indexOf('Object.assign(state, imported)')
    expect(prepare).toBeGreaterThan(-1)
    expect(assign).toBeGreaterThan(prepare)
    expect(component).toContain(
      "importRecord(imported.classChoices, 'class choices')",
    )
    expect(component).toContain(
      'importArray(equipmentState[kind], `${kind} equipment`)',
    )
  })

  it('gives repeated Play-mode languages unique render keys', () => {
    expect(component).toContain(':key="`spoken-${record.type}-${index}`"')
    expect(component).toContain(':key="`literacy-${record.type}-${index}`"')
  })
})
