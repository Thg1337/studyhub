const number = (value) => {
  const text = String(value)
  return Number(text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(?:\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text)
}
const numericOption = (value) => {
  const match = String(value).match(/^\s*([\d.,]+)\s*(?:m[³3]|metros? c[uú]bicos?)?\s*$/i)
  return match ? number(match[1]) : null
}

const normalizeText = (value) => value.normalize('NFC')
  .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR')

export function distinctQuestions(questions) {
  const seenPrompts = new Set()
  const seenQuotedTerms = new Set()
  return questions.filter((question) => {
    const prompt = normalizeText(question.q).replace(/[?.!]+$/, '')
    const quoted = [...prompt.matchAll(/"([^"]+)"|'([^']+)'/g)]
      .map((match) => normalizeText(match[1] ?? match[2])).filter(Boolean)
    const pair = [...new Set(quoted)]
    // Permite exercícios de aplicação sobre o mesmo par, como completar uma frase.
    const comparesWords = /\b(?:diferença|distinção|distingu\w*|diferenc\w*)\b/.test(prompt)
    const terms = comparesWords && pair.length === 2 && pair.every((term) => /^[\p{L} ]+$/u.test(term) && term.split(' ').length <= 2)
      ? JSON.stringify(pair.sort()) : ''
    if (!prompt || seenPrompts.has(prompt) || (terms && seenQuotedTerms.has(terms))) return false
    seenPrompts.add(prompt)
    if (terms) seenQuotedTerms.add(terms)
    return true
  })
}

export function questionForReview({ q, opts }) {
  return { q, opts }
}

export function batchQuestionsForReview(questions, maxLength = 4000) {
  const batches = []
  let batch = []
  let length = 2
  for (const question of questions) {
    const size = JSON.stringify(questionForReview(question)).length
    if (size + 2 > maxLength) continue
    if (length + size + (batch.length ? 1 : 0) > maxLength) {
      batches.push(batch)
      batch = []
      length = 2
    }
    length += size + (batch.length ? 1 : 0)
    batch.push(question)
  }
  if (batch.length) batches.push(batch)
  return batches
}

// Confere contas simples sem depender do mesmo modelo que escreveu o gabarito.
export function validateQuestion(question) {
  if (!question || typeof question.q !== 'string') return false
  const { q: prompt, opts, correct, altFiles, files } = question
  if (!prompt.trim() && !files?.length) return false
  if (!Array.isArray(opts) || opts.length !== 5 || opts.some((option) => typeof option !== 'string' || !option.trim())) return false
  if (!Number.isInteger(correct) || correct < 0 || correct >= opts.length) return false
  const options = opts.map((option, index) => JSON.stringify([normalizeText(option), altFiles?.[index] || '']))
  if (new Set(options).size !== opts.length) return false
  if (/qual (?:dos? )?tanques? (?:tem|possui) maior volume/i.test(prompt) && !/\d/.test(prompt)) return false

  let expected = null
  const liters = prompt.match(/([\d.,]+)\s*(?:litros?|l\b)/i)
  if (liters && /(?:m[³3]|metros? c[uú]bicos?)/i.test(prompt) && /(?:converta|quantos?|equivale|corresponde)/i.test(prompt)) {
    expected = number(liters[1]) / 1000
  }
  const dimensions = [...prompt.matchAll(/([\d.,]+)\s*m(?:etros?)?\b/gi)].map((match) => number(match[1]))
  if (expected === null && dimensions.length === 3 && /(?:tanque|paralelep[ií]pedo|caixa retangular)/i.test(prompt) && /volume/i.test(prompt)) {
    expected = dimensions.reduce((product, value) => product * value, 1)
  }
  if (expected === null) return true
  const matches = opts.map(numericOption).map((value) => value !== null && Math.abs(value - expected) < 1e-9)
  const statedResult = String(question.explain || '').match(/(?:resposta|resultado)\s*(?:é|:)\s*([\d.,]+)\s*(litros?\b|l\b|m[³3]|metros? c[uú]bicos?)?/i)
  const statedVolume = statedResult && number(statedResult[1]) / (/^l/i.test(statedResult[2] || '') ? 1000 : 1)
  return matches.filter(Boolean).length === 1 && matches[question.correct] === true &&
    (!statedResult || Math.abs(statedVolume - expected) < 1e-9)
}

export function restoreQuizDraft(draft) {
  if (!Array.isArray(draft?.questions)) return null
  const ids = new Set()
  const valid = draft.questions.filter((question) => {
    if (!validateQuestion(question) || !Number.isInteger(question.id) || ids.has(question.id)) return false
    ids.add(question.id)
    return true
  })
  const hasAnswer = ({ id, opts }) => draft.revealed?.[id] === true &&
    Number.isInteger(draft.answers?.[id]) && draft.answers[id] >= 0 && draft.answers[id] < opts.length
  const keep = draft.reviewing ? valid : distinctQuestions([
    ...valid.filter(hasAnswer),
    ...valid.filter((question) => !hasAnswer(question))
  ])
  const retained = new Set(keep)
  const questions = valid.filter((question) => retained.has(question))
  if (!questions.length) return null

  const answers = {}
  const revealed = {}
  for (const question of questions.filter(hasAnswer)) {
    answers[question.id] = draft.answers[question.id]
    revealed[question.id] = true
  }
  const previous = draft.questions[Number.isInteger(draft.current) ? draft.current : 0]
  const previousIndex = questions.indexOf(previous)
  const nextIndex = questions.findIndex((question) => !revealed[question.id])
  return { ...draft, questions, answers, revealed, current: previousIndex >= 0 ? previousIndex : Math.max(0, nextIndex) }
}
