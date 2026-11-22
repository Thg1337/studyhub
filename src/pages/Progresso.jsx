import React from 'react'
import { BarChart3, Clock3, Flame, Target, TrendingUp } from 'lucide-react'
import { exportStudyData, importStudyData } from '../lib/dataTransfer.js'

const formatTime = (milliseconds) => {
  const minutes = Math.round(milliseconds / 60000)
  if (!minutes) return '—'
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes} min`
}

export default function Progresso() {
  const [progress, setProgress] = React.useState(getProgress)
  const [dashboard, setDashboard] = React.useState(getDashboard)
  // Recarrega apenas quando a página é montada; evitar piscar ao trocar de aba.
  const max = Math.max(...dashboard.week.map((day) => day.count), 1)

  return <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
    <div className="mb-9">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-gray-600 dark:text-white/70"><BarChart3 className="h-3 w-3 text-neon-cyan" /> Seu progresso</div>
      <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Painel de <span className="text-gradient">estudos</span></h1>
      <p className="mt-3 text-gray-600 dark:text-white/60">Indicadores locais das questões que você respondeu neste navegador.</p>
    </div>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { icon: Target, label: 'Questões respondidas', value: dashboard.total, detail: `${dashboard.correct} acertos` },
        { icon: TrendingUp, label: 'Taxa de acerto', value: `${dashboard.rate}%`, detail: 'em todas as matérias' },
        { icon: Clock3, label: 'Tempo registrado', value: formatTime(dashboard.durationMs), detail: 'durante questões respondidas' },
        { icon: Flame, label: 'Sequência atual', value: `${getStreak(progress)} dia${getStreak(progress) === 1 ? '' : 's'}`, detail: 'dias com estudo registrado' }
      ].map(({ icon: Icon, label, value, detail }) => <article key={label} className="glass rounded-2xl p-5">
        <Icon className="mb-4 h-5 w-5 text-neon-cyan" />
        <p className="text-sm text-gray-600 dark:text-white/60">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-white/45">{detail}</p>
      </article>)}
    </section>
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <article data-reveal className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between gap-4"><div><h2 className="font-display text-xl font-bold">Meta diária</h2><p className="mt-1 text-sm text-gray-600 dark:text-white/60">{todayCount(progress)} de {progress.goal} questões hoje</p></div><label className="text-sm">Meta <input aria-label="Meta diária de questões" type="number" min="1" max="200" value={progress.goal} onChange={(event) => setProgress(setDailyGoal(event.target.value))} className="ml-2 w-16 rounded-lg border border-gray-300 bg-transparent px-2 py-1 dark:border-white/20" /></label></div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"><div className="bar-smooth bar-grow-x h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-violet" style={{ width: `${Math.min(100, todayCount(progress) / progress.goal * 100)}%` }} /></div>
      </article>
      <article data-reveal className="glass rounded-3xl p-6">
        <h2 className="font-display text-xl font-bold">Atividade da semana</h2>
        {dashboard.total === 0 ? <p className="mt-6 text-sm text-gray-600 dark:text-white/60">Responda a primeira questão para desenhar o gráfico da semana.</p> : <div className="mt-6 flex h-36 items-end gap-3" aria-label="Questões respondidas nos últimos sete dias">
          {dashboard.week.map((day, index) => <div key={day.key} className="flex flex-1 flex-col items-center gap-2"><span className="text-xs">{day.count || ''}</span><div className="bar-grow-y w-full rounded-t-lg bg-gradient-to-t from-neon-cyan to-neon-violet" style={{ height: `${Math.max(day.count ? 12 : 3, day.count / max * 100)}%`, '--bar-delay': `${index * 45}ms` }} title={`${day.count} questões`} /><span className="text-xs text-gray-500 dark:text-white/50">{day.label}</span></div>)}
        </div>}
      </article>
    </section>
    <section data-reveal className="mt-6 glass rounded-3xl p-6">
      <h2 className="font-display text-xl font-bold">Desempenho por matéria</h2>
      {dashboard.bySubject.length ? <div className="mt-5 space-y-4">{dashboard.bySubject.sort((a, b) => b.total - a.total).map((item, index) => <div key={item.subject} className="grid gap-2 sm:grid-cols-[180px_1fr_100px] sm:items-center"><strong className="text-sm">{item.subject}</strong><div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"><div className="bar-grow-x h-full rounded-full bg-neon-cyan" style={{ width: `${item.rate}%`, '--bar-delay': `${index * 50}ms` }} /></div><span className="text-sm text-gray-600 dark:text-white/70">{item.rate}% · {item.correct}/{item.total}</span></div>)}</div> : <p className="mt-4 text-sm text-gray-600 dark:text-white/60">Responda questões na Prática ou nos Simulados para ver sua evolução aqui.</p>}
    </section>
    <section data-reveal className="mt-6 glass rounded-3xl p-6">
      <h2 className="font-display text-xl font-bold">Seus dados</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-white/60">Exporte ou importe progresso, favoritas e flashcards. Tudo fica neste navegador.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={exportStudyData} className="btn btn-ghost">Exportar dados</button>
        <label className="btn btn-ghost cursor-pointer">
          Importar dados
          <input type="file" accept="application/json" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              await importStudyData(file)
              setProgress(getProgress())
              alert('Dados importados. Recarregue a página para atualizar tudo.')
            } catch (err) {
              alert(err.message || 'Erro ao importar.')
            } finally {
              e.target.value = ''
            }
          }} />
        </label>
      </div>
    </section>
  </main>
}
