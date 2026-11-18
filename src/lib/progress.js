const KEY = 'studyhub_daily_progress'
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
  localStorage.setItem(KEY, JSON.stringify(progress))
  return progress
}

export function recordStudy(count = 1) {
  const progress = getProgress()
  const today = dateKey(new Date())
  progress.days[today] = (progress.days[today] || 0) + count
  progress.days = Object.fromEntries(Object.entries(progress.days).slice(-365))
  localStorage.setItem(KEY, JSON.stringify(progress))
  return progress
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
