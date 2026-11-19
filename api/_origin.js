// Checagem de origem compartilhada pelas funções de API.
//
// A mesma origem da requisição é sempre permitida (o site que o aluno abriu),
// independentemente do domínio de deploy (produção, preview ou localhost).
// ALLOWED_ORIGIN continua valendo como lista extra, separada por vírgula.

function normalize(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase()
}

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim()
}

export function getRequestOrigin(req) {
  const headers = req?.headers || {}
  const host = firstHeaderValue(headers['x-forwarded-host'] || headers.host)
  const proto = firstHeaderValue(headers['x-forwarded-proto']) || 'https'
  if (!host) return { origin: '', expected: '' }
  return {
    origin: normalize(headers.origin),
    expected: normalize(`${proto}://${host}`)
  }
}

export function isOriginAllowed({ origin, expected, allowedOrigins = [], isProd = false }) {
  const normalizedOrigin = normalize(origin)
  if (!normalizedOrigin) return !isProd
  if (expected && normalizedOrigin === normalize(expected)) return true
  if (allowedOrigins.length === 0) return !isProd
  return allowedOrigins.map(normalize).includes(normalizedOrigin)
}

export function createOriginChecker(env = process.env) {
  const allowedOrigins = String(env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const isProd = env.NODE_ENV === 'production'

  return function check(req) {
    const { origin, expected } = getRequestOrigin(req)
    return isOriginAllowed({ origin, expected, allowedOrigins, isProd })
  }
}
