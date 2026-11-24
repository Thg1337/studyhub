import React from 'react'
import { Link } from 'react-router-dom'
import { Bot, CheckCircle2, Image as ImageIcon, Loader2, MessageCircle, Search, Sparkles, Star, Trash2, X, XCircle } from 'lucide-react'
import { getFavorites, removeFavorite, updateFavoriteAnswer } from '../lib/favorites.js'
import { askAI } from '../lib/ai.js'
import AIResponse from '../components/AIResponse.jsx'

const IMAGE_PATTERN = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g

function safeImageUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function QuestionText({ text, onZoom }) {
  const content = String(text || '')
  const parts = []
  let cursor = 0
  for (const match of content.matchAll(IMAGE_PATTERN)) {
    if (match.index > cursor) parts.push({ type: 'text', value: content.slice(cursor, match.index) })
    const url = safeImageUrl(match[2])
    if (url) parts.push({ type: 'image', value: url, alt: match[1] || 'Imagem da questão' })
    else parts.push({ type: 'text', value: match[0] })
    cursor = match.index + match[0].length
  }
  if (cursor < content.length) parts.push({ type: 'text', value: content.slice(cursor) })
  return <div className="space-y-3 leading-relaxed text-gray-800 dark:text-white/85">
    {parts.map((part, index) => part.type === 'image'
      ? <PreviewImage key={index} src={part.value} alt={part.alt} onZoom={onZoom} />
      : <p key={index} className="whitespace-pre-line">{part.value}</p>)}
  </div>
}

function PreviewImage({ src, alt, onZoom }) {
  const url = safeImageUrl(src)
  const [failed, setFailed] = React.useState(false)
  if (!url) return null
  if (failed) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-neon-cyan underline">Abrir imagem original (prévia indisponível)</a>
  return <button type="button" onClick={() => onZoom(url, alt)} className="block max-w-full text-left group" aria-label={`Ampliar ${alt}`}>
    <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)}
      className="max-w-full max-h-80 object-contain rounded-xl border border-gray-200 bg-white p-2 transition-transform group-hover:scale-[1.01] dark:border-white/10" />
    <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-white/50"><ImageIcon className="h-3 w-3" /> Toque para ampliar</span>
  </button>
}

function groupName(item) {
  const name = item.area || item.subject || item.topic
  return name && name !== 'Não classificada' ? name : 'Outras matérias'
}

function hasImages(item) {
  const containsImage = (text) => new RegExp(IMAGE_PATTERN.source).test(String(text || ''))
  return Boolean(containsImage(item.q) || item.files?.some(Boolean) ||
    item.altFiles?.some(Boolean) || item.opts?.some(containsImage))
}

function questionContext(item, selected) {
  const alternatives = Array.isArray(item.opts)
    ? item.opts.map((option, index) => `${String.fromCharCode(65 + index)}) ${option}`).join('\n')
    : 'Alternativas indisponíveis.'
  const answered = Number.isInteger(selected)
  return `Questão favorita (${groupName(item)}):\n${item.q || 'Enunciado indisponível'}\nAlternativas:\n${alternatives}\n` +
    (answered
      ? `Resposta escolhida: ${String.fromCharCode(65 + selected)}) ${item.opts[selected]}\nGabarito: ${String.fromCharCode(65 + item.correct)}) ${item.opts[item.correct]}`
      : 'O aluno ainda não respondeu. Dê apenas uma dica, sem revelar o gabarito.') +
    (item.explain ? `\nExplicação existente: ${item.explain}` : '') +
    (hasImages(item) ? '\nA questão contém imagens que não são enviadas à IA. Não afirme ter visto nem descreva detalhes visuais; se essenciais, peça ao aluno que descreva a figura.' : '')
}

export default function Favoritas({ onOpenChat }) {
  const [favorites, setFavorites] = React.useState(getFavorites)
  const [search, setSearch] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [zoom, setZoom] = React.useState(null)
  const [explanations, setExplanations] = React.useState({})
  const [loadingAI, setLoadingAI] = React.useState({})
  const [revealed, setRevealed] = React.useState({})
  const subjects = [...new Set(favorites.map(groupName))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const filtered = favorites.filter((item) => (!subject || groupName(item) === subject) &&
    `${item.q || ''} ${item.topic || ''} ${groupName(item)}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  const groups = Object.groupBy
    ? Object.groupBy(filtered, groupName)
    : filtered.reduce((acc, item) => { (acc[groupName(item)] ||= []).push(item); return acc }, {})

  const remove = (id) => {
    removeFavorite(id)
    setFavorites(getFavorites())
  }

  const answer = (item, index) => {
    updateFavoriteAnswer(item.id, index)
    setFavorites(getFavorites())
    setExplanations((previous) => { const next = { ...previous }; delete next[item.id]; return next })
  }

  const explain = async (item) => {
    if (loadingAI[item.id]) return
    const selected = item.userAnswer
    setLoadingAI((previous) => ({ ...previous, [item.id]: true }))
    setExplanations((previous) => { const next = { ...previous }; delete next[item.id]; return next })
    try {
      const system = Number.isInteger(selected)
        ? selected === item.correct
          ? 'Você é um tutor do ENEM. Explique por que a resposta do aluno está correta, com raciocínio passo a passo e uma dica de fixação. Use apenas os dados fornecidos.'
          : 'Você é um tutor do ENEM. Explique de forma gentil e personalizada por que a alternativa que o aluno escolheu está errada e por que o gabarito está correto. Mostre o raciocínio passo a passo; não invente informações.'
        : 'Você é um tutor do ENEM. Dê uma dica útil e um primeiro passo para resolver a questão, SEM revelar nem sugerir a letra do gabarito.'
      const response = await askAI([
        { role: 'system', content: `${system} Você recebe apenas texto; não analisa imagens. Se a imagem for essencial, reconheça a limitação e peça ao aluno para descrevê-la. Organize a resposta com título breve, passos numerados e conclusão. Use Markdown simples e coloque fórmulas entre $...$ ou $$...$$. Confira contas e desigualdades antes de concluir; se faltarem dados, diga isso. Não use comandos LaTeX fora das fórmulas.` },
        { role: 'user', content: questionContext(item, selected) }
      ], { max_tokens: 1200, temperature: 0.3 })
      setExplanations((previous) => ({ ...previous, [item.id]: response }))
    } catch (error) {
      setExplanations((previous) => ({ ...previous, [item.id]: `Não foi possível consultar a IA: ${error.message}` }))
    } finally {
      setLoadingAI((previous) => ({ ...previous, [item.id]: false }))
    }
  }

  React.useEffect(() => {
    if (!zoom) return
    const closeOnEscape = (event) => { if (event.key === 'Escape') setZoom(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [zoom])

  return <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
    <div className="mb-9">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-gray-600 dark:text-white/70">
        <Star className="h-3 w-3 text-neon-cyan" /> Sua coleção
      </div>
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Questões <span className="text-gradient">favoritas</span></h1>
      <p className="mt-3 text-gray-600 dark:text-white/60">{favorites.length} {favorites.length === 1 ? 'questão salva' : 'questões salvas'} neste navegador.{favorites.length > 0 && ' Abra as imagens para vê-las em tamanho maior.'}</p>
    </div>

    {favorites.length > 0 ? <>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <label className="glass flex min-w-0 flex-1 items-center gap-2 rounded-xl px-4">
          <Search className="h-4 w-4 shrink-0 text-gray-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nas favoritas" aria-label="Buscar nas favoritas"
            className="w-full bg-transparent py-3 outline-none" />
        </label>
        <select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Filtrar por matéria"
          className="glass rounded-xl bg-transparent px-4 py-3">
          <option value="" className="bg-ink-900 text-white">Todas as matérias</option>
          {subjects.map((name) => <option key={name} value={name} className="bg-ink-900 text-white">{name}</option>)}
        </select>
      </div>
      {filtered.length ? Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([name, items]) =>
        <section key={name} className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <span className="h-2 w-2 rounded-full bg-neon-cyan" /> {name} <span className="text-sm font-normal text-gray-500 dark:text-white/50">({items.length})</span>
          </h2>
          <div className="space-y-4">
            {items.map((item) => <article key={item.id} data-reveal className="glass rounded-2xl p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-neon-cyan">{item.source === 'simulado' ? `ENEM ${item.year || ''}` : `Prática${item.topic ? ` · ${item.topic}` : ''}`}</span>
                <button onClick={() => remove(item.id)} aria-label="Remover questão das favoritas"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10">
                  <Trash2 className="h-4 w-4" /> Remover
                </button>
              </div>
              <QuestionText text={item.q} onZoom={(src, alt) => setZoom({ src, alt })} />
              {item.files?.map((src, index) => <div key={`${src}-${index}`} className="mt-4"><PreviewImage src={src} alt={`Imagem do enunciado ${index + 1}`} onZoom={(url, alt) => setZoom({ src: url, alt })} /></div>)}
              {Array.isArray(item.opts) && <div className="mt-6 space-y-2">
                {item.opts.map((option, index) => <div key={index}
                  className={`rounded-xl border p-3 text-sm ${Number.isInteger(item.userAnswer) && index === item.correct ? 'border-emerald-500/50 bg-emerald-500/10' : Number.isInteger(item.userAnswer) && index === item.userAnswer ? 'border-rose-500/50 bg-rose-500/10' : 'border-gray-200 bg-gray-100/40 dark:border-white/10 dark:bg-white/5'}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => answer(item, index)} disabled={loadingAI[item.id]} aria-label={`Responder alternativa ${String.fromCharCode(65 + index)}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-300 font-bold hover:border-neon-cyan disabled:opacity-50 dark:border-white/20">{String.fromCharCode(65 + index)}</button>
                    <div className="min-w-0 flex-1"><QuestionText text={option} onZoom={(src, alt) => setZoom({ src, alt })} />
                      {item.altFiles?.[index] && <div className="mt-2"><PreviewImage src={item.altFiles[index]} alt={`Imagem da alternativa ${String.fromCharCode(65 + index)}`} onZoom={(src, alt) => setZoom({ src, alt })} /></div>}
                    </div>
                  </div>
                </div>)}
              </div>}
              {Number.isInteger(item.userAnswer) && <div className={`mt-5 rounded-xl border p-4 ${item.userAnswer === item.correct ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
                <div className="flex items-center gap-2 font-semibold">
                  {item.userAnswer === item.correct ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
                  {item.userAnswer === item.correct ? 'Você acertou!' : `Você marcou ${String.fromCharCode(65 + item.userAnswer)}; o gabarito é ${String.fromCharCode(65 + item.correct)}.`}
                </div>
                {item.userAnswer !== item.correct && <p className="mt-2 text-sm">Sua escolha: {item.opts?.[item.userAnswer]} · Resposta correta: {item.opts?.[item.correct]}</p>}
                {item.explain && <p className="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-white/70">{item.explain}</p>}
              </div>}
              {!Number.isInteger(item.userAnswer) && <p className="mt-4 text-sm text-gray-500 dark:text-white/60">Selecione uma alternativa para conferir sua resposta.</p>}
              {!Number.isInteger(item.userAnswer) && Number.isInteger(item.correct) && <button onClick={() => setRevealed((previous) => ({ ...previous, [item.id]: true }))} className="mt-2 text-xs text-neon-cyan hover:underline">Ver gabarito sem responder</button>}
              {revealed[item.id] && !Number.isInteger(item.userAnswer) && <p className="mt-2 text-sm font-semibold text-emerald-500">Gabarito: {String.fromCharCode(65 + item.correct)} — {item.opts?.[item.correct]}</p>}
              {hasImages(item) && <p className="mt-4 text-xs text-amber-600 dark:text-amber-300">A IA lê o texto desta questão, mas não interpreta as imagens. Se a figura for importante, descreva-a no chat.</p>}
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => explain(item)} disabled={loadingAI[item.id] || !Number.isInteger(item.correct) || !Array.isArray(item.opts)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-violet px-4 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-50">
                  {loadingAI[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {Number.isInteger(item.userAnswer) ? 'IA: explicar minha resposta' : 'Pedir uma dica à IA'}
                </button>
                <button onClick={() => onOpenChat?.(questionContext(item, item.userAnswer))} className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-semibold">
                  <MessageCircle className="h-4 w-4" /> Conversar com o tutor
                </button>
              </div>
              {explanations[item.id] && <div role="status" className="mt-5 rounded-2xl border border-neon-violet/30 bg-neon-violet/10 p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-3 border-b border-line pb-3 font-display font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-violet/15"><Bot className="h-5 w-5 text-neon-violet" /></span> Explicação do tutor</div>
                <AIResponse text={explanations[item.id]} />
              </div>}
            </article>)}
          </div>
        </section>
      ) : <p className="glass rounded-2xl p-8 text-center text-gray-600 dark:text-white/60">Nenhuma questão corresponde à busca.</p>}
    </> : <div className="glass rounded-3xl p-10 text-center">
      <Star className="mx-auto mb-4 h-9 w-9 text-neon-cyan" />
      <h2 className="font-display text-xl font-bold">Sua coleção ainda está vazia</h2>
      <p className="mt-2 text-gray-600 dark:text-white/60">Toque na estrela de uma questão para guardá-la aqui.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/quiz/Matemática" className="btn btn-primary">Ir para Prática</Link>
        <Link to="/simulados" className="btn btn-ghost">Ver Simulados</Link>
      </div>
    </div>}

    {zoom && <div role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={() => setZoom(null)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/95 p-4">
      <button autoFocus onClick={() => setZoom(null)} aria-label="Fechar imagem" className="absolute right-5 top-5 rounded-xl bg-white/10 p-2 text-white"><X className="h-6 w-6" /></button>
      <img src={zoom.src} alt={zoom.alt} onClick={(event) => event.stopPropagation()} className="max-h-[85vh] max-w-full rounded-xl bg-white object-contain" />
    </div>}
  </main>
}
