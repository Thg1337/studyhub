const KEY = 'studyhub_sr'
const DAY = 86400000
const INTERVALS = { again: 1, hard: 2, good: 5, easy: 10 }

export function getAll() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

export function getDue() {
  return getAll().filter((item) => item.nextReview <= Date.now() && (Array.isArray(item.opts) || item.source === 'flashcard'))
}

export function recordResult(item, correct, rating = correct ? 'good' : 'again') {
  try {
    const list = getAll()
    const index = list.findIndex((entry) => entry.id === item.id)
    const previous = index < 0 ? null : list[index]
    const safeRating = INTERVALS[rating] ? rating : (correct ? 'good' : 'again')
    const priorInterval = previous?.interval || 0
    const interval = safeRating === 'again' ? 1 : Math.max(INTERVALS[safeRating], Math.round(priorInterval * (safeRating === 'easy' ? 2.2 : safeRating === 'good' ? 1.7 : 1.25)))
    const updated = { ...previous, ...item, interval, rating: safeRating, nextReview: Date.now() + interval * DAY, lastResult: Boolean(correct) }
    if (index < 0) list.unshift(updated)
    else list[index] = updated
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 300)))
  } catch { /* armazenamento opcional */ }
}
