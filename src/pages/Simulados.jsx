import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, BookOpen, Target, Brain, CheckCircle2, XCircle, RotateCcw, Play, Loader2, Globe, Image as ImageIcon, Timer, History, Shuffle, Star } from 'lucide-react'
import { toggleFavorite, isFavorite, getFavorites, removeFavorite } from '../lib/favorites.js'

const API_BASE = 'https://api.enem.dev/v1'
const TIME_PER_QUESTION = 180

function seededRand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
function triParams(index) {
  return {
    a: 1.0 + seededRand(index * 3 + 1) * 1.0,
    b: seededRand(index * 7 + 2) * 4 - 2,
    c: 0.1 + seededRand(index * 11 + 3) * 0.15
  }
}

function triScore(responses) {
  const allCorrect = responses.every((r) => r.correct)
  const allIncorrect = responses.every((r) => !r.correct)
  if (allCorrect) return 1000
  if (allIncorrect) return 0
  let theta = 0
  for (let iter = 0; iter < 60; iter++) {
    let num = 0
    let info = 0
    for (const r of responses) {
      const e = Math.exp(-r.a * (theta - r.b))
      const P = r.c + (1 - r.c) / (1 + e)
      const dP = (r.a * (P - r.c) * (1 - P)) / (1 - r.c)
      const u = r.correct ? 1 : 0
      const denom = P * (1 - P)
      if (denom <= 0) continue
      num += (dP * (u - P)) / denom
      info += (dP * dP) / denom
    }
    if (info <= 0) break
    const delta = num / info
    theta += delta
    if (theta > 4) theta = 4
    if (theta < -4) theta = -4
    if (Math.abs(delta) < 1e-8) break
  }
  const score = 500 + 100 * theta
  return Math.round(Math.max(0, Math.min(1000, score)))
}

const AREA_LABEL = {
  'ciencias-humanas': 'Ciências Humanas',
  'ciencias-natureza': 'Ciências da Natureza',
  'linguagens': 'Linguagens',
  'matematica': 'Matemática'
}
const DISCIPLINES = ['ciencias-humanas', 'ciencias-natureza', 'linguagens', 'matematica']
const ALL_YEARS = Array.from({ length: 2023 - 2009 + 1 }, (_, i) => String(2023 - i))

function cacheKey(year) { return `enem_questions_${year}` }
function readCache(year) {
  try {
    const raw = localStorage.getItem(cacheKey(year))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed
  } catch { return null }
}
function writeCache(year, data) {
  try { localStorage.setItem(cacheKey(year), JSON.stringify(data)) } catch {}
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function readHistory() {
  try {
    const raw = localStorage.getItem('enem_history')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function writeHistory(entry) {
  try {
    const h = readHistory()
    h.unshift(entry)
    localStorage.setItem('enem_history', JSON.stringify(h.slice(0, 20)))
  } catch {}
}

export default function Simulados() {
  const [mode, setMode] = React.useState('intro')
  const [language, setLanguage] = React.useState('ingles')
  const [mixYears, setMixYears] = React.useState(true)
  const [selectedYear, setSelectedYear] = React.useState('2023')
  const [showOnlyWrong, setShowOnlyWrong] = React.useState(false)
  const [selectedDisciplines, setSelectedDisciplines] = React.useState([...DISCIPLINES])
  const [quantity, setQuantity] = React.useState(20)
  const [shuffleOn, setShuffleOn] = React.useState(true)
  const [timerOn, setTimerOn] = React.useState(true)
  const [questions, setQuestions] = React.useState([])
  const [answers, setAnswers] = React.useState({})
  const [current, setCurrent] = React.useState(0)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState('')
  const [loadingMsg, setLoadingMsg] = React.useState('')
  const [timeLeft, setTimeLeft] = React.useState(TIME_PER_QUESTION)
  const [timerActive, setTimerActive] = React.useState(false)
  const [history, setHistory] = React.useState(readHistory())
  const [yearsUsed, setYearsUsed] = React.useState([])

  const toggleDiscipline = (d) => {
    setSelectedDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  // Timer por questão
  React.useEffect(() => {
    if (mode !== 'exam' || !timerActive || !timerOn) return
    if (timeLeft <= 0) {
      if (current < questions.length - 1) setCurrent((c) => c + 1)
      else finish()
      return
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [mode, timerActive, timerOn, timeLeft, current, questions.length])

  React.useEffect(() => {
    if (mode === 'exam') setTimeLeft(TIME_PER_QUESTION)
  }, [current, mode])

  const fetchExam = async () => {
    if (selectedDisciplines.length === 0) {
      setError('Selecione ao menos uma disciplina.')
      return
    }
    setError('')
    setMode('loading')
    setLoadingMsg('Buscando questões de vários anos do ENEM...')
    try {
      // Seleciona 2 anos aleatórios para misturar (evita rate limit da API)
      const shuffledYears = mixYears ? shuffle(ALL_YEARS).slice(0, 2) : [selectedYear]
      setYearsUsed(shuffledYears)
      let all = []
      for (const y of shuffledYears) {
        let cached = readCache(y)
        if (!cached) {
          cached = []
          let offset = 0
          const limit = 50
          while (true) {
            const url = `${API_BASE}/exams/${y}/questions?limit=${limit}&offset=${offset}`
            let res = null
            for (let attempt = 0; attempt < 5; attempt++) {
              res = await fetch(url)
              if (res.status === 429) {
                await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
                continue
              }
              break
            }
            if (!res || !res.ok) throw new Error(`Erro ${res?.status} ao buscar questões (${y})`)
            const data = await res.json()
            cached = cached.concat(data.questions || [])
            if (!data.metadata?.hasMore) break
            offset += limit
            await new Promise((r) => setTimeout(r, 250))
          }
          writeCache(y, cached)
        }
        all = all.concat(cached)
        await new Promise((r) => setTimeout(r, 400))
      }

      // Filtra por idioma das questões de Linguagens
      let filtered = all.filter((q) => {
        if (q.discipline !== 'linguagens') return true
        if (q.language === null) return true
        return q.language === language
      })

      // Filtra por disciplinas selecionadas
      filtered = filtered.filter((q) => selectedDisciplines.includes(q.discipline))

      if (filtered.length === 0) throw new Error('Nenhuma questão encontrada para os filtros selecionados.')

      if (shuffleOn) filtered = shuffle(filtered)

      const qty = Math.min(Math.max(1, quantity), filtered.length)
      filtered = filtered.slice(0, qty)

      const mapped = filtered.map((q, idx) => {
        const params = triParams(idx)
        const correctIdx = q.alternatives.findIndex((a) => a.isCorrect)
        const opts = q.alternatives.map((a) => a.text || '(imagem)')
        const stem = [q.context, q.alternativesIntroduction].filter(Boolean).join('\n\n')
        return {
          id: q.index,
          year: q.year,
          discipline: q.discipline,
          area: AREA_LABEL[q.discipline] || q.discipline,
          subject: q.discipline,
          language: q.language,
          title: q.title,
          q: stem,
          files: q.files || [],
          altFiles: q.alternatives.map((a) => a.file),
          opts,
          correct: correctIdx >= 0 ? correctIdx : 0,
          ...params
        }
      })

      setQuestions(mapped)
      setAnswers({})
      setCurrent(0)
      setResult(null)
      setTimerActive(timerOn)
      setMode('exam')
    } catch (e) {
      setError(e.message || 'Erro ao carregar a prova.')
      setMode('config')
    }
  }

  const handleAnswer = (qid, idx) => {
    setAnswers((prev) => ({ ...prev, [qid]: idx }))
  }

  const finish = React.useCallback(() => {
    setTimerActive(false)
    const responses = questions.map((q) => ({
      ...q,
      correctIndex: q.correct,
      correct: answers[q.id] === q.correct
    }))
    const overall = triScore(responses)
    const areaNames = [...new Set(questions.map((q) => q.area))]
    const areas = {}
    for (const area of areaNames) {
      areas[area] = triScore(responses.filter((r) => r.area === area))
    }
    const correctCount = responses.filter((r) => r.correct).length
    const entry = {
      date: new Date().toLocaleString('pt-BR'),
      year: `Mix (${yearsUsed.join(', ')})`,
      overall,
      correctCount,
      total: responses.length,
      disciplines: selectedDisciplines
    }
    writeHistory(entry)
    setHistory(readHistory())
    setResult({ overall, areas, correctCount, total: responses.length, responses })
    setMode('result')
  }, [questions, answers, yearsUsed, selectedDisciplines])

  const reset = () => {
    setQuestions([])
    setAnswers({})
    setCurrent(0)
    setResult(null)
    setTimerActive(false)
    setMode('intro')
  }

  const q = questions[current]
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="pt-28 pb-24 max-w-6xl mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs text-gray-600 dark:text-white/70 mb-4">
          <ClipboardList className="w-3 h-3 text-neon-cyan" /> Simulados ENEM
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Simulados com correção por <span className="text-gradient">TRI</span>
        </h1>
        <p className="text-gray-600 dark:text-white/60 mt-3 max-w-2xl">
          Questões reais do ENEM (2009–2023) misturadas de vários anos, corrigidas pela Teoria de Resposta ao Item.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="glass rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="w-6 h-6 text-neon-cyan" />
                <h2 className="font-display text-2xl font-bold">O que é a TRI?</h2>
              </div>
              <div className="space-y-6 text-gray-700 dark:text-white/80 leading-relaxed">
                <div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-neon-cyan">1. TRI vs. Sistema Tradicional</h3>
                  <p>No sistema tradicional (Teoria Clássica dos Testes), a nota é baseada apenas no número de acertos absoluto. Na TRI, o foco não é apenas quantas questões o candidato acertou, mas <strong>quais</strong> questões ele acertou. O objetivo é medir a "proficiência" real do aluno.</p>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-neon-violet">2. Os Três Parâmetros das Questões (Itens)</h3>
                  <ul className="space-y-2 list-disc list-inside text-gray-600 dark:text-white/70">
                    <li><strong className="text-gray-900 dark:text-white">Parâmetro A (Discriminação):</strong> o poder da questão de diferenciar alunos que dominam o assunto dos que não dominam.</li>
                    <li><strong className="text-gray-900 dark:text-white">Parâmetro B (Dificuldade):</strong> o nível de proficiência exigido para que o candidato tenha 50% de chance de acertar a questão (define se a questão é fácil, média ou difícil).</li>
                    <li><strong className="text-gray-900 dark:text-white">Parâmetro C (Acerto ao Acaso / Chute):</strong> a probabilidade de um aluno sem a proficiência necessária acertar a questão simplesmente "chutando".</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-neon-pink">3. O Mecanismo de Coerência Pedagógica (Anti-chute)</h3>
                  <p className="text-gray-600 dark:text-white/70 mb-3">O algoritmo analisa o padrão de respostas:</p>
                  <ul className="space-y-2 list-disc list-inside text-gray-600 dark:text-white/70">
                    <li><strong className="text-gray-900 dark:text-white">Cenário de Coerência:</strong> se um aluno acerta as questões fáceis, médias e algumas difíceis, o sistema entende que ele tem conhecimento sólido. Sua nota é maximizada.</li>
                    <li><strong className="text-gray-900 dark:text-white">Cenário de Incoerência (Chute):</strong> se o aluno erra a maioria das questões fáceis, mas acerta questões dificílimas, o algoritmo identifica uma quebra de coerência. Ele entende que houve "chute" nas difíceis e atribui um peso muito menor a esses acertos.</li>
                  </ul>
                  <p className="mt-3 text-gray-800 dark:text-white/90 font-medium">Conclusão prática: dois candidatos com o exato mesmo número de acertos em uma prova (ex: 60 de 90) podem ter notas finais completamente diferentes.</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-8">
              <h2 className="font-display text-2xl font-bold mb-4">Iniciar simulado</h2>
              <p className="text-gray-600 dark:text-white/60 text-sm mb-6">As questões são sorteadas de vários anos (2009–2023) e misturadas, com filtros por disciplina, idioma e quantidade.</p>
              <button
                onClick={() => setMode('config')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950"
              >
                <Play className="w-4 h-4" /> Escolher prova
              </button>
            </div>

            {history.length > 0 && (
              <div className="glass rounded-3xl p-8">
                <h2 className="font-display text-xl font-bold mb-4">Evolução das notas</h2>
                <div className="flex items-end gap-2 h-32">
                  {history.slice(0, 10).reverse().map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-neon-cyan to-neon-violet rounded-t-lg transition-all"
                        style={{ height: `${Math.max(4, (h.overall / 1000) * 100)}%` }}
                        title={`${h.overall}`}
                      />
                      <span className="text-[9px] text-gray-500 dark:text-white/40">{h.overall}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-white/50 mt-3">Últimas {Math.min(10, history.length)} tentativas (mais recente à direita)</p>
              </div>
            )}

            {getFavorites().length > 0 && (
              <div className="glass rounded-3xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <h2 className="font-display text-xl font-bold">Questões favoritas ({getFavorites().length})</h2>
                </div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin pr-1">
                  {getFavorites().map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 dark:bg-white/5 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-gray-900 dark:text-white">{f.q?.slice(0, 60) || f.id}</div>
                        <div className="text-xs text-gray-500 dark:text-white/50">{f.source === 'quiz' ? 'Quiz' : 'Simulado'} · {f.year || f.topic || ''}</div>
                      </div>
                      <button
                        onClick={() => removeFavorite(f.id)}
                        className="text-gray-400 dark:text-white/40 hover:text-rose-400 text-xs ml-2"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="glass rounded-3xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-neon-cyan" />
                  <h2 className="font-display text-xl font-bold">Histórico de tentativas</h2>
                </div>
                <div className="space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-sm">
                      <div>
                        <div className="font-medium">{h.year} · {h.total} questões</div>
                        <div className="text-xs text-gray-500 dark:text-white/50">{h.date} · {h.disciplines.join(', ')}</div>
                      </div>
                      <div className="font-display font-bold text-neon-cyan">{h.overall}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'config' && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-8 space-y-6">
            <h2 className="font-display text-2xl font-bold">Configurar simulado</h2>

            <div>
              <label className="block text-sm text-gray-600 dark:text-white/60 mb-2">Idioma (questões de Linguagens)</label>
              <div className="flex gap-3">
                {['ingles', 'espanhol'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      language === lang ? 'bg-neon-cyan/20 border border-neon-cyan/60' : 'glass hover:bg-white/10'
                    }`}
                  >
                    {lang === 'ingles' ? 'Inglês' : 'Espanhol'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-white/60 mb-2">Anos das questões</label>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setMixYears((s) => !s)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    mixYears ? 'bg-neon-violet/20 border border-neon-violet/60' : 'glass hover:bg-white/10 dark:hover:bg-white/10'
                  }`}
                >
                  <Shuffle className="w-4 h-4" /> Misturar anos: {mixYears ? 'Sim' : 'Não'}
                </button>
                {!mixYears && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="glass rounded-xl px-4 py-3 bg-transparent outline-none"
                  >
                    {ALL_YEARS.map((y) => <option key={y} value={y} className="bg-ink-900 dark:bg-ink-900">{y}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-white/60 mb-2">Disciplinas</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {DISCIPLINES.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDiscipline(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium text-left transition-colors ${
                      selectedDisciplines.includes(d) ? 'bg-neon-cyan/20 border border-neon-cyan/60' : 'glass hover:bg-white/10'
                    }`}
                  >
                    {AREA_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-white/60 mb-2">Quantidade de questões (máx. depende dos filtros; prova completa ≈ 180)</label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  className="w-28 glass rounded-xl px-4 py-3 bg-transparent outline-none"
                />
                <div className="flex gap-2 flex-wrap">
                  {[10, 20, 30, 50, 100, 180].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuantity(n)}
                      className="px-3 py-2 rounded-xl text-xs glass hover:bg-white/10"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setQuantity(9999)}
                    className="px-3 py-2 rounded-xl text-xs glass hover:bg-white/10"
                  >
                    Todas
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShuffleOn((s) => !s)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  shuffleOn ? 'bg-neon-violet/20 border border-neon-violet/60' : 'glass hover:bg-white/10'
                }`}
              >
                <Shuffle className="w-4 h-4" /> Embaralhar: {shuffleOn ? 'Sim' : 'Não'}
              </button>
              <button
                onClick={() => setTimerOn((s) => !s)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  timerOn ? 'bg-neon-cyan/20 border border-neon-cyan/60' : 'glass hover:bg-white/10'
                }`}
              >
                <Timer className="w-4 h-4" /> Timer por questão: {timerOn ? 'Sim' : 'Não'}
              </button>
            </div>

            {error && <div className="text-rose-300 text-sm">{error}</div>}

            <div className="flex gap-3">
              <button onClick={() => setMode('intro')} className="px-5 py-2.5 rounded-xl glass hover:bg-white/10 text-sm">Voltar</button>
              <button
                onClick={fetchExam}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950"
              >
                <Play className="w-4 h-4" /> Carregar prova
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-neon-cyan" />
            <p className="text-gray-600 dark:text-white/70">{loadingMsg}</p>
          </motion.div>
        )}

        {mode === 'exam' && q && (
          <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="text-xs text-gray-500 dark:text-white/50">Questão {current + 1} de {questions.length} · {q.area} · ENEM {q.year}</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleFavorite({ id: `sim-${q.year}-${q.id}`, year: q.year, area: q.area, q: q.q, opts: q.opts, correct: q.correct, source: 'simulado' })}
                  className={`p-1.5 rounded-lg transition-colors ${isFavorite(`sim-${q.year}-${q.id}`) ? 'text-yellow-400' : 'text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white'}`}
                  title="Favoritar"
                >
                  <Star className="w-4 h-4" fill={isFavorite(`sim-${q.year}-${q.id}`) ? 'currentColor' : 'none'} />
                </button>
                {timerOn && (
                  <div className={`inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg ${timeLeft <= 30 ? 'bg-rose-500/20 text-rose-300' : 'glass'}`}>
                    <Timer className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-white/50">{Object.keys(answers).length} respondidas</div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-6">
              <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-violet" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>

            {q.files && q.files.length > 0 && (
              <div className="mb-4 space-y-2">
                {q.files.map((f, i) => (
                  <img key={i} src={f} alt={`imagem da questão ${q.id}`} className="max-w-full rounded-xl border border-gray-200 dark:border-white/10" />
                ))}
              </div>
            )}

            {q.q && (
              <div className="mb-6 text-white/85 leading-relaxed whitespace-pre-line text-sm md:text-base max-h-[40vh] overflow-y-auto scrollbar-thin pr-2">
                {q.q}
              </div>
            )}

            <div className="space-y-3 mb-8">
              {q.opts.map((opt, i) => {
                const selected = answers[q.id] === i
                const altFile = q.altFiles?.[i]
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(q.id, i)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border transition-colors ${
                      selected ? 'bg-neon-cyan/20 border-neon-cyan/60' : 'glass hover:bg-white/10 border-gray-200 dark:border-white/10'
                    }`}
                  >
                    <span className="inline-flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm flex-1">
                        {opt}
                        {altFile && <img src={altFile} alt="" className="mt-2 max-w-full rounded-lg" />}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setTimerActive(false); setCurrent((c) => Math.max(0, c - 1)); setTimerActive(timerOn) }}
                disabled={current === 0}
                className="px-5 py-2.5 rounded-xl glass hover:bg-white/10 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              {current < questions.length - 1 ? (
                <button
                  onClick={() => { setTimerActive(false); setCurrent((c) => c + 1); setTimerActive(timerOn) }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950 font-semibold text-sm"
                >
                  Próxima →
                </button>
              ) : (
                <button
                  onClick={finish}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950 font-semibold text-sm"
                >
                  Finalizar e corrigir
                </button>
              )}
            </div>
          </motion.div>
        )}

        {mode === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="glass rounded-3xl p-8 text-center">
              <div className="font-display text-6xl font-bold text-gradient mb-2">{result.overall}</div>
              <p className="text-gray-600 dark:text-white/60 mb-2">Nota TRI estimada (escala 0–1000)</p>
              <p className="text-sm text-gray-500 dark:text-white/50">{result.correctCount} acertos de {result.total}</p>
            </div>

            <div className="glass rounded-3xl p-8">
              <h3 className="font-display text-xl font-bold mb-4">Notas por área do ENEM</h3>
              <div className="space-y-3">
                {Object.entries(result.areas).map(([area, score]) => (
                  <div key={area} className="flex items-center gap-4">
                    <div className="w-44 text-sm font-medium">{area}</div>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-violet" style={{ width: `${score / 10}%` }} />
                    </div>
                    <div className="w-12 text-right font-display font-bold text-sm">{score}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-8">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-display text-xl font-bold">Gabarito</h3>
                <button
                  onClick={() => setShowOnlyWrong((s) => !s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    showOnlyWrong ? 'bg-rose-500/20 border border-rose-400/60' : 'glass hover:bg-white/10 dark:hover:bg-white/10'
                  }`}
                >
                  {showOnlyWrong ? 'Mostrando apenas erros' : 'Mostrar apenas erros'}
                </button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
                {result.responses
                  .filter((r) => (showOnlyWrong ? !r.correct : true))
                  .map((r) => (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                    {r.correct ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium">Q{r.id} · {r.area} · ENEM {r.year}</div>
                      <div className="text-xs text-gray-600 dark:text-white/60">
                        Sua resposta: {answers[r.id] !== undefined ? String.fromCharCode(65 + answers[r.id]) : '—'} · Gabarito: {String.fromCharCode(65 + r.correctIndex)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold glass hover:bg-white/10">
                <RotateCcw className="w-4 h-4" /> Refazer simulado
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}