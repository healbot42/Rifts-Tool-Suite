import { describe, expect, it, vi } from 'vitest'
import { createRuntimeId } from '../../../src/pages/tw-calculator/lib/runtimeId.js'

describe('runtime IDs', () => {
  it('uses the native UUID generator when available', () => {
    const randomUUID = vi.fn(() => 'native-id')
    expect(createRuntimeId({ randomUUID })).toBe('native-id')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('creates a UUID when randomUUID is unavailable on older browsers', () => {
    const getRandomValues = vi.fn(bytes => bytes.fill(0))
    expect(createRuntimeId({ getRandomValues })).toBe('00000000-0000-4000-8000-000000000000')
    expect(getRandomValues).toHaveBeenCalledOnce()
  })

  it('falls back without a Web Crypto implementation', () => {
    expect(createRuntimeId(null)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
