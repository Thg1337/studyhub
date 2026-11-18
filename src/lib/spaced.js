const KEY = 'studyhub_sr'
const DAY = 86400000

export function getAll() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

export function getDue() {
  return getAll().filter((item) => item.nextReview <= Date.now() && (Array.isArray(item.opts) || item.source === 'flashcard'))
}

export function recordResult(item, correct) {
  try {
    const list = getAll()
    const index = list.findIndex((entry) => entry.id === item.id)
    const previous = index < 0 ? null : list[index]
    // Erros retornam amanhã; acertos avançam por 1, 3, 7 e 14 dias.
    const step = correct ? Math.min((previous?.step || 0) + 1, 4) : 0
    const interval = correct ? [0, 1, 3, 7, 14][step] : 1
    const updated = { ...previous, ...item, step, nextReview: Date.now() + interval * DAY }
    if (index < 0) list.unshift(updated)
    else list[index] = updated
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 300)))
  } catch { /* armazenamento opcional */ }
}
