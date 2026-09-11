const MAX_BODY_BYTES = 256 * 1024
const ALLOWED_ORIGINS = new Set([
  'https://healbot42.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])
const DEFAULT_CONDITIONS = [
  'New on sprue',
  'New in box',
  'New without box',
  'Assembled unpainted',
  'Primed',
  'Painted',
  'Partial / bits',
  'Unknown',
]

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
    db.prepare(`CREATE TABLE IF NOT EXISTS watchlist_products (
      owner_id TEXT NOT NULL, product_id TEXT NOT NULL, config_json TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (owner_id, product_id))`),
    db.prepare(`CREATE INDEX IF NOT EXISTS watchlist_products_owner
      ON watchlist_products(owner_id, updated_at)`),
  ])
}

function corsHeaders(request) {
  const origin = request?.headers.get('origin')
  if (!ALLOWED_ORIGINS.has(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body, status = 200, request) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...corsHeaders(request) },
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

function normalizeStringList(value) {
  if (!Array.isArray(value)) throw new Error('Expected a list')
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 30)
}

function normalizeProduct(value) {
  if (!value || typeof value !== 'object')
    throw new Error('Product is required')
  const product = {
    id: String(value.id || '')
      .trim()
      .toLowerCase(),
    name: String(value.name || '').trim(),
    aliases: normalizeStringList(value.aliases || []),
    queries: normalizeStringList(value.queries || []),
    quantity_wanted: Number(value.quantity_wanted ?? 1),
    purchased_quantity: Number(value.purchased_quantity ?? 0),
    msrp: Number(value.msrp),
    percent_off_threshold:
      value.percent_off_threshold == null
        ? null
        : Number(value.percent_off_threshold),
    hard_threshold:
      value.hard_threshold == null ? null : Number(value.hard_threshold),
    minimum_savings: Number(value.minimum_savings ?? 0),
    expected_models:
      value.expected_models == null ? null : Number(value.expected_models),
    minimum_models:
      value.minimum_models == null ? null : Number(value.minimum_models),
    required_terms: normalizeStringList(value.required_terms || []),
    excluded_terms: normalizeStringList(value.excluded_terms || []),
    enabled_conditions: normalizeStringList(
      value.enabled_conditions || DEFAULT_CONDITIONS,
    ),
    condition_discount_adjustments:
      value.condition_discount_adjustments &&
      typeof value.condition_discount_adjustments === 'object'
        ? value.condition_discount_adjustments
        : {},
    median_percent_off:
      value.median_percent_off == null
        ? null
        : Number(value.median_percent_off),
    minimum_seller_rating:
      value.minimum_seller_rating == null
        ? null
        : Number(value.minimum_seller_rating),
    item_percent_off_threshold:
      value.item_percent_off_threshold == null
        ? null
        : Number(value.item_percent_off_threshold),
    delivered_percent_off_floor:
      value.delivered_percent_off_floor == null
        ? null
        : Number(value.delivered_percent_off_floor),
    enabled: value.enabled !== false,
  }
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(product.id) || !product.name) {
    throw new Error('Product ID and name are required')
  }
  for (const key of ['quantity_wanted', 'purchased_quantity']) {
    if (
      !Number.isInteger(product[key]) ||
      product[key] < 0 ||
      product[key] > 999
    ) {
      throw new Error(`${key} must be a non-negative integer`)
    }
  }
  if (!Number.isFinite(product.msrp) || product.msrp <= 0) {
    throw new Error('MSRP must be positive')
  }
  for (const key of [
    'percent_off_threshold',
    'hard_threshold',
    'minimum_savings',
    'median_percent_off',
    'minimum_seller_rating',
    'item_percent_off_threshold',
    'delivered_percent_off_floor',
  ]) {
    if (
      product[key] != null &&
      (!Number.isFinite(product[key]) || product[key] < 0)
    ) {
      throw new Error(`${key} must be non-negative`)
    }
  }
  return product
}

async function accessOwner(ctx) {
  if (!ctx?.access) return null
  const identity = await ctx.access.getIdentity()
  return identity?.email ? String(identity.email).trim().toLowerCase() : null
}

async function watchlistRequest(request, env, ctx, url) {
  const owner = await accessOwner(ctx)
  if (!owner)
    return json({ error: 'Cloudflare Access sign-in required' }, 403, request)
  await ensureSchema(env.DB)
  if (request.method === 'GET' && url.pathname === '/v1/watchlist') {
    const result = await env.DB.prepare(
      `SELECT config_json FROM watchlist_products
       WHERE owner_id=? ORDER BY updated_at DESC`,
    )
      .bind(owner)
      .all()
    return json(
      {
        owner,
        products: result.results.map((row) => JSON.parse(row.config_json)),
      },
      200,
      request,
    )
  }
  if (request.method === 'PUT' && url.pathname.startsWith('/v1/watchlist/')) {
    try {
      const routeId = decodeURIComponent(
        url.pathname.slice('/v1/watchlist/'.length),
      )
      const product = normalizeProduct(await bodyJson(request))
      if (routeId !== product.id)
        return json({ error: 'Product ID mismatch' }, 400, request)
      const now = new Date().toISOString()
      await env.DB.prepare(
        `INSERT INTO watchlist_products(owner_id, product_id, config_json, created_at,
         updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id, product_id)
         DO UPDATE SET config_json=excluded.config_json, updated_at=excluded.updated_at`,
      )
        .bind(owner, product.id, JSON.stringify(product), now, now)
        .run()
      return json({ product }, 200, request)
    } catch (error) {
      return json({ error: error.message || 'Invalid product' }, 400, request)
    }
  }
  if (
    request.method === 'DELETE' &&
    url.pathname.startsWith('/v1/watchlist/')
  ) {
    const productId = decodeURIComponent(
      url.pathname.slice('/v1/watchlist/'.length),
    )
    await env.DB.prepare(
      'DELETE FROM watchlist_products WHERE owner_id=? AND product_id=?',
    )
      .bind(owner, productId)
      .run()
    return json({ deleted: productId }, 200, request)
  }
  return json({ error: 'Not found' }, 404, request)
}

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }
  if (request.method === 'GET' && url.pathname === '/health') {
    return json({ ok: true })
  }
  if (
    url.pathname === '/v1/watchlist' ||
    url.pathname.startsWith('/v1/watchlist/')
  ) {
    return watchlistRequest(request, env, ctx, url)
  }
  if (!(await authorized(request, env)))
    return json({ error: 'Unauthorized' }, 401)
  await ensureSchema(env.DB)

  if (request.method === 'GET' && url.pathname === '/v1/bot/watchlist') {
    const owners = await env.DB.prepare(
      'SELECT COUNT(DISTINCT owner_id) AS count, MIN(owner_id) AS owner FROM watchlist_products',
    ).first()
    if (Number(owners?.count || 0) === 0) return json({ products: [] })
    if (Number(owners.count) > 1 && !env.DEAL_BOT_OWNER) {
      return json(
        { error: 'DEAL_BOT_OWNER is required when multiple owners exist' },
        409,
      )
    }
    const owner = String(env.DEAL_BOT_OWNER || owners.owner)
      .trim()
      .toLowerCase()
    const result = await env.DB.prepare(
      'SELECT config_json FROM watchlist_products WHERE owner_id=? ORDER BY updated_at DESC',
    )
      .bind(owner)
      .all()
    return json({
      owner,
      products: result.results.map((row) => JSON.parse(row.config_json)),
    })
  }

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
