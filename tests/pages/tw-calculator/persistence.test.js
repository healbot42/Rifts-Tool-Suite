import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const component = readFileSync(
  new URL(
    '../../../src/pages/tw-calculator/components/TwCalculatorApp.vue',
    import.meta.url,
  ),
  'utf8',
)

describe('TW Calculator persistence integration', () => {
  it('uses the domain repository and exposes storage failures accessibly', () => {
    expect(component).toContain('repositories.twDevice.load()')
    expect(component).toContain('repositories.twDevice.save(state)')
    expect(component).not.toContain('localStorage.')
    expect(component).toMatch(/v-if="storageStatus"[\s\S]+role="alert"/)
  })
})
