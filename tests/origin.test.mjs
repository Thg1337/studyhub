import test from 'node:test'
import assert from 'node:assert/strict'
import { isOriginAllowed, getRequestOrigin, createOriginChecker } from '../api/_origin.js'

const SITE = 'https://studyhub-sage-phi.vercel.app'

test('aceita a própria origem do site em produção, mesmo sem allowlist', () => {
  assert.equal(
    isOriginAllowed({ origin: SITE, expected: SITE, allowedOrigins: [], isProd: true }),
    true
  )
})

test('bloqueia outra origem em produção', () => {
  assert.equal(
    isOriginAllowed({ origin: 'https://site-clonado.example', expected: SITE, allowedOrigins: [], isProd: true }),
    false
  )
})

test('aceita origem extra configurada em ALLOWED_ORIGIN', () => {
  assert.equal(
    isOriginAllowed({ origin: 'https://studyhub.example', expected: SITE, allowedOrigins: ['https://studyhub.example'], isProd: true }),
    true
  )
})

test('normaliza barra final, espaços e maiúsculas', () => {
  assert.equal(
    isOriginAllowed({ origin: ' HTTPS://StudyHub-Sage-Phi.Vercel.App/ ', expected: SITE, allowedOrigins: [], isProd: true }),
    true
  )
})

test('produção recusa requisição sem Origin; desenvolvimento aceita', () => {
  assert.equal(isOriginAllowed({ origin: '', expected: SITE, allowedOrigins: [], isProd: true }), false)
  assert.equal(isOriginAllowed({ origin: '', expected: '', allowedOrigins: [], isProd: false }), true)
})

test('extrai host e protocolo dos headers de proxy', () => {
  const req = {
    headers: {
      origin: SITE,
      'x-forwarded-host': 'studyhub-sage-phi.vercel.app',
      'x-forwarded-proto': 'https'
    }
  }
  assert.deepEqual(getRequestOrigin(req), { origin: SITE, expected: SITE })
})

test('createOriginChecker usa ALLOWED_ORIGIN e NODE_ENV do ambiente', () => {
  const prod = createOriginChecker({ NODE_ENV: 'production', ALLOWED_ORIGIN: 'https://a.example, https://b.example' })
  const makeReq = (origin) => ({ headers: { origin, 'x-forwarded-host': 'studyhub-sage-phi.vercel.app', 'x-forwarded-proto': 'https' } })

  assert.equal(prod(makeReq(SITE)), true)
  assert.equal(prod(makeReq('https://b.example')), true)
  assert.equal(prod(makeReq('https://c.example')), false)

  const dev = createOriginChecker({ NODE_ENV: 'development' })
  assert.equal(dev(makeReq('http://localhost:5191')), true)
})
