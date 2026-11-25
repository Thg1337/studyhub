// Valida URLs de imagem para evitar injeção de esquemas perigosos (javascript:, data:, etc.)
export function safeImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value, window.location.origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.origin !== window.location.origin &&
        url.origin !== 'https://enem.dev' && url.origin !== 'https://i.ytimg.com') return null
    return url.href
  } catch {
    return null
  }
}
