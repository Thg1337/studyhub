const DRAFT_KEY = 'studyhub_exam_draft'
const TIMER_KEY = 'studyhub_exam_timer'
export const EXAM_HISTORY_KEY = 'enem_history'

export function readExamHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(EXAM_HISTORY_KEY) || '[]')
    return Array.isArray(history) ? history.filter((item) => item && Array.isArray(item.disciplines)).slice(0, 20) : []
  } catch { return [] }
}

export function readExamDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null')
    if (draft?.version !== 1 || !Array.isArray(draft.questions) || !draft.questions.length ||
        !Number.isInteger(draft.current) || !draft.questions[draft.current] ||
        !draft.answers || !Array.isArray(draft.yearsUsed) || !Array.isArray(draft.selectedDisciplines)) return null
    const savedTimer = sessionStorage.getItem(TIMER_KEY)
    const timeLeft = savedTimer === null ? draft.timeLeft : Number(savedTimer)
    return { ...draft, timeLeft: Number.isInteger(timeLeft) && timeLeft >= 0 ? timeLeft : undefined }
  } catch { return null }
}

export function saveExamDraft(draft) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, ...draft }))
    else {
      sessionStorage.removeItem(DRAFT_KEY)
      sessionStorage.removeItem(TIMER_KEY)
    }
  } catch { /* browsers may disable session storage */ }
}

export function saveExamTimer(timeLeft) {
  try { sessionStorage.setItem(TIMER_KEY, String(timeLeft)) } catch { /* storage unavailable */ }
}

export function stripRenderedExamImages(text, files) {
  const rendered = new Set(files || [])
  return String(text || '').replace(/!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\s*\)/g,
    (_markup, alt, enclosed, url) => rendered.has(enclosed || url) ? '' : alt).trim()
}
