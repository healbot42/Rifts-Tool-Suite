const MAX_BODY_BYTES = 256 * 1024

async function tokensMatch(provided, expected) {
  if (!provided || !expected) return false
  const encoder = new TextEncoder()
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  return crypto.subtle.timingSafeEqual(left, right)
}

async function authorized(request, env) {
  const header = request.headers.get('authorization') || ''
  return tokensMatch(
    header.startsWith('Bearer ') ? header.slice(7) : '',
    env.DATA_API_TOKEN,
  )
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS deal_observations (
      source TEXT NOT NULL, source_listing_id TEXT NOT NULL, product_id TEXT NOT NULL,
      observed_at TEXT NOT NULL, delivered_price TEXT NOT NULL, title TEXT NOT NULL,
      url TEXT NOT NULL, image_url TEXT, ends_at TEXT, available INTEGER NOT NULL,
      PRIMARY KEY (source, source_listing_id, observed_at))`),
    db.prepare(`CREATE INDEX IF NOT EXISTS deal_observations_product_time
      ON deal_observations(product_id, observed_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS purchases (
      product_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL)`),
  ])
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

async function bodyJson(request) {
  const length = Number(request.headers.get('content-length') || 0)
  if (length > MAX_BODY_BYTES) throw new Error('Payload too large')
  const body = await request.arrayBuffer()
  if (body.byteLength > MAX_BODY_BYTES) throw new Error('Payload too large')
  return JSON.parse(new TextDecoder().decode(body))
}

function validObservation(row) {
  if (!row || typeof row !== 'object') return false
  const required = [
    'source',
    'source_listing_id',
    'product_id',
    'observed_at',
    'delivered_price',
    'title',
    'url',
  ]
  if (
    required.some((key) => typeof row[key] !== 'string' || !row[key].trim())
  ) {
    return false
  }
  try {
    const listingUrl = new URL(row.url)
    if (listingUrl.protocol !== 'https:') return false
    if (row.image_url && new URL(row.image_url).protocol !== 'https:')
      return false
  } catch {
    return false
  }
  return !Number.isNaN(Date.parse(row.observed_at))
}

async function handleRequest(request, env) {
  const url = new URL(request.url)
  if (request.method === 'GET' && url.pathname === '/health') {
    return json({ ok: true })
  }
  if (!(await authorized(request, env)))
    return json({ error: 'Unauthorized' }, 401)
  await ensureSchema(env.DB)

  if (request.method === 'GET' && url.pathname === '/v1/history') {
    const productId = url.searchParams.get('product_id')
    if (!productId) return json({ error: 'product_id is required' }, 400)
    const since = url.searchParams.get('since') || '1970-01-01T00:00:00Z'
    const result = await env.DB.prepare(
      `SELECT source, source_listing_id, product_id, observed_at, delivered_price,
       title, url, image_url, ends_at, available FROM deal_observations
       WHERE product_id=? AND observed_at>=? ORDER BY observed_at`,
    )
      .bind(productId, since)
      .all()
    return json({ observations: result.results })
  }

  if (request.method === 'POST' && url.pathname === '/v1/observations') {
    const payload = await bodyJson(request)
    if (
      !Array.isArray(payload.observations) ||
      payload.observations.length > 100 ||
      payload.observations.some((row) => !validObservation(row))
    ) {
      return json(
        { error: 'observations must contain at most 100 valid rows' },
        400,
      )
    }
    const statements = payload.observations.map((row) =>
      env.DB.prepare(
        `INSERT INTO deal_observations(source, source_listing_id, product_id,
         observed_at, delivered_price, title, url, image_url, ends_at, available)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(source, source_listing_id, observed_at) DO UPDATE SET
         delivered_price=excluded.delivered_price, title=excluded.title,
         url=excluded.url, image_url=excluded.image_url, ends_at=excluded.ends_at,
         available=excluded.available`,
      ).bind(
        String(row.source),
        String(row.source_listing_id),
        String(row.product_id),
        String(row.observed_at),
        String(row.delivered_price),
        String(row.title),
        String(row.url),
        row.image_url ? String(row.image_url) : null,
        row.ends_at ? String(row.ends_at) : null,
        row.available === false ? 0 : 1,
      ),
    )
    if (statements.length) await env.DB.batch(statements)
    return json({ stored: statements.length })
  }

  if (request.method === 'GET' && url.pathname === '/v1/purchases') {
    const result = await env.DB.prepare(
      'SELECT product_id, quantity, updated_at FROM purchases ORDER BY product_id',
    ).all()
    return json({ purchases: result.results })
  }

  if (request.method === 'PUT' && url.pathname.startsWith('/v1/purchases/')) {
    const productId = decodeURIComponent(
      url.pathname.slice('/v1/purchases/'.length),
    )
    const payload = await bodyJson(request)
    const quantity = Number(payload.quantity)
    if (!productId || !Number.isInteger(quantity) || quantity < 0) {
      return json(
        { error: 'A product and non-negative integer quantity are required' },
        400,
      )
    }
    const updatedAt = new Date().toISOString()
    await env.DB.prepare(
      `INSERT INTO purchases(product_id, quantity, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET quantity=excluded.quantity,
       updated_at=excluded.updated_at`,
    )
      .bind(productId, quantity, updatedAt)
      .run()
    return json({ product_id: productId, quantity, updated_at: updatedAt })
  }

  return json({ error: 'Not found' }, 404)
}

export { handleRequest }
export default { fetch: handleRequest }
