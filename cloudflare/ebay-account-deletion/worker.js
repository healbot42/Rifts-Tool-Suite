const ENDPOINT = 'https://rifts-ebay-notifications.zhawkins42.workers.dev/'
const TOKEN_ENDPOINT = 'https://api.ebay.com/identity/v1/oauth2/token'
const PUBLIC_KEY_ENDPOINT =
  'https://api.ebay.com/commerce/notification/v1/public_key/'
const MAX_NOTIFICATION_BYTES = 64 * 1024
const KEY_CACHE_MS = 60 * 60 * 1000
const keyCache = new Map()

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function decodeBase64(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function encodeBasicCredential(clientId, clientSecret) {
  const bytes = new TextEncoder().encode(`${clientId}:${clientSecret}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function pemToDer(pem) {
  const base64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '')
  return decodeBase64(base64)
}

function readDerLength(bytes, offset) {
  const first = bytes[offset]
  if (first < 0x80) return { length: first, next: offset + 1 }
  const count = first & 0x7f
  if (count === 0 || count > 2 || offset + count >= bytes.length) {
    throw new Error('Invalid DER length')
  }
  let length = 0
  for (let index = 0; index < count; index += 1) {
    length = (length << 8) | bytes[offset + 1 + index]
  }
  return { length, next: offset + 1 + count }
}

function derEcdsaToRaw(signature, coordinateSize = 32) {
  let offset = 0
  if (signature[offset++] !== 0x30) throw new Error('Invalid ECDSA signature')
  const sequence = readDerLength(signature, offset)
  offset = sequence.next
  if (offset + sequence.length !== signature.length) {
    throw new Error('Invalid ECDSA signature length')
  }

  const coordinates = []
  for (let coordinate = 0; coordinate < 2; coordinate += 1) {
    if (signature[offset++] !== 0x02)
      throw new Error('Invalid ECDSA coordinate')
    const encoded = readDerLength(signature, offset)
    offset = encoded.next
    let value = signature.slice(offset, offset + encoded.length)
    offset += encoded.length
    while (value.length > coordinateSize && value[0] === 0)
      value = value.slice(1)
    if (value.length > coordinateSize)
      throw new Error('ECDSA coordinate is too large')
    const padded = new Uint8Array(coordinateSize)
    padded.set(value, coordinateSize - value.length)
    coordinates.push(padded)
  }

  const raw = new Uint8Array(coordinateSize * 2)
  raw.set(coordinates[0], 0)
  raw.set(coordinates[1], coordinateSize)
  return raw
}

function parseSignatureHeader(value) {
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(
    decodeBase64(value),
  )
  const header = JSON.parse(decoded)
  if (
    header?.alg !== 'ecdsa' ||
    !/^[0-9a-f-]{20,80}$/i.test(header.kid) ||
    typeof header.signature !== 'string' ||
    !['SHA1', 'SHA256'].includes(header.digest)
  ) {
    throw new Error('Unsupported eBay signature header')
  }
  return header
}

async function getApplicationToken(env) {
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
    throw new Error('Missing eBay credentials')
  }
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodeBasicCredential(
        env.EBAY_CLIENT_ID,
        env.EBAY_CLIENT_SECRET,
      )}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
    redirect: 'manual',
  })
  if (!response.ok) throw new Error('eBay token request failed')
  const payload = await response.json()
  if (typeof payload.access_token !== 'string') {
    throw new Error('eBay token response was invalid')
  }
  return payload.access_token
}

async function getPublicKey(keyId, env) {
  const cached = keyCache.get(keyId)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const token = await getApplicationToken(env)
  const response = await fetch(
    `${PUBLIC_KEY_ENDPOINT}${encodeURIComponent(keyId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      redirect: 'manual',
    },
  )
  if (!response.ok) throw new Error('eBay public-key request failed')
  const payload = await response.json()
  if (typeof payload.key !== 'string') {
    throw new Error('eBay public-key response was invalid')
  }
  keyCache.set(keyId, { value: payload, expiresAt: Date.now() + KEY_CACHE_MS })
  return payload
}

async function verifyNotification(rawBody, signatureValue, env) {
  const signatureHeader = parseSignatureHeader(signatureValue)
  const publicKey = await getPublicKey(signatureHeader.kid, env)
  const key = await crypto.subtle.importKey(
    'spki',
    pemToDer(publicKey.key),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  )
  return crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: signatureHeader.digest === 'SHA1' ? 'SHA-1' : 'SHA-256',
    },
    key,
    derEcdsaToRaw(decodeBase64(signatureHeader.signature)),
    new TextEncoder().encode(rawBody),
  )
}

async function challengeResponse(challengeCode, verificationToken) {
  const value = challengeCode + verificationToken + ENDPOINT
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function handleRequest(request, env) {
  const url = new URL(request.url)
  if (`${url.origin}${url.pathname}` !== ENDPOINT) {
    return new Response('Not found', { status: 404 })
  }

  if (request.method === 'GET') {
    const challengeCode = url.searchParams.get('challenge_code')
    if (!challengeCode || !env.EBAY_VERIFICATION_TOKEN) {
      return new Response('Bad request', { status: 400 })
    }
    return jsonResponse({
      challengeResponse: await challengeResponse(
        challengeCode,
        env.EBAY_VERIFICATION_TOKEN,
      ),
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'GET, POST' },
    })
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_NOTIFICATION_BYTES) {
    return new Response('Payload too large', { status: 413 })
  }
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).length > MAX_NOTIFICATION_BYTES) {
    return new Response('Payload too large', { status: 413 })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  if (
    payload?.metadata?.topic !== 'MARKETPLACE_ACCOUNT_DELETION' ||
    typeof payload?.notification?.notificationId !== 'string' ||
    typeof payload?.notification?.data !== 'object'
  ) {
    return new Response('Unsupported notification', { status: 400 })
  }

  const signature = request.headers.get('x-ebay-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })
  try {
    if (!(await verifyNotification(rawBody, signature, env))) {
      return new Response('Invalid signature', { status: 412 })
    }
  } catch (error) {
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : 'Unknown error'
    console.error(`eBay signature verification failed: ${detail}`)
    return new Response('Signature verification unavailable', { status: 503 })
  }

  // The scanner deliberately stores no eBay username, user ID, or EIAS token.
  // There is therefore no retained account data to delete when this arrives.
  return new Response(null, { status: 204 })
}

export {
  challengeResponse,
  handleRequest,
  parseSignatureHeader,
  verifyNotification,
}

export default {
  fetch: handleRequest,
}
