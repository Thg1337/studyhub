import test from 'node:test'
import assert from 'node:assert/strict'
import { importStudyData } from '../src/lib/dataTransfer.js'

const keys = ['studyhub_daily_progress', 'studyhub_study_events', 'studyhub_favorites', 'studyhub_sr']

function backup(changes = {}) {
  return {
    version: 1,
    exportedAt: '2026-11-23T20:00:00.000Z',
    progress: { goal: 10, days: { '2026-11-23': 2 } },
    events: [{ at: Date.parse('2026-11-23T19:00:00.000Z'), subject: 'Matemática', correct: true, source: 'prática', durationMs: 60000 }],
    favorites: [{ id: 'quiz-1', source: 'quiz', q: 'Quanto é 2 + 2?', opts: ['3', '4'], correct: 1, userAnswer: 1 }],
    spaced: [{ id: 'card-1', source: 'flashcard', topic: 'Matemática', front: '2 + 2?', back: '4', interval: 1, rating: 'good', nextReview: Date.parse('2026-11-24T19:00:00.000Z'), lastResult: true }],
    ...changes
  }
}

function file(data) {
  return new File([JSON.stringify(data)], 'studyhub-dados.json', { type: 'application/json' })
}

function storage(initial = {}) {
  const values = new Map(Object.entries(initial))
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
  return values
}

test('importa um backup válido e descarta campos inesperados', async () => {
  const values = storage()
  const data = backup({ extra: { ignored: true } })
  data.favorites[0].unexpected = { nested: 'discarded' }
  assert.equal(await importStudyData(file(data)), true)
  assert.deepEqual([...values.keys()], keys)
  assert.equal(JSON.parse(values.get(keys[0])).days['2026-11-23'], 2)
  assert.equal(JSON.parse(values.get(keys[2]))[0].unexpected, undefined)
  assert.equal(JSON.parse(values.get(keys[3]))[0].front, '2 + 2?')
})

test('aceita uma questão de simulado cujo enunciado está em imagem', async () => {
  const values = storage()
  const imageQuestion = { id: 'sim-1', source: 'simulado', year: 2025, q: '', files: ['https://example.com/questao.png'], altFiles: [null, null], opts: ['A', 'B'], correct: 0 }
  await importStudyData(file(backup({ favorites: [imageQuestion] })))
  assert.equal(JSON.parse(values.get(keys[2]))[0].files[0], imageQuestion.files[0])
})

test('recusa arquivo grande ou de outro tipo antes da leitura', async () => {
  const values = storage()
  let read = false
  const oversized = { name: 'dados.json', type: 'application/json', size: 5 * 1024 * 1024 + 1, text: async () => { read = true; return '{}' } }
  await assert.rejects(importStudyData(oversized), /5 MB/)
  await assert.rejects(importStudyData(new File(['{}'], 'dados.txt', { type: 'text/plain' })), /JSON/)
  assert.equal(read, false)
  assert.equal(values.size, 0)
})

test('recusa dados incompletos, datas inválidas e texto excessivo sem gravar parcialmente', async () => {
  const values = storage({ [keys[0]]: 'original' })
  const badCases = [
    backup({ favorites: undefined }),
    backup({ progress: { goal: 10, days: { '2026-02-30': 1 } } }),
    backup({ events: [{ at: NaN, subject: 'Matemática', correct: true, source: 'prática', durationMs: 0 }] }),
    backup({ events: [{ at: 1000, subject: '__proto__', correct: true, source: 'prática', durationMs: 0 }] }),
    backup({ events: [{ at: 1000, subject: 'toString', correct: true, source: 'prática', durationMs: 0 }] }),
    backup({ favorites: [{ id: 'quiz-1', source: 'quiz', q: 'x'.repeat(10001), opts: ['a', 'b'], correct: 0 }] }),
    backup({ favorites: [{ id: 'quiz-1', source: 'quiz', q: 'Questão', opts: ['a', 'b'], correct: 2 }] }),
    backup({ spaced: [{ ...backup().spaced[0], nextReview: 'amanhã' }] }),
    backup({ spaced: Array.from({ length: 301 }, () => backup().spaced[0]) })
  ]
  for (const data of badCases) await assert.rejects(importStudyData(file(data)))
  assert.deepEqual([...values.entries()], [[keys[0], 'original']])
})

test('preserva os dados anteriores se a gravação falhar', async () => {
  const values = storage(Object.fromEntries(keys.map((key) => [key, `old:${key}`])))
  const originalSetItem = globalThis.localStorage.setItem
  let failed = false
  globalThis.localStorage.setItem = (key, value) => {
    if (key === keys[2] && !failed) { failed = true; throw new Error('quota') }
    originalSetItem(key, value)
  }
  await assert.rejects(importStudyData(file(backup())), /salvar/)
  assert.deepEqual([...values.entries()], keys.map((key) => [key, `old:${key}`]))
})
