import test from 'node:test'
import assert from 'node:assert/strict'
import { validateQuestion } from '../src/lib/quizValidation.js'

test('rejeita gabaritos errados de conversão de litros', () => {
  assert.equal(validateQuestion({ q: 'Converta 2.000 litros para metros cúbicos.', opts: ['0,2 m³', '2 m³', '20 m³', '200 m³', '2000 m³'], correct: 0 }), false)
  assert.equal(validateQuestion({ q: 'Converta 2.000 litros para metros cúbicos.', opts: ['0,2 m³', '2 m³', '20 m³', '200 m³', '2000 m³'], correct: 1 }), true)
  assert.equal(validateQuestion({ q: 'Uma piscina contém 200000 litros. Quantos metros cúbicos são?', opts: ['2', '20', '200', '2000', '20000'], correct: 1 }), false)
})

test('rejeita volume retangular incorreto ou enunciado sem dados', () => {
  assert.equal(validateQuestion({ q: 'Um tanque de 10m x 5m x 2m tem qual volume?', opts: ['20 m³', '50 m³', '80 m³', '100 m³', '200 m³'], correct: 2 }), false)
  assert.equal(validateQuestion({ q: 'Um tanque de 10m x 5m x 2m tem qual volume?', opts: ['20 m³', '50 m³', '80 m³', '100 m³', '200 m³'], correct: 3 }), true)
  assert.equal(validateQuestion({ q: 'Qual tanque tem maior volume?', opts: ['A', 'B', 'C', 'D', 'E'], correct: 0 }), false)
})

test('rejeita explicação numérica que contradiz o gabarito', () => {
  const question = { q: 'Converta 2.000 litros para metros cúbicos.', opts: ['0,2 m³', '2 m³', '20 m³', '200 m³', '2000 m³'], correct: 1 }
  assert.equal(validateQuestion({ ...question, explain: 'O resultado é 20 m³.' }), false)
  assert.equal(validateQuestion({ ...question, explain: 'O resultado é 2 m³.' }), true)
})
