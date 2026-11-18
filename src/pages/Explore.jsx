import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Search, Sparkles, Play, Loader2, BookOpen, Youtube } from 'lucide-react'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-20b'

export default function Explore() {
  const [searchParams] = useSearchParams()
  const [topic, setTopic] = React.useState(searchParams.get('topic') || '')
  const [activeTopic, setActiveTopic] = React.useState('')
  const [aiText, setAiText] = React.useState('')
  const [loadingAI, setLoadingAI] = React.useState(false)
  const [videos, setVideos] = React.useState([])
  const [loadingVideos, setLoadingVideos] = React.useState(false)
  const [error, setError] = React.useState('')
  const [playingId, setPlayingId] = React.useState(null)

  const fetchAI = async (t) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY não configurada')
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Você é um tutor de estudos. Explique o assunto solicitado de forma clara, didática e em português do Brasil. Use tópicos e exemplos curtos. Até ~200 palavras.' },
          { role: 'user', content: `Explique o assunto: ${t}` }
        ],
        temperature: 0.7,
        max_tokens: 600
      })
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() || 'Sem resposta.'
  }

  const fetchVideos = async (t) => {
    const key = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!key) throw new Error('VITE_YOUTUBE_API_KEY não configurada')
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(t + ' aula')}&type=video&maxResults=6&key=${key}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const data = await res.json()
    return (data.items || []).map((it) => ({
      id: it.id.videoId,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumb: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url
    }))
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
          } else setError((prev) => prev + `YouTube: ${vids.reason?.message || 'erro'}\n`)
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs text-white/70 mb-4">
          <Search className="w-3 h-3 text-neon-cyan" /> Explorar assunto
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
          Digite um <span className="text-gradient">assunto</span>
        </h1>
        <p className="text-white/60 mt-3 max-w-2xl">
          A IA explica o tema e busca vídeo-aulas no YouTube automaticamente.
        </p>
      </motion.div>

      <form onSubmit={handleSearch} className="glass rounded-3xl p-4 flex items-center gap-3 mb-10">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: Equações do 2º grau, Revolução Francesa, Fotossíntese..."
          className="flex-1 bg-transparent outline-none text-base py-2 placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={loadingAI || loadingVideos}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950 disabled:opacity-50"
        >
          {loadingAI || loadingVideos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Buscar
        </button>
      </form>

      {error && (
        <div className="glass rounded-2xl p-4 mb-8 border border-rose-400/40 text-rose-300 text-sm whitespace-pre-line">
          {error}
        </div>
      )}

      <AnimatePresence>
        {activeTopic && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-2 gap-6 items-stretch"
          >
            {/* AI explanation */}
            <div className="glass rounded-3xl p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-neon-cyan" />
                <h2 className="font-display text-xl font-bold">Explicação da IA</h2>
              </div>
              <div className="text-sm text-white/50 mb-4">Assunto: <span className="text-white">{activeTopic}</span></div>
              {loadingAI ? (
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin" /> Gerando explicação...
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
                  <p className="text-white/80 leading-relaxed whitespace-pre-line">{aiText}</p>
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
                <div className="flex items-center gap-2 text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin" /> Buscando vídeos...
                </div>
              ) : videos.length === 0 ? (
                <p className="text-white/50 text-sm">Nenhum vídeo encontrado.</p>
              ) : (
                <div className="space-y-4">
                  {/* Player */}
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10">
                    {playingId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${playingId}?autoplay=1&rel=0`}
                        title="YouTube player"
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-2">
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
                          <img src={v.thumb} alt={v.title} className="w-28 h-16 object-cover rounded-lg" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-6 h-6 text-white drop-shadow opacity-80 group-hover:opacity-100" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium line-clamp-2 group-hover:text-neon-cyan transition-colors">{v.title}</div>
                          <div className="text-xs text-white/50 mt-1 truncate">{v.channel}</div>
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
    </div>
  )
}