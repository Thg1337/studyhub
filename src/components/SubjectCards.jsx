import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Calculator, Globe, FlaskConical, Zap, Leaf, ArrowUpRight } from 'lucide-react'

const subjects = [
  { name: 'Matemática', icon: Calculator, desc: 'Álgebra, funções, geometria e estatística.' },
  { name: 'Física', icon: Zap, desc: 'Mecânica, termologia, óptica e eletricidade.' },
  { name: 'Química', icon: FlaskConical, desc: 'Atomística, físico-química e orgânica.' },
  { name: 'Biologia', icon: Leaf, desc: 'Ecologia, genética e fisiologia humana.' },
  { name: 'História', icon: Globe, desc: 'Brasil, mundo contemporâneo e atualidades.' },
  { name: 'Português', icon: BookOpen, desc: 'Interpretação de texto, gramática e redação.' }
]

export default function SubjectCards() {
  return (
    <section id="materias" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-20 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8" data-reveal>
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Matérias
          </p>
          <h2 className="display-title mt-4 max-w-xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            Escolha por onde começar.
          </h2>
        </div>
        <p className="body-copy max-w-xs text-sm leading-relaxed text-muted">
          Seis frentes do ENEM com aulas, questões e revisão espaçada no mesmo lugar.
        </p>
      </div>

      <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject, index) => (
          <div
            key={subject.name}
            className="h-full"
          >
            <Link
              to={`/explore?topic=${encodeURIComponent(subject.name)}`}
              className="subject-card lift group"
            >
              <div className="flex items-start justify-between">
                <span className="subject-index">0{index + 1}</span>
                <subject.icon className="h-5 w-5 text-faint transition-colors duration-200 group-hover:text-accent" aria-hidden="true" />
              </div>

              <h3 className="mt-8 font-display text-2xl font-bold tracking-tight">{subject.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{subject.desc}</p>

              <span className="subject-cta mt-6">
                Explorar matéria <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
