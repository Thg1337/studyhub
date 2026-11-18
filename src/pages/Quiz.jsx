import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { Brain, Sparkles, Loader2, CheckCircle2, XCircle, RotateCcw, Play, Target } from 'lucide-react'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-20b'

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
      const correct = Number.isInteger(q.correct) ? q.correct : (typeof q.answer === 'number' ? q.answer : 0)
      return {
        id: i + 1,
        q: String(q.q || q.question || '').trim(),
        opts: opts.map((o) => String(o).trim()),
        correct: Math.max(0, Math.min(opts.length - 1, correct)),
        explain: String(q.explain || q.explanation || '').trim()
      }
    })
    .filter((q) => q.q && q.opts.length >= 2)
}

export default function Quiz() {
  const { subject } = useParams()
  const [mode, setMode] = React.useState('config') // config | loading | quiz | result
  const [topic, setTopic] = React.useState(subject && subject !== 'Matemática' ? subject : '')
  const [count, setCount] = React.useState(5)
  const [questions, setQuestions] = React.useState([])
  const [answers, setAnswers] = React.useState({})
  const [revealed, setRevealed] = React.useState({})
  const [current, setCurrent] = React.useState(0)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState('')
  const [loadingMsg, setLoadingMsg] = React.useState('')

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
      const clientKey = import.meta.env.VITE_GROQ_API_KEY
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

      let res
      if (clientKey) {
        res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientKey}` },
          body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.8, max_tokens: 2000 })
        })
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, temperature: 0.8, max_tokens: 2000 })
        })
      }

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`${res.status} ${res.statusText} — ${txt.slice(0, 150)}`)
      }
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content || ''
      const qs = parseQuestions(text)
      if (qs.length === 0) throw new Error('A IA não retornou questões válidas. Tente novamente.')
      setQuestions(qs)
      setAnswers({})
      setRevealed({})
      setCurrent(0)
      setResult(null)
      setMode('quiz')
    } catch (e) {
      setError(e.message || 'Erro ao gerar questões.')
      setMode('config')
    }
  }

  const handleAnswer = (qid, idx) => {
    if (revealed[qid]) return
    setAnswers((prev) => ({ ...prev, [qid]: idx }))
    setRevealed((prev) => ({ ...prev, [qid]: true }))
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
    setMode('config')
  }

  const q = questions[current]

  return (
    <div className="pt-28 pb-24 max-w-3xl mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs text-white/70 mb-4">
          <Target className="w-3 h-3 text-neon-cyan" /> Prática com IA
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Quiz <span className="text-gradient">gerado por IA</span>
        </h1>
        <p className="text-white/60 mt-3">
          Escolha o assunto e a IA cria questões de múltipla escolha no estilo ENEM.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'config' && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-8 space-y-6">
            <div>
              <label className="block text-sm text-white/60 mb-2">Assunto</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Fotossíntese, Revolução Francesa, Equações do 2º grau..."
                className="w-full glass rounded-xl px-4 py-3 bg-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Quantidade de questões</label>
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
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-neon-cyan" />
            <p className="text-white/70">{loadingMsg}</p>
          </motion.div>
        )}

        {mode === 'quiz' && q && (
          <motion.div key={current} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="glass rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs text-white/50">Questão {current + 1} de {questions.length}</div>
              <div className="text-xs text-white/50">{Object.keys(revealed).length} respondidas</div>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-6">
              <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-violet" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>

            <h3 className="font-display text-xl md:text-2xl font-bold mb-6 leading-snug">{q.q}</h3>

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
                    </span>
                  </button>
                )
              })}
            </div>

            <AnimatePresence>
              {revealed[q.id] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
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
                  {q.explain && <p className="text-white/80 text-sm">{q.explain}</p>}
                  {answers[q.id] !== q.correct && (
                    <p className="text-white/70 text-sm mt-2">
                      Gabarito: <span className="font-bold text-neon-cyan">{String.fromCharCode(65 + q.correct)}</span>
                    </p>
                  )}
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
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="glass rounded-3xl p-8 text-center">
              <div className="font-display text-6xl font-bold text-gradient mb-2">
                {result.correctCount}/{result.total}
              </div>
              <p className="text-white/60 mb-2">Acertos</p>
              <p className="text-sm text-white/50">
                {Math.round((result.correctCount / result.total) * 100)}% de aproveitamento
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold glass hover:bg-white/10">
                <RotateCcw className="w-4 h-4" /> Novo quiz
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