const KEY = 'studyhub_daily_progress'
const EVENTS_KEY = 'studyhub_study_events'
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function getProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { goal: Math.max(1, Number(value.goal) || 10), days: value.days || {} }
  } catch { return { goal: 10, days: {} } }
}

export function setDailyGoal(goal) {
  const progress = getProgress()
  progress.goal = Math.max(1, Math.min(200, Number(goal) || 10))
  try { localStorage.setItem(KEY, JSON.stringify(progress)) } catch { /* progresso local indisponível */ }
  return progress
}

export function recordStudy(count = 1) {
  const progress = getProgress()
  const today = dateKey(new Date())
  progress.days[today] = (progress.days[today] || 0) + count
  progress.days = Object.fromEntries(Object.entries(progress.days).sort(([a], [b]) => a.localeCompare(b)).slice(-365))
  try { localStorage.setItem(KEY, JSON.stringify(progress)) } catch { /* progresso local indisponível */ }
  return progress
}

export function recordAnswer({ subject = 'Outras matérias', correct, source = 'prática', durationMs = 0 }) {
  try {
    const events = getStudyEvents()
    events.push({ at: Date.now(), subject, correct: Boolean(correct), source, durationMs: Math.max(0, Number(durationMs) || 0) })
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-3000)))
  } catch { /* indicadores locais são opcionais */ }
}

export function getStudyEvents() {
  try {
    const value = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

export function getStreak(progress = getProgress()) {
  const day = new Date()
  if (!progress.days[dateKey(day)]) day.setDate(day.getDate() - 1)
  let streak = 0
  while (progress.days[dateKey(day)]) {
    streak++
    day.setDate(day.getDate() - 1)
  }
  return streak
}

export function todayCount(progress = getProgress()) {
  return progress.days[dateKey(new Date())] || 0
}

export function getDashboard() {
  const events = getStudyEvents()
  const total = events.length
  const correct = events.filter((event) => event.correct).length
  const bySubject = Object.values(events.reduce((all, event) => {
    const item = all[event.subject] || { subject: event.subject, total: 0, correct: 0, durationMs: 0 }
    item.total++
    item.correct += Number(event.correct)
    item.durationMs += event.durationMs
    all[event.subject] = item
    return all
  }, {})).map((item) => ({ ...item, rate: item.total ? Math.round(item.correct / item.total * 100) : 0 }))
  const today = new Date()
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const key = dateKey(date)
    return { key, label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), count: events.filter((event) => dateKey(new Date(event.at)) === key).length }
  })
  return { total, correct, rate: total ? Math.round(correct / total * 100) : 0, durationMs: events.reduce((sum, event) => sum + event.durationMs, 0), bySubject, week }
}
