const number = (value) => {
  const text = String(value)
  return Number(text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(?:\.\d{3})+$/.test(text) ? text.replace(/\./g, '') : text)
}
const numericOption = (value) => {
  const match = String(value).match(/^\s*([\d.,]+)\s*(?:m[³3]|metros? c[uú]bicos?)?\s*$/i)
  return match ? number(match[1]) : null
}

// Confere contas simples sem depender do mesmo modelo que escreveu o gabarito.
export function validateQuestion(question) {
  const prompt = question.q || ''
  const opts = question.opts || []
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
  const statedResult = String(question.explain || '').match(/(?:resposta|resultado)\s*(?:é|:)\s*([\d.,]+)\s*(?:m[³3]|metros? c[uú]bicos?)?/i)
  return matches.filter(Boolean).length === 1 && matches[question.correct] === true &&
    (!statedResult || Math.abs(number(statedResult[1]) - expected) < 1e-9)
}
