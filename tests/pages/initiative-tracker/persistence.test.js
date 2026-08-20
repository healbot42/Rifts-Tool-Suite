import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(
  new URL(
    '../../../src/pages/initiative-tracker/components/InitiativeTrackerApp.vue',
    import.meta.url,
  ),
  'utf8',
)

describe('Initiative Tracker persistence integration', () => {
  it('uses domain repositories and exposes storage failures accessibly', () => {
    expect(component).toContain('repositories.initiativeEncounter.load()')
    expect(component).toContain('repositories.initiativePresets.load()')
    expect(component).toContain('repositories.character.importSaved()')
    expect(component).not.toContain('localStorage.')
    expect(component).toMatch(/v-if="storageStatus"[\s\S]+role="alert"/)
  })
})
