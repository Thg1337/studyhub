import React from 'react'
import { askAI } from '../lib/ai.js'
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
  const scheduledIds = new Set(getAll().map((item) => item.id))
  const dueIds = new Set([...getDue().map((item) => item.id), ...cards.filter((item) => !scheduledIds.has(item.id)).map((item) => item.id)])
  const visible = onlyDue ? cards.filter((card) => dueIds.has(card.id)) : cards
  const card = visible[Math.min(current, visible.length - 1)]

  const save = (next) => {
    setCards(next)
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, 200)))
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
      ], { max_tokens: 1400 })
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

  const rate = (remembered) => {
    recordResult({ id: card.id, topic: card.topic, front: card.front, back: card.back, source: 'flashcard' }, remembered)
    setProgress(recordStudy())
    setFlipped(false)
    if (onlyDue) setCurrent((n) => Math.min(n, Math.max(0, visible.length - 2)))
    else setCurrent((n) => (n + 1) % visible.length)
  }

  return <main className="pt-28 pb-24 max-w-3xl mx-auto px-6 space-y-6">
    <h1 className="font-display text-4xl font-bold">Flashcards com IA</h1>
    <p className="text-gray-600 dark:text-white/70">Gere cartões por assunto e revise no ritmo de repetição espaçada. Salvos neste navegador.</p>
    <form onSubmit={generate} className="glass rounded-2xl p-5 flex flex-wrap gap-3">
      <input aria-label="Assunto dos flashcards" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Fotossíntese" className="flex-1 min-w-48 glass rounded-xl px-4 py-2 bg-transparent" />
      <button disabled={loading} className="px-5 py-2 rounded-xl bg-neon-cyan text-ink-950 font-semibold disabled:opacity-50">{loading ? 'Gerando…' : 'Gerar 5 cartões'}</button>
    </form>
    {error && <p role="alert" className="text-rose-400">{error}</p>}
    <div className="glass rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
      <span>🔥 {getStreak(progress)} dia(s) · Meta: {todayCount(progress)}/{progress.goal} · {cards.filter((c) => dueIds.has(c.id)).length} cartão(ões) para revisar</span>
      <button onClick={() => { setOnlyDue(!onlyDue); setCurrent(0); setFlipped(false) }} className="text-neon-cyan">{onlyDue ? 'Ver todos' : 'Revisar pendentes'}</button>
    </div>
    {card ? <section className="glass rounded-3xl p-8 space-y-5">
      <p className="text-sm text-gray-500 dark:text-white/60">{card.topic} · {current + 1}/{visible.length}</p>
      <h2 className="text-2xl font-bold whitespace-pre-line">{card.front}</h2>
      {flipped ? <p className="border-t border-white/20 pt-5 whitespace-pre-line">{card.back}</p> : <button onClick={() => setFlipped(true)} className="text-neon-cyan">Mostrar resposta</button>}
      <div className="flex gap-3 flex-wrap">
        {flipped && <><button onClick={() => rate(false)} className="px-4 py-2 rounded-xl glass">Errei · rever amanhã</button><button onClick={() => rate(true)} className="px-4 py-2 rounded-xl bg-neon-cyan text-ink-950">Acertei</button></>}
        <button onClick={() => { setCurrent((n) => (n + 1) % visible.length); setFlipped(false) }} className="px-4 py-2 rounded-xl glass">Próximo</button>
        <button onClick={() => { if (window.confirm('Excluir este cartão?')) { save(cards.filter((c) => c.id !== card.id)); setCurrent(0) } }} className="px-4 py-2 rounded-xl glass">Excluir</button>
      </div>
    </section> : <p>{onlyDue ? 'Nenhum cartão pendente por enquanto.' : 'Gere cartões para começar.'}</p>}
  </main>
}
