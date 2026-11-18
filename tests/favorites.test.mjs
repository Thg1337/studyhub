import test from 'node:test'
import assert from 'node:assert/strict'
import { getFavorites, toggleFavorite, updateFavoriteAnswer } from '../src/lib/favorites.js'

test('salva a resposta de uma questão favorita sem alterar o gabarito', () => {
  const data = new Map()
  globalThis.localStorage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value)
  }
  toggleFavorite({ id: 'questao-1', opts: ['3', '4', '5'], correct: 1 })
  updateFavoriteAnswer('questao-1', 0)
  assert.equal(getFavorites()[0].userAnswer, 0)
  assert.equal(getFavorites()[0].correct, 1)
  updateFavoriteAnswer('questao-1', 9)
  assert.equal(getFavorites()[0].userAnswer, 0)
  updateFavoriteAnswer('questao-inexistente', 1)
  assert.equal(getFavorites().length, 1)
})
