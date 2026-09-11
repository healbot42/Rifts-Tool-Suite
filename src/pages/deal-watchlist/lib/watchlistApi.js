export const WATCHLIST_API = 'https://rifts-data-api.zhawkins42.workers.dev'

async function request(path, options = {}) {
  const response = await fetch(`${WATCHLIST_API}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok)
    throw new Error(payload.error || `Request failed (${response.status})`)
  return payload
}

export const watchlistApi = {
  list: () => request('/v1/watchlist'),
  save: (product) =>
    request(`/v1/watchlist/${encodeURIComponent(product.id)}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),
  remove: (id) =>
    request(`/v1/watchlist/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
