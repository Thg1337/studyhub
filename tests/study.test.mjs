import test from 'node:test'
import assert from 'node:assert/strict'
import { getAll, recordResult } from '../src/lib/spaced.js'
import { getDashboard, recordAnswer } from '../src/lib/progress.js'

const memory = new Map()
globalThis.localStorage = { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) }

test('a revisão usa intervalos diferentes para as avaliações', () => {
  recordResult({ id: 'card-1', source: 'flashcard' }, false, 'again')
  const again = getAll().find((item) => item.id === 'card-1')
  recordResult({ id: 'card-2', source: 'flashcard' }, true, 'easy')
  const easy = getAll().find((item) => item.id === 'card-2')
  assert.equal(again.interval, 1)
  assert.ok(easy.interval > again.interval)
})

test('o painel agrupa respostas por matéria', () => {
  recordAnswer({ subject: 'Matemática', correct: true, durationMs: 60000 })
  recordAnswer({ subject: 'Matemática', correct: false, durationMs: 60000 })
  recordAnswer({ subject: 'História', correct: true })
  const dashboard = getDashboard()
  assert.equal(dashboard.total, 3)
  assert.equal(dashboard.rate, 67)
  assert.equal(dashboard.bySubject.find((item) => item.subject === 'Matemática').rate, 50)
})
