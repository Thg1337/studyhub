import { stripRenderedExamImages } from './examStorage.js'
import { restoreQuizDraft, validateQuestion } from './quizValidation.js'
import { getAll, getDue } from './spaced.js'

export const DRAFT_KEY = 'studyhub_quiz_draft'

export function readQuizDraft() {
  try {
    return restoreQuizDraft(JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'))
  } catch {
    return null
  }
}

export const reviewQuestions = () => getDue().filter(validateQuestion)
export const missedQuestions = () => getAll().filter((item) => item?.lastResult === false && validateQuestion(item))

const topicsBySubject = {
  Matemática: [
    { name: 'Porcentagem e proporcionalidade', offset: 135, indices: [147, 161, 164, 167, 173] },
    { name: 'Geometria', offset: 135, indices: [136, 145, 155, 165, 172] },
    { name: 'Probabilidade e estatística', offset: 135, indices: [137, 138, 140, 141, 157] },
    { name: 'Funções', offset: 135, indices: [151, 158, 159, 162, 170] }
  ],
  Geografia: [
    { name: 'Geopolítica e blocos econômicos', offset: 45, indices: [49, 51, 62, 85] },
    { name: 'Solos e uso da terra', offset: 45, indices: [48, 67, 71, 78, 83] },
    { name: 'Clima e impactos ambientais', offset: 45, indices: [64, 89] }
  ],
  História: [
    { name: 'História do Brasil', offset: 45, indices: [47, 50, 63, 77, 82, 84] },
    { name: 'Ditadura militar no Brasil', offset: 45, indices: [70, 80] },
    { name: 'História geral e formação dos Estados', offset: 45, indices: [59, 73, 74, 86] }
  ],
  Português: [
    { name: 'Interpretação de texto', offset: 0, indices: [9, 10, 11, 24, 45] },
    { name: 'Variação linguística e linguagem', offset: 0, indices: [8, 16, 20, 21, 22, 25] },
    { name: 'Literatura e recursos expressivos', offset: 0, indices: [7, 12, 13, 14, 18, 26] }
  ],
  Física: [
    { name: 'Mecânica: movimento e forças', offset: 95, indices: [100, 109, 124] },
    { name: 'Ondas e eletricidade', offset: 95, indices: [108, 111, 112, 113, 120, 128, 135] },
    { name: 'Termologia', sources: [
      { year: 2023, offset: 95, indices: [122] },
      { year: 2022, offset: 88, indices: [115] }
    ] }
  ],
  Química: [
    { name: 'Química orgânica', offset: 95, indices: [97, 102, 118, 123, 126] },
    { name: 'Soluções e cálculos químicos', offset: 90, indices: [94, 96, 110] },
    { name: 'Ligações e propriedades da matéria', offset: 95, indices: [121, 131] }
  ],
  Biologia: [
    { name: 'Ecologia', offset: 90, indices: [91, 115, 116, 119, 133] },
    { name: 'Genética e biotecnologia', offset: 90, indices: [106, 125, 134] },
    { name: 'Fisiologia e metabolismo', offset: 90, indices: [95, 98, 101, 105, 107, 127] }
  ]
}
export const studySubjects = Object.keys(topicsBySubject)
export const topicsForSubject = (subject) => {
  if (!studySubjects.includes(subject)) return []
  return topicsBySubject[subject].map((topic) => {
    const sources = topic.sources || [{ year: 2023, offset: topic.offset, indices: topic.indices }]
    return { name: topic.name, subject, sources, count: sources.reduce((total, source) => total + source.indices.length, 0) }
  })
}

async function loadQuestionGroup(topic, { year, offset, indices }) {
  const response = await fetch(`https://api.enem.dev/v1/exams/${year}/questions?limit=50&offset=${offset}`)
  if (!response.ok) throw new Error('Não foi possível buscar as questões do ENEM. Tente novamente.')
  const { questions } = await response.json()
  const items = indices.map((index) => {
    // A curadoria usa os números do caderno. O banco tem itens com área divergente.
    const item = questions?.find((question) => question.index === index && !question.language)
    if (!Array.isArray(item?.alternatives) || item.alternatives.filter((option) => option.isCorrect === true).length !== 1) return null
    const files = item.files || []
    return {
      id: `sim-${year}-${index}`,
      year,
      topic: topic.name,
      subject: topic.subject,
      source: 'simulado',
      q: stripRenderedExamImages([item.context, item.alternativesIntroduction].filter(Boolean).join('\n\n'), files),
      files,
      altFiles: item.alternatives.map((option) => option.file),
      opts: item.alternatives.map((option) => option.text?.trim() || '(imagem)'),
      correct: item.alternatives.findIndex((option) => option.isCorrect === true)
    }
  })
  if (items.some((item) => !validateQuestion(item))) throw new Error('O banco do ENEM não retornou todas as questões deste treino. Tente novamente.')
  return items
}

export async function loadTopicQuestions(topic) {
  const groups = await Promise.all(topic.sources.map((source) => loadQuestionGroup(topic, source)))
  return groups.flat()
}
