// Valida URLs de imagem para evitar injeção de esquemas perigosos (javascript:, data:, etc.)
export function safeImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value, window.location.origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}
