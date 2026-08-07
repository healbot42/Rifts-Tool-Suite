export function resolveDeviceImageUrl(imagePath, baseUrl = import.meta.env.BASE_URL) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${imagePath.replace(/^\/+/, '')}`
}
