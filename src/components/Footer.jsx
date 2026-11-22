import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react'

const studyLinks = [
  { to: '/explore', label: 'Explorar matérias' },
  { to: '/quiz/Matemática', label: 'Prática guiada' },
  { to: '/simulados', label: 'Simulado completo' }
]

const trackLinks = [
  { to: '/progresso', label: 'Painel de progresso' },
  { to: '/flashcards', label: 'Flashcards' },
  { to: '/favoritas', label: 'Questões favoritas' }
]

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="StudyHub — início">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-cyan text-ink-950">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-fg">StudyHub</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Questões reais do ENEM, correção comentada e um tutor que explica o erro
            em vez de só mostrar o gabarito.
          </p>
        </div>

        <nav aria-label="Estudar">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">Estudar</h2>
          <ul className="mt-4 space-y-2.5">
            {studyLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="inline-flex items-center gap-1 text-sm text-muted transition-colors duration-150 hover:text-fg">
                  {link.label}
                  <ArrowUpRight className="h-3 w-3 text-faint" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Acompanhar">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">Acompanhar</h2>
          <ul className="mt-4 space-y-2.5">
            {trackLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="inline-flex items-center gap-1 text-sm text-muted transition-colors duration-150 hover:text-fg">
                  {link.label}
                  <ArrowUpRight className="h-3 w-3 text-faint" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-6 text-xs text-faint">
        <p>© 2026 StudyHub. Seus dados ficam salvos neste navegador.</p>
        <p>Quando você usa o tutor IA ou busca vídeos, o assunto digitado é enviado ao serviço correspondente. Exporte seus dados para não perder nada.</p>
      </div>
    </footer>
  )
}
