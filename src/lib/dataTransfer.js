import { getProgress, getStudyEvents } from './progress.js'
import { getFavorites } from './favorites.js'
import { getAll as getSpaced } from './spaced.js'

const STORAGE_KEYS = {
  progress: 'studyhub_daily_progress',
  events: 'studyhub_study_events',
  favorites: 'studyhub_favorites',
  spaced: 'studyhub_sr'
}

export function exportStudyData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: getProgress(),
    events: getStudyEvents(),
    favorites: getFavorites(),
    spaced: getSpaced()
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

export function importStudyData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || ''))
        if (!isObject(data) || data.version !== 1) {
          reject(new Error('Arquivo inválido ou versão não suportada.'))
          return
        }
        if (isObject(data.progress)) localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(data.progress))
        if (Array.isArray(data.events)) localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(data.events.slice(-3000)))
        if (Array.isArray(data.favorites)) localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(data.favorites.slice(0, 100)))
        if (Array.isArray(data.spaced)) localStorage.setItem(STORAGE_KEYS.spaced, JSON.stringify(data.spaced.slice(0, 300)))
        resolve(true)
      } catch (e) {
        reject(new Error('Arquivo JSON inválido.'))
      }
    }
    reader.readAsText(file)
  })
}