import { askAI } from './ai.js'
import { batchQuestionsForReview, distinctQuestions, questionForReview, validateQuestion } from './quizValidation.js'

const GENERATOR_PROMPT = 'Crie questões de múltipla escolha no estilo ENEM sobre o assunto fornecido. Retorne somente um array JSON no formato [{"q":"enunciado","opts":["A","B","C","D","E"],"correct":0}]. Inclua todos os dados necessários, cinco alternativas de conteúdo distinto e uma única resposta correta (índice de 0 a 4). Varie habilidades, cenários e exemplos. Se o tema for um par de palavras, faça no máximo uma pergunta que peça diretamente a distinção e varie as outras com frases para completar, análise de usos e correção de exemplos. Evite repetir questões já aceitas. Use fórmulas entre $...$ e não use tabelas.'
const REVIEWER_PROMPT = 'Resolva cada questão com base apenas no enunciado e nas alternativas. Recuse questões com erro factual, dados ausentes, alternativas equivalentes ou mais de uma resposta defensável. Em questões de língua, confira se a regra e seu alcance estão corretos, inclusive quando a palavra tem mais de uma função. Retorne somente um array JSON com itens {"index":0,"correct":0,"explain":"justificativa curta"} para as questões confiáveis. index é a posição da questão no lote, correct é a posição da alternativa, ambos a partir de zero. Na justificativa, use o conteúdo da alternativa sem citar letras ou posições. Omita as questões que não puder confirmar.'

function readArray(text) {
  try {
    const value = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''))
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function parseCandidates(text) {
  return readArray(text).map((item) => {
    const q = item?.q ?? item?.question
    const opts = item?.opts ?? item?.options
    const correct = item?.correct ?? item?.answer
    return { q, opts, correct }
  }).filter(validateQuestion).map(({ q, opts, correct }) => ({
    q: q.trim(),
    opts: opts.map((option) => option.trim()),
    correct
  }))
}

function shuffleOptions(question, index) {
  const order = question.opts.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return { ...question, id: index + 1, opts: order.map((i) => question.opts[i]), correct: order.indexOf(question.correct) }
}

export async function generateVerifiedQuiz(topic, count, onStatus) {
  const accepted = []
  let requestLimit = count
  // Duas rodadas no máximo para repor descartes sem gastar a cota indefinidamente.
  for (let attempt = 0; attempt < 2 && accepted.length < count; attempt++) {
    try {
      onStatus(attempt ? 'Gerando questões para completar o quiz...' : 'Gerando questões com IA...')
      const text = await askAI([
        { role: 'system', content: GENERATOR_PROMPT },
        { role: 'user', content: JSON.stringify({
          assunto: topic,
          quantidade: Math.min(requestLimit, count - accepted.length),
          enunciadosJaAceitos: accepted.map(({ q }) => q.slice(0, 120))
        }) }
      ], { temperature: 0.6, max_tokens: Math.min(3000, 1200 + (count - accepted.length) * 160), format: 'json' })
      const candidates = distinctQuestions([...accepted, ...parseCandidates(text)]).slice(accepted.length, count)
      if (!candidates.length) continue

      onStatus('Conferindo gabaritos e enunciados...')
      for (const batch of batchQuestionsForReview(candidates)) {
        const audit = await askAI([
          { role: 'system', content: REVIEWER_PROMPT },
          { role: 'user', content: JSON.stringify(batch.map(questionForReview)) }
        ], { temperature: 0, max_tokens: 1600, format: 'json' })
        // Se a revisão der dois pareceres para a mesma questão, descarte-a.
        const reviews = readArray(audit)
        for (const [index, question] of batch.entries()) {
          const matches = reviews.filter((item) => item?.index === index)
          if (matches.length !== 1) continue
          const { correct, explain } = matches[0]
          if (correct !== question.correct || typeof explain !== 'string' || !explain.trim()) continue
          const verified = { ...question, explain: explain.trim() }
          if (validateQuestion(verified)) accepted.push(verified)
        }
      }
    } catch (error) {
      if (error.code === 'response_truncated' && attempt === 0) {
        requestLimit = Math.max(1, Math.floor((count - accepted.length) / 2))
        continue
      }
      if (!accepted.length) throw error
      break
    }
  }
  if (!accepted.length) throw new Error('Não foi possível confirmar o gabarito de nenhuma questão. Tente gerar outro quiz.')
  return accepted.map(shuffleOptions)
}
