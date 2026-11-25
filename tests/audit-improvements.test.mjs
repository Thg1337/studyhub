import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stripRenderedExamImages } from '../src/lib/examStorage.js'
import { batchQuestionsForReview } from '../src/lib/quizValidation.js'
import { reserveChatRequest } from '../api/_usageBudget.js'

test('remove a marcação redundante do enunciado e preserva o texto', () => {
  const file = 'https://enem.dev/2014/questions/1/figura.png'
  assert.equal(stripRenderedExamImages(`![](${file})\nLeia a charge.`, [file]), 'Leia a charge.')
  assert.equal(stripRenderedExamImages(`![Descrição da charge](${file})`, []), 'Descrição da charge')
})

test('divide a revisão sem exceder o limite de caracteres da API', () => {
  const questions = Array.from({ length: 7 }, (_, id) => ({
    id, q: 'Enunciado '.repeat(100), opts: ['A', 'B'], correct: 1, explain: 'Explicação'
  }))
  const batches = batchQuestionsForReview(questions)
  assert.ok(batches.length > 1)
  assert.deepEqual(batches.flat(), questions)
  for (const batch of batches) assert.ok(JSON.stringify(batch.map(({ id, ...question }) => question)).length <= 4000)
})

test('reserva apenas a cota agregada e trata indisponibilidade', async (t) => {
  assert.equal(await reserveChatRequest({}), 'unconfigured')
  const env = { CHAT_DAILY_REQUEST_LIMIT: '20', UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'fake', VERCEL_ENV: 'production' }
  const date = new Date('2026-11-25T21:00:00Z')
  let result = 1
  t.mock.method(globalThis, 'fetch', async (_url, request) => {
    const command = JSON.parse(request.body)
    assert.deepEqual(command.slice(2), [1, 'studyhub:chat:production:2026-11-25', 20])
    return { ok: true, json: async () => ({ result }) }
  })
  assert.equal(await reserveChatRequest(env, date), 'allowed')
  result = 0
  assert.equal(await reserveChatRequest(env, date), 'limited')
  result = null
  assert.equal(await reserveChatRequest(env, date), 'unavailable')
})
