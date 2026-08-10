import { describe, expect, it } from 'vitest'
import packageMetadata from '../../package.json'
import {
  APP_NAME,
  APP_RELEASE_LABEL,
  APP_VERSION,
} from '../../src/lib/release.js'

describe('release metadata', () => {
  it('builds the visible release label from package metadata', () => {
    expect(APP_NAME).toBe('Rifts Tool Suite')
    expect(APP_VERSION).toBe(packageMetadata.version)
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    expect(APP_RELEASE_LABEL).toBe(
      `Rifts Tool Suite v${packageMetadata.version}`,
    )
  })
})
