import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(
  new URL(
    '../../../src/pages/character-sheet/components/CharacterSheetApp.vue',
    import.meta.url,
  ),
  'utf8',
)

describe('Character Sheet O.C.C. language choices', () => {
  it('creates separate spoken-language and literacy choices from class counts', () => {
    expect(component).toContain('occOtherLanguageCount(occ)')
    expect(component).toContain('occLiteracyCount(occ)')
    expect(component).toContain('state.classChoices.otherLanguages')
    expect(component).toContain('state.classChoices.literacyLanguages')
    expect(component).toContain("'literacy'")
  })

  it('migrates the legacy single other-language choice without losing it', () => {
    expect(component).toContain(
      'const legacyOther = state.classChoices.otherLanguage',
    )
    expect(component).toContain('normalizeOccLanguageChoices()')
    expect(component).toContain('delete state.classChoices.otherLanguage')
  })
})
