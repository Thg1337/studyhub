import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Trash2, X, Flame, Layers } from 'lucide-react'
import { askAI } from '../lib/ai.js'
import MathText from '../components/MathText.jsx'
import { getAll, getDue, recordResult } from '../lib/spaced.js'
import { getProgress, getStreak, todayCount, recordStudy } from '../lib/progress.js'

const KEY = 'studyhub_flashcards'
function readCards() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

export default function Flashcards() {
  const [topic, setTopic] = React.useState('')
  const [cards, setCards] = React.useState(readCards)
  const [current, setCurrent] = React.useState(0)
  const [flipped, setFlipped] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [onlyDue, setOnlyDue] = React.useState(false)
  const [progress, setProgress] = React.useState(getProgress)
  const [deleteId, setDeleteId] = React.useState(null)
  const cancelRef = React.useRef(null)
  const deleteButtonRef = React.useRef(null)
  const cardToDelete = cards.find((item) => item.id === deleteId)
  const scheduledIds = new Set(getAll().map((item) => item.id))
  const dueIds = new Set([...getDue().map((item) => item.id), ...cards.filter((item) => !scheduledIds.has(item.id)).map((item) => item.id)])
  const visible = onlyDue ? cards.filter((card) => dueIds.has(card.id)) : cards
  const card = visible[Math.min(current, visible.length - 1)]
  const streak = getStreak(progress)
  const dueCardCount = cards.filter((item) => dueIds.has(item.id)).length

  const save = (next) => {
    setCards(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next.slice(0, 200)))
    } catch {
      setError('Não foi possível salvar os cartões neste navegador. As alterações podem desaparecer ao fechar a página.')
    }
  }

  const generate = async (event) => {
    event.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    try {
      const text = await askAI([
        { role: 'system', content: 'Crie exatamente 5 flashcards de revisão para o ENEM. Responda APENAS com JSON: [{"front":"pergunta","back":"resposta curta"}]. Sem markdown.' },
        { role: 'user', content: `Assunto: ${topic.trim()}` }
      ], { max_tokens: 1000, format: 'json' })
      const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, ''))
      if (!Array.isArray(parsed)) throw new Error('Formato inválido')
      const next = parsed.filter((item) => typeof item.front === 'string' && typeof item.back === 'string' && item.front.trim() && item.back.trim()).slice(0, 5)
        .map((item) => ({ id: `card-${crypto.randomUUID()}`, topic: topic.trim(), front: item.front.trim(), back: item.back.trim() }))
      if (!next.length) throw new Error('Nenhum cartão válido foi gerado')
      save([...next, ...cards])
      setOnlyDue(false)
      setCurrent(0)
      setFlipped(false)
    } catch (e) { setError(`Não foi possível gerar cartões: ${e.message}`) }
    finally { setLoading(false) }
  }

  const rate = (rating) => {
    const remembered = rating !== 'again'
    recordResult({ id: card.id, topic: card.topic, front: card.front, back: card.back, source: 'flashcard' }, remembered, rating)
    setProgress(recordStudy())
    setFlipped(false)
    if (onlyDue) setCurrent((n) => Math.min(n, Math.max(0, visible.length - 2)))
    else setCurrent((n) => (n + 1) % visible.length)
  }

  React.useEffect(() => {
    if (!deleteId) return
    cancelRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDeleteId(null)
      if (event.key === 'Tab') {
        const first = cancelRef.current
        const last = deleteButtonRef.current
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteId])

  const confirmDelete = () => {
    save(cards.filter((item) => item.id !== deleteId))
    setCurrent(0)
    setFlipped(false)
    setDeleteId(null)
  }

  return <main className="pt-28 pb-24 max-w-6xl mx-auto px-6 space-y-6">
    <div>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-gray-600 dark:text-white/70"><Layers className="h-3 w-3 text-neon-cyan" /> Repetição espaçada</div>
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Flashcards <span className="text-gradient">com IA</span></h1>
      <p className="mt-3 max-w-2xl text-gray-600 dark:text-white/60">Gere cartões por assunto e revise no ritmo de repetição espaçada. Tudo salvo neste navegador.</p>
    </div>
    <form onSubmit={generate} className="glass rounded-2xl p-4 flex flex-col gap-3 sm:flex-row">
      <input aria-label="Assunto dos flashcards" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Fotossíntese" className="flex-1 rounded-xl border border-line bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-white/40" />
      <button disabled={loading} className="btn btn-primary disabled:opacity-50">{loading ? 'Gerando…' : 'Gerar 5 cartões'}</button>
    </form>
    {error && <p key={error} role="alert" className="shake text-rose-400">{error}</p>}
    <div className="glass rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-white/70">
        <span className="inline-flex items-center gap-1.5"><Flame className="h-4 w-4 text-neon-cyan" /> {streak} {streak === 1 ? 'dia' : 'dias'}</span>
        <span>Meta {todayCount(progress)}/{progress.goal}</span>
        <span>{dueCardCount} {dueCardCount === 1 ? 'cartão para revisar' : 'cartões para revisar'}</span>
      </div>
      <button onClick={() => { setOnlyDue(!onlyDue); setCurrent(0); setFlipped(false) }} className="btn btn-ghost !px-4 !py-2 text-sm">{onlyDue ? 'Ver todos' : 'Revisar pendentes'}</button>
    </div>
    {card ? <section key={card.id} className="card-in glass rounded-3xl p-8 space-y-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/50">{card.topic} · {current + 1}/{visible.length}</p>
      <h2 className="font-display text-2xl font-semibold leading-snug whitespace-pre-line"><MathText text={card.front} /></h2>
      {flipped ? <p className="answer-in border-t border-line pt-5 text-gray-700 dark:text-white/80 whitespace-pre-line"><MathText text={card.back} /></p> : <button onClick={() => setFlipped(true)} className="btn btn-ghost">Mostrar resposta</button>}
      <div className="flex gap-3 flex-wrap items-center">
        {flipped && <div className="answer-in flex flex-wrap gap-3" style={{ '--answer-delay': '60ms' }}><button onClick={() => rate('again')} className="btn btn-ghost text-rose-300 hover:border-rose-400/50 hover:text-rose-300">Não lembrei · 1 dia</button><button onClick={() => rate('hard')} className="btn btn-ghost">Difícil</button><button onClick={() => rate('good')} className="btn btn-primary">Bom</button><button onClick={() => rate('easy')} className="btn bg-emerald-500 text-white hover:bg-emerald-400">Fácil</button></div>}
        <button onClick={() => { setCurrent((n) => (n + 1) % visible.length); setFlipped(false) }} className="btn btn-ghost">Próximo</button>
        <button onClick={() => setDeleteId(card.id)} className="btn btn-ghost hover:border-rose-400/50 hover:text-rose-400"><Trash2 className="w-4 h-4" /> Excluir</button>
      </div>
    </section> : <div className="rounded-3xl border border-dashed border-line p-10 text-center">
      <p className="font-display text-lg font-semibold">{onlyDue ? 'Nenhum cartão pendente' : 'Nenhum cartão ainda'}</p>
      <p className="mt-2 text-sm text-gray-600 dark:text-white/60">{onlyDue ? 'Todos os cartões já foram revisados por hoje.' : 'Digite um assunto acima para gerar os cinco primeiros cartões.'}</p>
    </div>}
    <AnimatePresence>
      {cardToDelete && <motion.div
        initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-ink-950/85" onClick={() => setDeleteId(null)} aria-hidden="true" />
        <motion.div
          initial={false} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"
          className="relative w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-ink-900 p-7 shadow-2xl"
        >
          <button onClick={() => setDeleteId(null)} aria-label="Fechar aviso" className="absolute right-5 top-5 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 id="delete-title" className="font-display text-2xl font-bold text-gray-900 dark:text-white">Excluir flashcard?</h2>
          <p id="delete-description" className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-white/65">
            Este cartão será removido da sua lista. Essa ação não pode ser desfeita.
          </p>
          <div className="mt-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3">
            <p className="text-xs font-semibold text-neon-violet">{cardToDelete.topic}</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-800 dark:text-white/85">{cardToDelete.front}</p>
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button ref={cancelRef} onClick={() => setDeleteId(null)} className="rounded-xl border border-gray-200 dark:border-white/15 px-5 py-3 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-white/10">Manter cartão</button>
            <button ref={deleteButtonRef} onClick={confirmDelete} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600"><Trash2 className="h-4 w-4" /> Excluir cartão</button>
          </div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  </main>
}
