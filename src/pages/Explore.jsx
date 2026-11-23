import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Sparkles, Play, Loader2, BookOpen, Youtube, BrainCircuit, Calculator, ListChecks } from 'lucide-react'
import Skeleton from '../components/Skeleton.jsx'
import { useToast } from '../components/Toast.jsx'
import { askAI } from '../lib/ai.js'
import { safeImageUrl } from '../lib/safeUrl.js'

const ENTITY_MAP = {
  nbsp: '\u00A0',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“'
}
function decodeEntities(text) {
  if (!text) return text
  return String(text).replace(/&([a-zA-Z]+|#(\d+)|#x([0-9a-fA-F]+));/g, (match, name, dec, hex) => {
    if (name.startsWith('#')) {
      const code = dec ? parseInt(dec, 10) : parseInt(hex, 16)
      if (Number.isFinite(code)) return String.fromCharCode(code)
      return match
    }
    return Object.prototype.hasOwnProperty.call(ENTITY_MAP, name) ? ENTITY_MAP[name] : match
  })
}
export default function Explore() {
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [topic, setTopic] = React.useState(searchParams.get('topic') || '')
  const [activeTopic, setActiveTopic] = React.useState('')
  const [aiText, setAiText] = React.useState('')
  const [loadingAI, setLoadingAI] = React.useState(false)
  const [videos, setVideos] = React.useState([])
  const [loadingVideos, setLoadingVideos] = React.useState(false)
  const [error, setError] = React.useState('')
  const [playingId, setPlayingId] = React.useState(null)
  const [summary, setSummary] = React.useState('')
  const [loadingSummary, setLoadingSummary] = React.useState(false)
  const [summaryKind, setSummaryKind] = React.useState('resumo')

  const fetchAI = async (t) => {
    const messages = [
      { role: 'system', content: 'Você é um tutor de estudos. Explique o assunto solicitado de forma clara, didática e em português do Brasil. Use tópicos e exemplos curtos. Até ~200 palavras. Responda em texto puro, sem markdown, asteriscos, cerquilhas (#), crases ou LaTeX.' },
      { role: 'user', content: `Explique o assunto: ${t}` }
    ]
    return askAI(messages, { max_tokens: 550 })
  }

  const fetchVideos = async (t) => {
    const res = await fetch(`/api/youtube?q=${encodeURIComponent(t + ' aula')}&maxResults=6`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `YouTube indisponível (${res.status})`)
    }
    const data = await res.json()
    return (data.items || []).map((it) => ({
      id: it.id.videoId,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumb: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url
    }))
  }

  const summaryKindRef = React.useRef(summaryKind)
  React.useEffect(() => { summaryKindRef.current = summaryKind }, [summaryKind])

  const fetchSummary = async () => {
    const t = (topic || activeTopic).trim()
    if (!t) { toast('Informe um assunto.', 'error'); return }
    const kind = summaryKindRef.current
    setLoadingSummary(true)
    setSummary('')
    try {
      const instructions = {
        resumo: 'Gere um resumo de revisão de 1 página, em tópicos curtos, com conceitos, fórmulas e pontos-chave. Use markdown simples.',
        mapa: 'Gere um mapa mental em texto: assunto central, ramos principais e conexões, usando indentação clara. Use apenas espaços normais (nunca &nbsp; ou outras entidades HTML). Inclua apenas conteúdos importantes para o ENEM.',
        formulas: 'Gere uma folha de fórmulas e relações essenciais. Explique o significado de cada variável e quando usar cada fórmula. Se não houver fórmulas, apresente regras-chave.',
        revisao: 'Gere uma revisão ativa de 5 minutos: 5 perguntas curtas, pausa para o aluno pensar e a resposta logo abaixo de cada pergunta.'
      }
      const instruction = instructions[kind] || instructions.resumo
      const messages = [
        { role: 'system', content: `Você é um tutor em português do Brasil. ${instruction} Responda em texto puro, sem entidades HTML (como &nbsp;).` },
        { role: 'user', content: `Assunto: ${t}` }
      ]
      setSummary(await askAI(messages, { temperature: 0.5, max_tokens: 900 }))
    } catch (e) {
      toast(e.message || 'Erro ao gerar resumo.', 'error')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleSearch = async (e) => {
    e?.preventDefault()
    const t = topic.trim()
    if (!t) return
    setActiveTopic(t)
    setAiText('')
    setVideos([])
    setError('')
    setPlayingId(null)
    setLoadingAI(true)
    setLoadingVideos(true)
    try {
      const [text, vids] = await Promise.allSettled([fetchAI(t), fetchVideos(t)])
      if (text.status === 'fulfilled') setAiText(text.value)
      else setError((prev) => prev + `IA: ${text.reason?.message || 'erro'}\n`)
      if (vids.status === 'fulfilled') {
        setVideos(vids.value)
        if (vids.value.length > 0) setPlayingId(vids.value[0].id)
      }
      else setError((prev) => prev + `YouTube: ${vids.reason?.message || 'erro'}\n`)
    } finally {
      setLoadingAI(false)
      setLoadingVideos(false)
    }
  }

  // Auto-busca quando topic vem pela URL (ex: cards da home)
  React.useEffect(() => {
    const t = searchParams.get('topic')
    if (t) {
      setTopic(t)
      // dispara busca
      const fakeEvent = { preventDefault: () => {} }
      // chama handleSearch com o tópico
      ;(async () => {
        setActiveTopic(t)
        setAiText('')
        setVideos([])
        setError('')
        setPlayingId(null)
        setLoadingAI(true)
        setLoadingVideos(true)
        try {
          const [text, vids] = await Promise.allSettled([fetchAI(t), fetchVideos(t)])
          if (text.status === 'fulfilled') setAiText(text.value)
          else setError((prev) => prev + `IA: ${text.reason?.message || 'erro'}\n`)
          if (vids.status === 'fulfilled') {
            setVideos(vids.value)
            if (vids.value.length > 0) setPlayingId(vids.value[0].id)
          } else { setError((prev) => prev + `YouTube: ${vids.reason?.message || 'erro'}\n`); toast(vids.reason?.message || 'Erro ao buscar vídeos', 'error') }
        } finally {
          setLoadingAI(false)
          setLoadingVideos(false)
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="pt-28 pb-24 max-w-6xl mx-auto px-6">
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs text-gray-600 dark:text-white/70 mb-4">
          <Search className="w-3 h-3 text-neon-cyan" /> Explorar assunto
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Explore um <span className="text-gradient">assunto</span>
        </h1>
        <p className="text-gray-600 dark:text-white/60 mt-3 max-w-2xl">
          A IA explica o tema e busca vídeo-aulas no YouTube automaticamente.
        </p>
      </motion.div>

      <form onSubmit={handleSearch} className="glass rounded-3xl p-4 flex flex-col gap-3 mb-10 sm:flex-row sm:items-center">
        <input
          aria-label="Assunto para explorar"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: Equações do 2º grau, Revolução Francesa, Fotossíntese..."
          className="flex-1 bg-transparent outline-none text-base py-2 placeholder:text-gray-400 dark:text-white/40"
        />
        <button
          type="submit"
          disabled={loadingAI || loadingVideos}
          className="btn btn-primary justify-center disabled:opacity-50"
        >
          {loadingAI || loadingVideos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Buscar
        </button>
        <button
          type="button"
          onClick={fetchSummary}
          disabled={loadingSummary}
          className="btn btn-ghost justify-center disabled:opacity-50"
        >
          {loadingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          Gerar {summaryKind === 'resumo' ? 'resumo' : summaryKind === 'mapa' ? 'mapa mental' : summaryKind === 'formulas' ? 'fórmulas' : 'revisão'}
        </button>
      </form>
      <div className="mb-8 flex flex-wrap gap-2" aria-label="Tipo de material de estudo">
        {[
          ['resumo', BookOpen, 'Resumo'],
          ['mapa', BrainCircuit, 'Mapa mental'],
          ['formulas', Calculator, 'Fórmulas'],
          ['revisao', ListChecks, 'Revisão 5 min']
        ].map(([key, Icon, label]) => <button key={key} onClick={() => setSummaryKind(key)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${summaryKind === key ? 'bg-neon-cyan/20 border border-neon-cyan/60' : 'glass hover:bg-white/10'}`}><Icon className="h-4 w-4" />{label}</button>)}
        <Link to={`/quiz/Matemática?topic=${encodeURIComponent(topic || activeTopic)}`} className="inline-flex items-center gap-2 rounded-xl glass px-3 py-2 text-sm hover:bg-white/10"><Sparkles className="h-4 w-4" />Praticar assunto</Link>
      </div>

      {!activeTopic && !error && (
        <div className="rounded-3xl border border-dashed border-line p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">Sugestões para começar</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Função quadrática', 'Fotossíntese', 'Revolução Francesa', 'Lei de Hess', 'Interpretação de texto'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setTopic(suggestion)}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors duration-150 hover:border-line-strong hover:text-fg"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted">
            Escolha uma sugestão ou digite seu próprio tema para ver explicação, resumo, mapa mental e vídeo-aulas.
          </p>
        </div>
      )}

      {error && (
        <div key={error} className="shake glass rounded-2xl p-4 mb-8 border border-rose-400/40 text-rose-300 text-sm whitespace-pre-line">
          {error}
        </div>
      )}

      <AnimatePresence>
        {activeTopic && (
          <motion.div
            initial={{ y: 10 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="grid lg:grid-cols-2 gap-6 items-stretch"
          >
            {/* AI explanation */}
            <div className="glass rounded-3xl p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-neon-cyan" />
                <h2 className="font-display text-xl font-bold">Explicação da IA</h2>
              </div>
              <div className="text-sm text-gray-500 dark:text-white/50 mb-4">Assunto: <span className="text-gray-900 dark:text-white">{activeTopic}</span></div>
              {loadingAI ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
                  <p key={activeTopic} className="answer-in text-gray-700 dark:text-white/80 leading-relaxed whitespace-pre-line">{decodeEntities(aiText)}</p>
                </div>
              )}
            </div>

            {/* Videos */}
            <div className="glass rounded-3xl p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Youtube className="w-5 h-5 text-neon-pink" />
                <h2 className="font-display text-xl font-bold">Vídeo-aulas</h2>
              </div>
              {loadingVideos ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-28 h-16 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <p className="text-gray-500 dark:text-white/50 text-sm">Nenhum vídeo encontrado.</p>
              ) : (
                <div key={`videos-${activeTopic}`} className="answer-in space-y-4">
                  {/* Player */}
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-gray-200 dark:border-white/10">
                    {playingId && /^[a-zA-Z0-9_-]{11}$/.test(playingId) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${playingId}?autoplay=0&rel=0`}
                        title="YouTube player"
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 dark:text-white/60 gap-2">
                        <Play className="w-10 h-10" />
                        <span className="text-sm">Selecione um vídeo abaixo para assistir aqui</span>
                      </div>
                    )}
                  </div>

                  {/* List */}
                  <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin pr-1">
                    {videos.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setPlayingId(v.id)}
                        className={`w-full flex gap-3 p-2 rounded-xl transition-colors text-left group ${
                          playingId === v.id ? 'bg-white/10 border border-neon-cyan/40' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="relative shrink-0">
                          {safeImageUrl(v.thumb) ? <img src={safeImageUrl(v.thumb)} alt={v.title} className="w-28 h-16 object-cover rounded-lg" /> : null}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-900 dark:text-white drop-shadow opacity-80 group-hover:opacity-100" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium line-clamp-2 group-hover:text-neon-cyan transition-colors">{v.title}</div>
                          <div className="text-xs text-gray-500 dark:text-white/50 mt-1 truncate">{v.channel}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {summary && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-7 mt-6"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-neon-cyan" />
            <h2 className="font-display text-xl font-bold">{({ resumo: 'Resumo de revisão', mapa: 'Mapa mental em texto', formulas: 'Fórmulas e regras', revisao: 'Revisão ativa de 5 minutos' })[summaryKind]}</h2>
          </div>
          <div className="text-gray-700 dark:text-white/80 leading-relaxed whitespace-pre-line text-sm">
            {decodeEntities(summary)}
          </div>
        </motion.div>
      )}
    </div>
  )
}
