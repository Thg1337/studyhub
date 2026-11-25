import { getProgress, getStudyEvents } from './progress.js'
import { getFavorites } from './favorites.js'
import { getAll as getSpaced } from './spaced.js'

const STORAGE_KEYS = {
  progress: 'studyhub_daily_progress',
  events: 'studyhub_study_events',
  favorites: 'studyhub_favorites',
  spaced: 'studyhub_sr',
  flashcards: 'studyhub_flashcards'
}

function getFlashcards() {
  try {
    const cards = JSON.parse(localStorage.getItem(STORAGE_KEYS.flashcards) || '[]')
    return Array.isArray(cards) ? cards : []
  } catch { return [] }
}

export function exportStudyData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: getProgress(),
    events: getStudyEvents(),
    favorites: getFavorites(),
    spaced: getSpaced(),
    flashcards: getFlashcards()
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `studyhub-dados-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const MAX_IMPORT_BYTES = 5 * 1024 * 1024
const MAX_DATE = Date.UTC(2100, 0, 1)

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validTimestamp(value) {
  return Number.isSafeInteger(value) && value >= 0 && value < MAX_DATE
}

function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Texto inválido no arquivo.')
  return value
}

function optionalText(item, key, max, output) {
  if (item[key] !== undefined) output[key] = text(item[key], max)
}

function optionalFiles(item, key, output) {
  if (item[key] === undefined) return
  if (!Array.isArray(item[key]) || item[key].length > 20) throw new Error('Imagens inválidas no arquivo.')
  output[key] = item[key].map((value) => value === null ? null : text(value, 2048))
}

function normalizeQuestion(item, scheduled = false) {
  if (!isObject(item)) throw new Error('Questão inválida no arquivo.')
  const source = text(item.source, 20, true)
  if (!['quiz', 'simulado', 'flashcard'].includes(source) || (!scheduled && source === 'flashcard')) {
    throw new Error('Origem de questão inválida no arquivo.')
  }
  const result = { id: text(item.id, 200, true), source }
  optionalText(item, 'topic', 120, result)
  if (source === 'flashcard') {
    result.front = text(item.front, 4000, true)
    result.back = text(item.back, 8000, true)
  } else {
    result.q = text(item.q, 10000)
    if (!Array.isArray(item.opts) || item.opts.length < 2 || item.opts.length > 8) throw new Error('Alternativas inválidas no arquivo.')
    result.opts = item.opts.map((option) => text(option, 4000, true))
    if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= result.opts.length) throw new Error('Gabarito inválido no arquivo.')
    result.correct = item.correct
    optionalText(item, 'subject', 120, result)
    optionalText(item, 'area', 120, result)
    optionalText(item, 'explain', 10000, result)
    optionalFiles(item, 'files', result)
    optionalFiles(item, 'altFiles', result)
    if (!result.q.trim() && ![...(result.files || []), ...(result.altFiles || [])].some(Boolean)) {
      throw new Error('Questão sem conteúdo no arquivo.')
    }
    if (item.userAnswer !== undefined) {
      if (!Number.isInteger(item.userAnswer) || item.userAnswer < 0 || item.userAnswer >= result.opts.length) throw new Error('Resposta inválida no arquivo.')
      result.userAnswer = item.userAnswer
    }
    if (item.year !== undefined) {
      if (!Number.isInteger(item.year) || item.year < 1900 || item.year > 2100) throw new Error('Ano inválido no arquivo.')
      result.year = item.year
    }
  }
  if (scheduled) {
    if (!Number.isSafeInteger(item.interval) || item.interval < 1 || item.interval > 36500 ||
      !['again', 'hard', 'good', 'easy'].includes(item.rating) || !validTimestamp(item.nextReview) || typeof item.lastResult !== 'boolean') {
      throw new Error('Revisão inválida no arquivo.')
    }
    Object.assign(result, { interval: item.interval, rating: item.rating, nextReview: item.nextReview, lastResult: item.lastResult })
  }
  return result
}

function normalizeFlashcard(item) {
  if (!isObject(item)) throw new Error('Flashcard inválido no arquivo.')
  return {
    id: text(item.id, 200, true),
    topic: text(item.topic, 120, true),
    front: text(item.front, 4000, true),
    back: text(item.back, 8000, true)
  }
}

function normalizeImport(data) {
  if (!isObject(data) || data.version !== 1 || typeof data.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(data.exportedAt)) || new Date(data.exportedAt).toISOString() !== data.exportedAt ||
    !isObject(data.progress) || !isObject(data.progress.days) ||
    !Array.isArray(data.events) || !Array.isArray(data.favorites) || !Array.isArray(data.spaced) ||
    (data.flashcards !== undefined && !Array.isArray(data.flashcards))) {
    throw new Error('Arquivo inválido ou versão não suportada.')
  }
  const { goal, days } = data.progress
  const dayEntries = Object.entries(days)
  if (!Number.isInteger(goal) || goal < 1 || goal > 200 || dayEntries.length > 365 ||
    data.events.length > 3000 || data.favorites.length > 100 || data.spaced.length > 300 ||
    (data.flashcards?.length || 0) > 200) {
    throw new Error('Dados acima do limite permitido.')
  }
  const safeDays = Object.fromEntries(dayEntries.map(([date, count]) => {
    if (!validDate(date) || !Number.isSafeInteger(count) || count < 0 || count > 10000) throw new Error('Data ou contagem inválida no arquivo.')
    return [date, count]
  }))
  const events = data.events.map((event) => {
    if (!isObject(event) || !validTimestamp(event.at) || typeof event.correct !== 'boolean' ||
      !Number.isFinite(event.durationMs) || event.durationMs < 0 || event.durationMs > 7 * 86400000) {
      throw new Error('Evento inválido no arquivo.')
    }
    const subject = text(event.subject, 120, true)
    if (subject in Object.prototype || subject === 'prototype') throw new Error('Matéria inválida no arquivo.')
    return { at: event.at, subject, correct: event.correct, source: text(event.source, 60, true), durationMs: event.durationMs }
  })
  return {
    progress: { goal, days: safeDays },
    events,
    favorites: data.favorites.map((item) => normalizeQuestion(item)),
    spaced: data.spaced.map((item) => normalizeQuestion(item, true)),
    ...(data.flashcards === undefined ? {} : { flashcards: data.flashcards.map(normalizeFlashcard) })
  }
}

export async function importStudyData(file) {
  if (!file || typeof file.name !== 'string' || !file.name.toLowerCase().endsWith('.json') ||
    !Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_IMPORT_BYTES ||
    !['', 'application/json', 'text/json', 'text/plain'].includes(file.type) || typeof file.text !== 'function') {
    throw new Error('Selecione um arquivo JSON de até 5 MB.')
  }
  let data
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('Arquivo JSON inválido ou ilegível.')
  }
  const normalized = normalizeImport(data)
  const entries = Object.entries(STORAGE_KEYS)
    .filter(([name]) => normalized[name] !== undefined)
    .map(([name, key]) => [key, JSON.stringify(normalized[name])])
  let previous
  try {
    previous = entries.map(([key]) => [key, localStorage.getItem(key)])
    for (const [key, value] of entries) localStorage.setItem(key, value)
  } catch {
    if (previous) for (const [key, value] of previous) {
      try {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      } catch { /* restauração possível, sem ocultar o erro */ }
    }
    throw new Error('Não foi possível salvar os dados neste navegador.')
  }
  return true
}
