const number = (value) => {
  const text = String(value)
  return Number(text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(?:\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text)
}
const numericOption = (value) => {
  const match = String(value).match(/^\s*([\d.,]+)\s*(?:m[³3]|metros? c[uú]bicos?)?\s*$/i)
  return match ? number(match[1]) : null
}

const normalizeText = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function distinctQuestions(questions) {
  const seenPrompts = new Set()
  const seenQuotedTerms = new Set()
  return questions.filter((question) => {
    const prompt = normalizeText(question.q)
    const quoted = [...String(question.q).matchAll(/[“”"'‘’]([^“”"'‘’]+)[“”"'‘’]/g)]
      .map((match) => normalizeText(match[1])).filter(Boolean)
    // Questões que pedem a mesma distinção de palavras são repetições,
    // mesmo quando a IA reescreve o enunciado e troca as alternativas.
    const terms = quoted.length >= 2 && quoted.every((term) => term.split(' ').length <= 2)
      ? [...new Set(quoted)].sort().join('|') : ''
    if (!prompt || seenPrompts.has(prompt) || (terms && seenQuotedTerms.has(terms))) return false
    seenPrompts.add(prompt)
    if (terms) seenQuotedTerms.add(terms)
    return true
  })
}

export function batchQuestionsForReview(questions, maxLength = 4000) {
  const batches = []
  let batch = []
  let length = 2
  for (const question of questions) {
    const { q, opts, correct, explain } = question
    const size = JSON.stringify({ q, opts, correct, explain }).length
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
  const prompt = question.q || ''
  const opts = question.opts || []
  const normalizedOptions = opts.map((option) => String(option).trim().replace(/\s+/g, ' ').toLocaleLowerCase())
  if (normalizedOptions.length !== 5 || new Set(normalizedOptions).size !== normalizedOptions.length) return false
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
