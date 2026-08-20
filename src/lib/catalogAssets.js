/** Resolves catalog asset paths against the configured Vite deployment base. */
export function resolveCatalogAssetUrl(
  assetPath,
  baseUrl = import.meta.env.BASE_URL,
) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${assetPath.replace(/^\/+/, '')}`
}
