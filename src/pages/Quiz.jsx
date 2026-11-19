import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useSearchParams } from 'react-router-dom'
import { Brain, Sparkles, Loader2, CheckCircle2, XCircle, RotateCcw, Play, Target, Star } from 'lucide-react'
import { toggleFavorite, isFavorite, updateFavoriteAnswer } from '../lib/favorites.js'
import { recordResult, getDue } from '../lib/spaced.js'
import { recordStudy, recordAnswer, getProgress, getStreak, setDailyGoal, todayCount } from '../lib/progress.js'
import { askAI } from '../lib/ai.js'
import { safeImageUrl } from '../lib/safeUrl.js'
import { useToast } from '../components/Toast.jsx'

const DRAFT_KEY = 'studyhub_quiz_draft'
const MODE_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
}
function readDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    return Array.isArray(draft?.questions) && draft.questions.length ? draft : null
  } catch { return null }
}

function parseQuestions(text) {
  // Remove cercas de código markdown se houver
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  // Tenta extrair o array JSON
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1)
  const arr = JSON.parse(cleaned)
  if (!Array.isArray(arr)) throw new Error('Resposta não é um array')
  return arr
    .map((q, i) => {
      const opts = Array.isArray(q.opts) ? q.opts : Array.isArray(q.options) ? q.options : []
      const correct = Number.isInteger(q.correct) ? q.correct : q.answer
      if (!Number.isInteger(correct) || correct < 0 || correct >= opts.length) return null
      // Embaralha as alternativas para que a correta não fique sempre em "A"
      const order = opts.map((_, idx) => idx)
      for (let j = order.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1))
        ;[order[j], order[k]] = [order[k], order[j]]
      }
      const shuffledOpts = order.map((idx) => String(opts[idx]).trim())
      const newCorrect = order.indexOf(correct)
      return {
        id: i + 1,
        q: String(q.q || q.question || '').trim(),
        opts: shuffledOpts,
        correct: newCorrect,
        explain: String(q.explain || q.explanation || '').trim()
      }
    })
    .filter((q) => q && q.q && q.opts.length === 5)
}

export default function Quiz({ onOpenChat }) {
  const { subject } = useParams()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [mode, setMode] = React.useState('config') // config | loading | quiz | result
  const [topic, setTopic] = React.useState(searchParams.get('topic') || (subject && subject !== 'Matemática' ? subject : ''))
  const [discipline, setDiscipline] = React.useState(subject === 'Matemática' ? 'Matemática' : 'Não classificada')
  const [count, setCount] = React.useState(5)
  const [questions, setQuestions] = React.useState([])
  const [answers, setAnswers] = React.useState({})
  const [revealed, setRevealed] = React.useState({})
  const [current, setCurrent] = React.useState(0)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState('')
  const [loadingMsg, setLoadingMsg] = React.useState('')
  const [reviewing, setReviewing] = React.useState(false)
  const [explanations, setExplanations] = React.useState({})
  const [explaining, setExplaining] = React.useState({})
  const [progress, setProgress] = React.useState(getProgress)
  const [sessionId, setSessionId] = React.useState('')
  const [questionStartedAt, setQuestionStartedAt] = React.useState(Date.now)
  const [draft, setDraft] = React.useState(readDraft)
  const [, refreshFavorite] = React.useState(0)

  const questionContext = (item, selected) => `Questão: ${item.q}\nAlternativas: ${item.opts.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join(' | ')}\nResposta do aluno: ${selected === undefined ? 'não respondida' : `${String.fromCharCode(65 + selected)}) ${item.opts[selected]}`}\nGabarito: ${String.fromCharCode(65 + item.correct)}) ${item.opts[item.correct]}\nExplicação existente: ${item.explain || 'não fornecida'}`

  const explainError = async (item, selected = answers[item.id]) => {
    setExplaining((prev) => ({ ...prev, [item.id]: true }))
    try {
      const text = await askAI([
        { role: 'system', content: 'Você é tutor do ENEM. Explique em português por que a alternativa escolhida está errada e por que o gabarito está certo, com um exemplo breve. Não altere o gabarito informado.' },
        { role: 'user', content: questionContext(item, selected) }
      ])
      setExplanations((prev) => ({ ...prev, [item.id]: text }))
    } catch (e) {
      setExplanations((prev) => ({ ...prev, [item.id]: `Não foi possível consultar a IA: ${e.message}` }))
    } finally {
      setExplaining((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const generate = async () => {
    const t = topic.trim()
    if (!t) {
      setError('Informe um assunto.')
      return
    }
    setError('')
    setMode('loading')
    setLoadingMsg('Gerando questões com IA...')
    try {
      const messages = [
        {
          role: 'system',
          content:
            'Você é um gerador de questões de múltipla escolha no estilo ENEM. Responda APENAS com um array JSON válido, sem texto extra, sem markdown. Cada item: {"q":"enunciado","opts":["A","B","C","D","E"],"correct":0,"explain":"explicação curta"}. Gere questões claras, com 5 alternativas, nível ENEM.'
        },
        {
          role: 'user',
          content: `Gere ${count} questões de múltipla escolha (5 alternativas) sobre: ${t}. Retorne somente o JSON.`
        }
      ]

      const text = await askAI(messages, { temperature: 0.8, max_tokens: 3000 })
      const qs = parseQuestions(text)
      if (qs.length === 0) throw new Error('A IA não retornou questões válidas. Tente novamente.')
      toast('Questões geradas com sucesso!', 'success')
      setQuestions(qs)
      setSessionId(crypto.randomUUID())
      setReviewing(false)
      setExplanations({})
      setAnswers({})
      setRevealed({})
      setCurrent(0)
      setResult(null)
      setMode('quiz')
    } catch (e) {
      setError(e.message || 'Erro ao gerar questões.')
      toast(e.message || 'Erro ao gerar questões.', 'error')
      setMode('config')
    }
  }

  const handleAnswer = (qid, idx) => {
    if (revealed[qid]) return
    setAnswers((prev) => ({ ...prev, [qid]: idx }))
    setRevealed((prev) => ({ ...prev, [qid]: true }))
    const q = questions.find((x) => x.id === qid)
    if (q) {
      updateFavoriteAnswer(q.reviewId || `quiz-${sessionId}-${q.id}`, idx)
      recordResult({ id: q.reviewId || `quiz-${sessionId}-${q.id}`, topic: q.topic || topic, subject: q.subject || discipline, q: q.q, opts: q.opts, correct: q.correct, explain: q.explain, source: 'quiz' }, idx === q.correct)
      recordAnswer({ subject: q.subject || discipline, correct: idx === q.correct, source: 'prática', durationMs: Date.now() - questionStartedAt })
      setProgress(recordStudy())
      if (idx !== q.correct) explainError(q, idx)
    }
  }

  const finish = () => {
    const correctCount = questions.filter((q) => answers[q.id] === q.correct).length
    setResult({ correctCount, total: questions.length })
    setMode('result')
  }

  const reset = () => {
    setQuestions([])
    setAnswers({})
    setRevealed({})
    setCurrent(0)
    setResult(null)
    setReviewing(false)
    localStorage.removeItem(DRAFT_KEY)
    setDraft(null)
    setMode('config')
  }

  const q = questions[current]
  React.useEffect(() => { setQuestionStartedAt(Date.now()) }, [current, mode])
  React.useEffect(() => {
    if (mode !== 'quiz' || !questions.length) return
    const next = { questions, answers, revealed, current, topic, discipline, sessionId, reviewing }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); setDraft(next) } catch { /* rascunho opcional */ }
  }, [mode, questions, answers, revealed, current, topic, discipline, sessionId, reviewing])

  React.useEffect(() => {
    if (mode !== 'quiz' || !q) return
    const handler = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key >= '1' && e.key <= '5') {
        const idx = Number(e.key) - 1
        if (idx < q.opts.length) handleAnswer(q.id, idx)
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (current < questions.length - 1) setCurrent((c) => c + 1)
        else finish()
      } else if (e.key === 'ArrowLeft') {
        setCurrent((c) => Math.max(0, c - 1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, q, current, questions.length])

  return (
    <div className="pt-28 pb-24 max-w-3xl mx-auto px-6">
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs text-gray-600 dark:text-white/70 mb-4">
          <Target className="w-3 h-3 text-neon-cyan" /> Prática com IA
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Quiz <span className="text-gradient">gerado por IA</span>
        </h1>
        <p className="text-gray-600 dark:text-white/60 mt-3">
          Escolha o assunto e a IA cria questões de múltipla escolha no estilo ENEM.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'config' && (
          <motion.div key="config" {...MODE_MOTION} className="glass rounded-3xl p-8 space-y-6">
            <div>
              <label htmlFor="quiz-topic" className="block text-sm text-gray-600 dark:text-white/60 mb-2">Assunto</label>
              <input
                id="quiz-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Fotossíntese, Revolução Francesa, Equações do 2º grau..."
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none"
              />
            </div>
            <div>
              <label htmlFor="quiz-discipline" className="block text-sm text-gray-600 dark:text-white/60 mb-2">Matéria (para organizar favoritas)</label>
              <select id="quiz-discipline" value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="glass rounded-xl px-4 py-3 bg-transparent">
                {['Não classificada', 'Matemática', 'Linguagens', 'Ciências Humanas', 'Ciências da Natureza'].map((name) => <option key={name} value={name} className="bg-ink-900">{name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-white/60 mb-2">Quantidade de questões</label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
                  className="w-24 glass rounded-xl px-4 py-3 bg-transparent outline-none"
                />
                <div className="flex gap-2 flex-wrap">
                  {[3, 5, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className="px-3 py-2 rounded-xl text-xs glass hover:bg-white/10"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-4 space-y-2">
              <div className="font-semibold">Meta diária · {todayCount(progress)}/{progress.goal} questões · 🔥 {getStreak(progress)} dia(s)</div>
              <label className="text-sm">Questões por dia: <input aria-label="Meta diária" type="number" min="1" max="200" value={progress.goal} onChange={(e) => setProgress(setDailyGoal(e.target.value))} className="w-20 ml-2 glass rounded-lg px-2 py-1 bg-transparent" /></label>
              <div className="h-2 rounded-full bg-white/10"><div className="bar-smooth h-full rounded-full bg-neon-cyan" style={{ width: `${Math.min(100, todayCount(progress) / progress.goal * 100)}%` }} /></div>
              <p className="text-xs text-gray-500 dark:text-white/60">Progresso salvo neste navegador.</p>
            </div>
            {getDue().filter((item) => Array.isArray(item.opts)).length > 0 && (
              <div className="glass rounded-2xl p-4">
                <div className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  📚 Revisão espaçada: {getDue().filter((item) => Array.isArray(item.opts)).length} questão(ões) pendente(s)
                </div>
                <button
                  onClick={() => {
                    const due = getDue().filter((item) => Array.isArray(item.opts))
                    const qs = due.map((d, i) => ({
                      id: i + 1,
                      reviewId: d.id,
                      topic: d.topic,
                      subject: d.subject,
                      q: d.q,
                      opts: d.opts,
                      correct: d.correct,
                      explain: d.explain,
                      files: d.files,
                      altFiles: d.altFiles
                    }))
                    setQuestions(qs)
                    setReviewing(true)
                    setExplanations({})
                    setAnswers({})
                    setRevealed({})
                    setCurrent(0)
                    setResult(null)
                    setMode('quiz')
                    toast('Modo revisão iniciado!', 'info')
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950"
                >
                  Revisar agora
                </button>
              </div>
            )}
            {draft && (
              <div className="rounded-2xl border border-neon-violet/40 bg-neon-violet/10 p-4">
                <p className="font-semibold">Você tem um quiz em andamento</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-white/65">{Object.keys(draft.revealed || {}).length} de {draft.questions.length} questões respondidas.</p>
                <button onClick={() => {
                  setQuestions(draft.questions); setAnswers(draft.answers || {}); setRevealed(draft.revealed || {}); setCurrent(draft.current || 0)
                  setTopic(draft.topic || ''); setDiscipline(draft.discipline || 'Não classificada'); setSessionId(draft.sessionId || crypto.randomUUID()); setReviewing(Boolean(draft.reviewing)); setMode('quiz')
                }} className="mt-3 rounded-xl bg-neon-violet px-4 py-2 text-sm font-semibold text-white">Continuar quiz</button>
              </div>
            )}

            {error && <div className="text-rose-300 text-sm">{error}</div>}

            <button
              onClick={generate}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950"
            >
              <Sparkles className="w-4 h-4" /> Gerar questões
            </button>
          </motion.div>
        )}

        {mode === 'loading' && (
          <motion.div key="loading" {...MODE_MOTION} className="glass rounded-3xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-neon-cyan" />
            <p className="text-gray-600 dark:text-white/70">{loadingMsg}</p>
          </motion.div>
        )}

        {mode === 'quiz' && q && (
          <motion.div key={current} {...MODE_MOTION} className="glass rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs text-gray-500 dark:text-white/50">Questão {current + 1} de {questions.length}</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    toggleFavorite({ id: q.reviewId || `quiz-${sessionId}-${q.id}`, topic: q.topic || topic, subject: q.subject || discipline, q: q.q, opts: q.opts, correct: q.correct, explain: q.explain, source: 'quiz', files: q.files, altFiles: q.altFiles, userAnswer: answers[q.id] })
                    refreshFavorite((value) => value + 1)
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isFavorite(q.reviewId || `quiz-${sessionId}-${q.id}`) ? 'text-yellow-400' : 'text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white'}`}
                  title="Favoritar"
                  aria-label={isFavorite(q.reviewId || `quiz-${sessionId}-${q.id}`) ? 'Remover das favoritas' : 'Adicionar às favoritas'}
                >
                  <Star className="w-4 h-4" fill={isFavorite(q.reviewId || `quiz-${sessionId}-${q.id}`) ? 'currentColor' : 'none'} />
                </button>
                <div className="text-xs text-gray-500 dark:text-white/50">{Object.keys(revealed).length} respondidas</div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-6">
              <div className="bar-smooth h-full bg-gradient-to-r from-neon-cyan to-neon-violet" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>
            <div className="mb-6 flex flex-wrap gap-2" aria-label="Navegação das questões">
              {questions.map((item, index) => <button key={item.id} onClick={() => setCurrent(index)} aria-label={`Ir para questão ${index + 1}${revealed[item.id] ? ', respondida' : ''}`}
                className={`h-8 w-8 rounded-lg text-xs font-semibold ${index === current ? 'bg-neon-cyan text-ink-950' : revealed[item.id] ? 'bg-emerald-500/20 text-emerald-500' : 'glass hover:bg-white/10'}`}>{index + 1}</button>)}
            </div>

            <h3 className="font-display text-xl md:text-2xl font-bold mb-6 leading-snug">{q.q}</h3>
            {q.files?.map((file, i) => { const src = safeImageUrl(file); return src ? <img key={i} src={src} alt="Imagem da questão" className="max-w-full mb-4 rounded-xl" /> : null })}

            <div className="space-y-3 mb-6">
              {q.opts.map((opt, i) => {
                const selected = answers[q.id] === i
                const isCorrect = i === q.correct
                const show = revealed[q.id]
                let cls = 'glass hover:bg-white/10'
                if (show) {
                  if (isCorrect) cls = 'bg-emerald-500/20 border-emerald-400/60'
                  else if (selected) cls = 'bg-rose-500/20 border-rose-400/60'
                  else cls = 'glass opacity-50'
                } else if (selected) {
                  cls = 'bg-neon-cyan/20 border-neon-cyan/60'
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(q.id, i)}
                    disabled={!!show}
                    className={`w-full text-left px-5 py-4 rounded-2xl border transition-colors disabled:cursor-default ${cls}`}
                  >
                    <span className="inline-flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                        <span className="text-sm">{opt}</span>
                        {safeImageUrl(q.altFiles?.[i]) && <img src={safeImageUrl(q.altFiles[i])} alt="Imagem da alternativa" className="max-w-full" />}
                    </span>
                  </button>
                )
              })}
            </div>

            <AnimatePresence>
              {revealed[q.id] && (
                <motion.div
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-5 border mb-6 ${
                    answers[q.id] === q.correct
                      ? 'bg-emerald-500/15 border-emerald-400/40'
                      : 'bg-rose-500/15 border-rose-400/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {answers[q.id] === q.correct ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span className="font-display font-bold">
                      {answers[q.id] === q.correct ? 'Correto!' : 'Resposta incorreta'}
                    </span>
                  </div>
                  {q.explain && <p className="text-gray-700 dark:text-white/80 text-sm">{q.explain}</p>}
                   {answers[q.id] !== q.correct && (
                    <p className="text-gray-600 dark:text-white/70 text-sm mt-2">
                      Gabarito: <span className="font-bold text-neon-cyan">{String.fromCharCode(65 + q.correct)}</span>
                    </p>
                   )}
                    {answers[q.id] !== q.correct && <p className="text-sm mt-3 whitespace-pre-line">{explaining[q.id] ? 'IA explicando seu erro…' : explanations[q.id] || <button onClick={() => explainError(q)} className="text-neon-cyan">Gerar explicação personalizada</button>}</p>}
                    <button onClick={() => onOpenChat?.(questionContext(q, answers[q.id]))} className="mt-3 block text-xs text-neon-cyan hover:underline">Perguntar ao tutor sobre esta questão</button>
                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Definir intervalo de revisão">
                      <span className="w-full text-xs text-gray-500 dark:text-white/60">Como foi para lembrar?</span>
                      {[['again', 'Não lembrei'], ['hard', 'Difícil'], ['good', 'Bom'], ['easy', 'Fácil']].map(([rating, label]) => <button key={rating} onClick={() => {
                        recordResult({ id: q.reviewId || `quiz-${sessionId}-${q.id}`, topic: q.topic || topic, subject: q.subject || discipline, q: q.q, opts: q.opts, correct: q.correct, explain: q.explain, source: 'quiz' }, answers[q.id] === q.correct, rating)
                        toast(`Revisão ajustada: ${label.toLowerCase()}.`, 'success')
                      }} className="rounded-lg glass px-3 py-1.5 text-xs hover:border-neon-cyan/60">{label}</button>)}
                    </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="px-5 py-2.5 rounded-xl glass hover:bg-white/10 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              {current < questions.length - 1 ? (
                <button
                  onClick={() => setCurrent((c) => c + 1)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950 font-semibold text-sm"
                >
                  Próxima →
                </button>
              ) : (
                <button
                  onClick={finish}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950 font-semibold text-sm"
                >
                  Finalizar
                </button>
              )}
            </div>
          </motion.div>
        )}

        {mode === 'result' && result && (
          <motion.div key="result" {...MODE_MOTION} className="space-y-6">
            <div className="glass rounded-3xl p-8 text-center">
              <div className="font-display text-6xl font-bold text-gradient mb-2">
                {result.correctCount}/{result.total}
              </div>
              <p className="text-gray-600 dark:text-white/60 mb-2">Acertos</p>
              <p className="text-sm text-gray-500 dark:text-white/50">
                {Math.round((result.correctCount / result.total) * 100)}% de aproveitamento
              </p>
            </div>
            <div className="print-only">
              <h2>Questões e respostas</h2>
              {questions.map((item, index) => <div key={item.id} className="print-question">
                <strong>{index + 1}. {item.q}</strong>
                {item.opts.map((option, i) => <p key={i}>{String.fromCharCode(65 + i)}) {option}</p>)}
                <p>Sua resposta: {answers[item.id] === undefined ? 'Em branco' : String.fromCharCode(65 + answers[item.id])} · Gabarito: {String.fromCharCode(65 + item.correct)}</p>
                <p>{explanations[item.id] || item.explain}</p>
              </div>)}
            </div>

            {questions.filter((q) => answers[q.id] !== q.correct).length > 0 && (
              <div className="glass rounded-3xl p-8">
                <h3 className="font-display text-xl font-bold mb-4">Revisar erros {reviewing ? 'da revisão' : ''}</h3>
                <div className="space-y-4 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
                  {questions
                    .filter((q) => answers[q.id] !== q.correct)
                    .map((q) => (
                      <div key={q.id} className="p-4 rounded-xl bg-white/5 dark:bg-white/5">
                        <div className="text-sm font-medium mb-2 text-gray-900 dark:text-white">{q.q}</div>
                        <div className="text-xs text-gray-600 dark:text-white/60 mb-1">
                          Sua resposta: {answers[q.id] !== undefined ? String.fromCharCode(65 + answers[q.id]) : '—'} · Gabarito: {String.fromCharCode(65 + q.correct)}
                        </div>
                         {q.explain && <p className="text-gray-700 dark:text-white/70 text-sm mt-2">{q.explain}</p>}
                         {explanations[q.id] && <p className="text-sm whitespace-pre-line mt-2">{explanations[q.id]}</p>}
                <button
                  onClick={() => onOpenChat?.(questionContext(q, answers[q.id]))}
                  className="mt-3 inline-flex items-center gap-2 text-xs text-neon-cyan hover:underline"
                >
                  💬 Perguntar ao tutor sobre esta questão
                </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 flex-wrap">
              <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold glass hover:bg-white/10">
                <RotateCcw className="w-4 h-4" /> Novo quiz
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950 no-print">
                Salvar como PDF
              </button>
              <button
                onClick={() => { reset(); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950"
              >
                <Sparkles className="w-4 h-4" /> Outro assunto
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
