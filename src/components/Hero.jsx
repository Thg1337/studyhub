import React from 'react'
import { ArrowRight, Check, Flame, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

const facts = [
  ['180 questões', '1 simulado completo'],
  ['5h30', 'no ritmo do ENEM'],
  ['100% gratuito', 'sem cadastro']
]

const options = [
  { key: 'A', text: 'R$ 135,00' },
  { key: 'B', text: 'R$ 140,00' },
  { key: 'C', text: 'R$ 150,00', correct: true },
  { key: 'D', text: 'R$ 160,00' }
]

function QuestionPreview() {
  return (
    <div className="hero-preview reveal relative" style={{ '--reveal-delay': '160ms' }}>
      <div className="preview">
        <div className="preview-bar">
          <span className="inline-flex items-center gap-2">
            <span className="preview-dots" aria-hidden="true"><i /><i /><i /></span>
            Prática · Matemática
          </span>
          <span className="preview-live"><i aria-hidden="true" /> ao vivo</span>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-faint">
            <span>Questão 07 / 20</span>
            <span className="inline-flex items-center gap-1.5 text-muted"><Flame className="h-3.5 w-3.5 text-accent" /> 7 dias</span>
          </div>

          <p className="mt-4 text-[0.95rem] leading-relaxed text-fg">
            Uma loja vende um produto por R$ 120,00. No mês seguinte, o preço sobe 25%.
            Qual é o novo preço?
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {options.map((option) => (
              <div key={option.key} className={`opt ${option.correct ? 'opt-correct' : ''}`}>
                <span className="opt-key">{option.key}</span>
                <span className="flex-1">{option.text}</span>
                {option.correct && <Check className="h-3.5 w-3.5 text-accent" />}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-accent">
              <Check className="h-3.5 w-3.5" /> Correto
            </p>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted">
              25% de 120 = 30. Somando ao valor original: 120 + 30 = R$ 150,00.
            </p>
          </div>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--line)]">
            <div className="h-full w-[35%] rounded-full bg-neon-cyan" />
          </div>
        </div>
      </div>

    </div>
  )
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 lg:flex lg:min-h-[100svh] lg:items-center lg:pb-16 lg:pt-36">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-6 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
        <div>
          <p className="eyebrow reveal" style={{ '--reveal-delay': '0ms' }}>
            <span className="eyebrow-dot" aria-hidden="true" />
            Banco gratuito de questões
          </p>

          <h1 className="display-title mt-5 font-display text-[clamp(2.05rem,4.7vw,3.9rem)] font-bold">
            <span className="reveal block" style={{ '--reveal-delay': '70ms' }}>Estude mais rápido.</span>
            <span className="reveal block" style={{ '--reveal-delay': '140ms' }}>
              Entenda <span className="text-accent">de verdade.</span>
            </span>
          </h1>

          <p className="reveal body-copy mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg" style={{ '--reveal-delay': '210ms' }}>
            Questões reais do ENEM, correção comentada e um tutor de IA que explica cada erro
            no seu ritmo — com o progresso salvo no seu navegador.
          </p>

          <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" style={{ '--reveal-delay': '280ms' }}>
            <Link to="/explore" className="btn btn-primary w-full sm:w-auto">
              Começar agora <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/quiz/Matemática" className="btn btn-ghost w-full sm:w-auto">
              <Play className="h-3.5 w-3.5" /> Praticar Matemática
            </Link>
          </div>

          <dl className="reveal mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-4" style={{ '--reveal-delay': '350ms' }}>
            {facts.map(([term, detail]) => (
              <div key={term}>
                <dt className="font-display text-sm font-semibold text-fg">{term}</dt>
                <dd className="mt-0.5 text-xs text-faint">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <QuestionPreview />
      </div>
    </section>
  )
}
