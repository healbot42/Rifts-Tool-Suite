import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(
  new URL(
    '../../../src/pages/character-sheet/components/CharacterSheetApp.vue',
    import.meta.url,
  ),
  'utf8',
)

describe('Character Sheet persistence integration', () => {
  it('uses the domain repository and exposes storage failures accessibly', () => {
    expect(component).toContain('repositories.character.load()')
    expect(component).toContain('repositories.character.save(value)')
    expect(component).not.toContain('localStorage.')
    expect(component).toMatch(/v-if="storageStatus"[\s\S]+role="alert"/)
  })
})
