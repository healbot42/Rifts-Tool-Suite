import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(
  new URL(
    '../../../src/pages/character-sheet/components/CharacterSheetApp.vue',
    import.meta.url,
  ),
  'utf8',
)

describe('Character Sheet attribute generation UI', () => {
  it('keeps generated values editable and exposes their roll history', () => {
    expect(component).toContain('@click="rollAllAttributes"')
    expect(component).toContain('v-model.number="state.attributes[key]"')
    expect(component).toContain(
      'state.attributeGeneration.base.rolls[key].baseDice',
    )
    expect(component).toContain('exceptionalDice')
  })

  it('handles legal low-attribute choices and class bonus rolls', () => {
    expect(component).toContain('lowBonusTargets(assignment)')
    expect(component).toContain('@click="applyLowAttributeBonus(assignment)"')
    expect(component).toContain('@click="rollClassAttributeBonuses"')
    expect(component).toContain('operation.priorValue')
  })

  it('marks unmet requirements and reports unavailable RCC strategies', () => {
    expect(component).toContain("'attribute-requirement-unmet'")
    expect(component).toContain(':aria-invalid=')
    expect(component).toContain('attributeRollError')
    expect(component).toContain('activeOcc.value?.generationStrategy')
  })
})
