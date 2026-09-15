import { beforeEach, describe, expect, it, vi } from 'vitest'

import { beginAuthentication, loadSession, logout } from '../../src/lib/auth.js'

describe('shared authentication client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the immutable authenticated user from the session endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            user: {
              id: 'stable-user-id',
              email: 'owner@example.com',
              created_at: '2026-09-15T00:00:00Z',
              updated_at: '2026-09-15T00:00:00Z',
            },
          }),
        ),
      ),
    )
    await expect(loadSession()).resolves.toMatchObject({
      authenticated: true,
      user: { id: 'stable-user-id' },
    })
  })

  it('treats redirects or unavailable sessions as signed out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('CORS')))
    await expect(loadSession()).resolves.toEqual({
      authenticated: false,
      user: null,
    })
  })

  it('routes sign-in and logout through the protected Worker', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: {
        href: 'https://example.test/#initiative-tracker',
        origin: 'https://example.test',
        pathname: '/',
        assign,
      },
    })
    beginAuthentication()
    expect(assign.mock.calls[0][0]).toContain('/v1/watchlist/session?')
    expect(assign.mock.calls[0][0]).toContain('initiative-tracker')
    logout()
    expect(assign.mock.calls[1][0]).toContain('/v1/watchlist/logout?')
  })
})
