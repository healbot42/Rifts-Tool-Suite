const DATA_API = 'https://rifts-data-api.zhawkins42.workers.dev'
const SESSION_PATH = '/v1/watchlist/session'

function appReturnUrl() {
  return window.location.href
}

export async function loadSession() {
  try {
    const response = await fetch(`${DATA_API}${SESSION_PATH}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return { authenticated: false, user: null }
    const payload = await response.json()
    return payload.user?.id
      ? { authenticated: true, user: payload.user }
      : { authenticated: false, user: null }
  } catch {
    return { authenticated: false, user: null }
  }
}

export function beginAuthentication() {
  const url = new URL(`${DATA_API}${SESSION_PATH}`)
  url.searchParams.set('return_to', appReturnUrl())
  window.location.assign(url.href)
}

export function logout() {
  window.location.assign(`${DATA_API}/v1/watchlist/logout`)
}
