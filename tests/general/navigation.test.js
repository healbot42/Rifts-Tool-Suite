import { describe, expect, it } from 'vitest'
import { PAGE_IDS, pageFromHash } from '../../src/lib/navigation.js'

describe('suite page navigation', () => {
  it.each(PAGE_IDS)('selects the %s feature from its URL hash', (page) => {
    expect(pageFromHash(`#${page}`)).toBe(page)
  })

  it.each(['', '#', '#unknown-tool', null, undefined])(
    'falls back to the TW Calculator for %s',
    (hash) => {
      expect(pageFromHash(hash)).toBe('tw-calculator')
    },
  )
})
