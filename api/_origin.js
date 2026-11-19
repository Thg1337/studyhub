// Checagem de origem compartilhada pelas funções de API.
//
// A mesma origem da requisição é sempre permitida (o site que o aluno abriu),
// independentemente do domínio de deploy (produção, preview ou localhost).
// ALLOWED_ORIGIN continua valendo como lista extra, separada por vírgula.
//
// Detalhe importante: requisições GET do mesmo site normalmente NÃO enviam o
// header Origin. Nesses casos a validação usa Sec-Fetch-Site (enviado pelo
// navegador e não controlável por JavaScript) e, como fallback, o Referer.

function normalize(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .toLowerCase()
}

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim()
}

function urlOrigin(value) {
  try {
    return normalize(new URL(String(value)).origin)
  } catch {
    return ''
  }
}

export function getRequestOrigin(req) {
  const headers = req?.headers || {}
  const host = firstHeaderValue(headers['x-forwarded-host'] || headers.host)
  const proto = firstHeaderValue(headers['x-forwarded-proto']) || 'https'
  return {
    origin: normalize(headers.origin),
    expected: host ? normalize(`${proto}://${host}`) : '',
    referer: String(headers.referer || ''),
    secFetchSite: String(headers['sec-fetch-site'] || '').toLowerCase()
  }
}

export function isOriginAllowed({
  origin,
  expected,
  referer = '',
  secFetchSite = '',
  allowedOrigins = [],
  isProd = false
}) {
  if (!isProd) return true

  const normalizedOrigin = normalize(origin)
  const normalizedExpected = normalize(expected)

  // POST/fetch: o navegador envia Origin e ele precisa bater com o host do site.
  if (normalizedOrigin && normalizedExpected && normalizedOrigin === normalizedExpected) return true

  // GET same-origin: sem Origin, mas com Sec-Fetch-Site: same-origin.
  if (secFetchSite === 'same-origin') return true

  // Fallback para navegadores antigos que não enviam Sec-Fetch-Site.
  if (!normalizedOrigin && normalizedExpected && urlOrigin(referer) === normalizedExpected) return true

  if (!normalizedOrigin) return false
  return allowedOrigins.map(normalize).includes(normalizedOrigin)
}

export function createOriginChecker(env = process.env) {
  const allowedOrigins = String(env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const isProd = env.NODE_ENV === 'production'

  return function check(req) {
    return isOriginAllowed({ ...getRequestOrigin(req), allowedOrigins, isProd })
  }
}
