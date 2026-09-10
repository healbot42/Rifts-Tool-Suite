import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  challengeResponse,
  handleRequest,
  parseSignatureHeader,
} from '../../cloudflare/ebay-account-deletion/worker.js'

const endpoint = 'https://rifts-ebay-notifications.zhawkins42.workers.dev/'

afterEach(() => vi.unstubAllGlobals())

describe('eBay account-deletion Worker', () => {
  it('generates the endpoint challenge required by eBay', async () => {
    expect(await challengeResponse('challenge', 'verification-token')).toBe(
      '4a0d1287d3457ff957691cf464dd39bd772065e2017835aba8021f33d368bd16',
    )
  })

  it('returns the challenge as JSON without exposing the token', async () => {
    const response = await handleRequest(
      new Request(`${endpoint}?challenge_code=challenge`),
      { EBAY_VERIFICATION_TOKEN: 'verification-token' },
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      challengeResponse:
        '4a0d1287d3457ff957691cf464dd39bd772065e2017835aba8021f33d368bd16',
    })
  })

  it('rejects unsigned deletion notifications', async () => {
    const response = await handleRequest(
      new Request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          metadata: { topic: 'MARKETPLACE_ACCOUNT_DELETION' },
          notification: { notificationId: 'example', data: {} },
        }),
      }),
      {},
    )
    expect(response.status).toBe(400)
  })

  it('strictly parses eBay signature metadata', () => {
    const valid = btoa(
      JSON.stringify({
        alg: 'ecdsa',
        kid: '9936261a-7d7b-4621-a0f1-96ccb428af49',
        signature: 'MEUCIQexample',
        digest: 'SHA256',
      }),
    )
    expect(parseSignatureHeader(valid).digest).toBe('SHA256')
    expect(() =>
      parseSignatureHeader(
        btoa(
          JSON.stringify({
            alg: 'rsa',
            kid: '../../wrong-host',
            signature: 'example',
            digest: 'MD5',
          }),
        ),
      ),
    ).toThrow('Unsupported eBay signature header')
  })

  it("verifies eBay's official signed notification fixture", async () => {
    const message = {
      metadata: {
        topic: 'MARKETPLACE_ACCOUNT_DELETION',
        schemaVersion: '1.0',
        deprecated: false,
      },
      notification: {
        notificationId:
          '49feeaeb-4982-42d9-a377-9645b8479411_33f7e043-fed8-442b-9d44-791923bd9a6d',
        eventDate: '2021-03-19T20:43:59.462Z',
        publishDate: '2021-03-19T20:43:59.679Z',
        publishAttemptCount: 1,
        data: {
          username: 'test_user',
          userId: 'ma8vp1jySJC',
          eiasToken: 'nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6wJnY+gAZGEpwmdj6x9nY+seQ==',
        },
      },
    }
    const signature =
      'eyJhbGciOiJlY2RzYSIsImtpZCI6Ijk5MzYyNjFhLTdkN2ItNDYyMS1hMGYxLTk2Y2NiNDI4YWY0OSIsInNpZ25hdHVyZSI6Ik1FWUNJUUNmeGZJV3V4bVdjSUJRSjljNS9YN2lHREpxczJSQ0dzQkVhQWppbnlycmZBSWhBSVY2d0djVGlCdVY1S0pVaWYyaG9reXJMK1E5c3NIa2FkK214Mm5FRTI1dyIsImRpZ2VzdCI6IlNIQTEifQ=='
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ access_token: 'short-lived-test-token' }),
      )
      .mockResolvedValueOnce(
        Response.json({
          key: '-----BEGIN PUBLIC KEY-----MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEZhhxXKtR+TOvtDbgTPCkSof02qgBB7IsYOyf76ilExJ/upAa/vKIKheOoCyOpcLmi4t0b4uepb7LLjmMr90FUg==-----END PUBLIC KEY-----',
          algorithm: 'ECDSA',
          digest: 'SHA1',
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const response = await handleRequest(
      new Request(endpoint, {
        method: 'POST',
        headers: { 'x-ebay-signature': signature },
        body: JSON.stringify(message),
      }),
      { EBAY_CLIENT_ID: 'id', EBAY_CLIENT_SECRET: 'secret' },
    )

    expect(response.status).toBe(204)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
