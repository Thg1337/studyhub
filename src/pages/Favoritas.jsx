import React from 'react'
import { Link } from 'react-router-dom'
import { Image as ImageIcon, Search, Star, Trash2, X } from 'lucide-react'
import { getFavorites, removeFavorite } from '../lib/favorites.js'

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

export default function Favoritas() {
  const [favorites, setFavorites] = React.useState(getFavorites)
  const [search, setSearch] = React.useState('')
  const [subject, setSubject] = React.useState('')
  const [zoom, setZoom] = React.useState(null)
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

  React.useEffect(() => {
    if (!zoom) return
    const closeOnEscape = (event) => { if (event.key === 'Escape') setZoom(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [zoom])

  return <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
    <div className="mb-9">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-gray-600 dark:text-white/70">
        <Star className="h-3 w-3 text-yellow-400" /> Sua coleção
      </div>
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Questões <span className="text-gradient">favoritas</span></h1>
      <p className="mt-3 text-gray-600 dark:text-white/60">{favorites.length} questão(ões) salvas neste navegador. Abra as imagens para vê-las em tamanho maior.</p>
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
            {items.map((item) => <article key={item.id} className="glass rounded-2xl p-5 sm:p-7">
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
                  className={`rounded-xl border p-3 text-sm ${index === item.correct ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-gray-200 bg-gray-100/40 dark:border-white/10 dark:bg-white/5'}`}>
                  <div className="flex items-start gap-3">
                    <span className="font-bold">{String.fromCharCode(65 + index)}</span>
                    <div className="min-w-0 flex-1"><QuestionText text={option} onZoom={(src, alt) => setZoom({ src, alt })} />
                      {item.altFiles?.[index] && <div className="mt-2"><PreviewImage src={item.altFiles[index]} alt={`Imagem da alternativa ${String.fromCharCode(65 + index)}`} onZoom={(src, alt) => setZoom({ src, alt })} /></div>}
                    </div>
                  </div>
                </div>)}
              </div>}
              {Number.isInteger(item.correct) && <p className="mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Gabarito: {String.fromCharCode(65 + item.correct)}</p>}
              {item.explain && <p className="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-white/65">{item.explain}</p>}
            </article>)}
          </div>
        </section>
      ) : <p className="glass rounded-2xl p-8 text-center text-gray-600 dark:text-white/60">Nenhuma questão corresponde à busca.</p>}
    </> : <div className="glass rounded-3xl p-10 text-center">
      <Star className="mx-auto mb-4 h-9 w-9 text-yellow-400" />
      <h2 className="font-display text-xl font-bold">Sua coleção ainda está vazia</h2>
      <p className="mt-2 text-gray-600 dark:text-white/60">Toque na estrela de uma questão para guardá-la aqui.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/quiz/Matemática" className="rounded-xl bg-neon-cyan px-4 py-2 font-semibold text-ink-950">Ir para Prática</Link>
        <Link to="/simulados" className="glass rounded-xl px-4 py-2 font-semibold">Ver Simulados</Link>
      </div>
    </div>}

    {zoom && <div role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={() => setZoom(null)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm">
      <button autoFocus onClick={() => setZoom(null)} aria-label="Fechar imagem" className="absolute right-5 top-5 rounded-xl bg-white/10 p-2 text-white"><X className="h-6 w-6" /></button>
      <img src={zoom.src} alt={zoom.alt} onClick={(event) => event.stopPropagation()} className="max-h-[85vh] max-w-full rounded-xl bg-white object-contain" />
    </div>}
  </main>
}
