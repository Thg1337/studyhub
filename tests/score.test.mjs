import test from 'node:test'
import assert from 'node:assert/strict'
import { estimatePerformance } from '../src/lib/score.js'

const answers = (right, total) => Array.from({ length: total }, (_, index) => ({ correct: index < right }))

test('sem questões não exibe pontuação', () => {
  assert.deepEqual(estimatePerformance([]), { score: null, low: null, high: null, correct: 0, total: 0 })
})

test('a pontuação é reproduzível e cresce com os acertos', () => {
  assert.deepEqual(estimatePerformance(answers(5, 10)), estimatePerformance(answers(5, 10)))
  assert.ok(estimatePerformance(answers(8, 10)).score > estimatePerformance(answers(5, 10)).score)
  assert.ok(estimatePerformance(answers(5, 10)).score > estimatePerformance(answers(0, 10)).score)
})

test('faixas permanecem entre 0 e 1000 e ficam mais estreitas com mais questões', () => {
  for (const result of [estimatePerformance(answers(0, 45)), estimatePerformance(answers(45, 45)), estimatePerformance(answers(90, 180))]) {
    assert.ok(result.low >= 0 && result.high <= 1000 && result.low <= result.score && result.score <= result.high)
  }
  const small = estimatePerformance(answers(5, 10))
  const large = estimatePerformance(answers(90, 180))
  assert.ok(large.high - large.low < small.high - small.low)
})
