import test from 'node:test'
import assert from 'node:assert/strict'
import { askAI, cleanAIResponse } from '../src/lib/ai.js'
import { serviceHttpError, serviceNetworkError } from '../src/lib/serviceErrors.js'
import chatHandler from '../api/chat.js'

test('a revisão de questões envia temperatura zero ao provedor', async () => {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.GROQ_API_KEY
  process.env.GROQ_API_KEY = 'test-key'
  let payload
  globalThis.fetch = async (_url, init) => {
    payload = JSON.parse(init.body)
    return { ok: true, json: async () => ({ choices: [] }) }
  }
  const response = { status(code) { this.code = code; return this }, json(value) { this.body = value } }
  try {
    await chatHandler({ method: 'POST', headers: { origin: 'https://studyhub.test', host: 'studyhub.test', 'x-forwarded-proto': 'https' }, body: { messages: [{ role: 'user', content: 'Confira o gabarito' }], temperature: 0 } }, response)
    assert.equal(response.code, 200)
    assert.equal(payload.temperature, 0)
  } finally {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalKey
  }
})

test('distingue limite, rede e indisponibilidade dos vídeos', () => {
  assert.match(serviceHttpError('vídeos', 429).message, /Limite de uso/)
  assert.match(serviceHttpError('vídeos', 503).message, /temporariamente indisponível/)
  assert.match(serviceNetworkError('vídeos').message, /Confira sua internet/)
})

test('preserva Markdown e transforma delimitadores de fórmulas em notação renderizável', () => {
  const result = cleanAIResponse('**Fórmula de Euler**\n\\[ V-E+F=2 \\]\n\\;\\;\\;')
  assert.match(result, /\*\*Fórmula de Euler\*\*/)
  assert.match(result, /\$\$\nV-E\+F=2\s*\n\$\$/)
  assert.doesNotMatch(result, /\\;/)
  assert.match(cleanAIResponse('$$V-E+F=2$$'), /^\$\$\nV-E\+F=2\n\$\$$/)
})

test('repete uma resposta truncada e não exibe o trecho incompleto', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body))
    return { ok: true, json: async () => ({ choices: [{ finish_reason: requests.length === 1 ? 'length' : 'stop', message: { content: requests.length === 1 ? 'Resposta cortada V -' : '**Resposta completa**: $V-E+F=2$.' } }] }) }
  }
  try {
    assert.equal(await askAI([{ role: 'user', content: 'Explique Euler' }], { max_tokens: 1200 }), '**Resposta completa**: $V-E+F=2$.')
    assert.deepEqual(requests.map((item) => item.max_tokens), [1200, 2400])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rejeita uma resposta cortada no limite máximo', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: 'Resposta cortada' } }] }) })
  try {
    await assert.rejects(askAI([{ role: 'user', content: 'Explique Euler' }], { max_tokens: 3000 }), /interrompida/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('explica o limite de IA sem repetir a requisição', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return { ok: false, status: 429 } }
  try {
    await assert.rejects(askAI([{ role: 'user', content: 'Teste' }]), /Limite de uso da IA/)
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})
