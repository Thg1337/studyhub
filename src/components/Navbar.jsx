import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Menu, X, Sun, Moon, ArrowUpRight } from 'lucide-react'
import { useTheme } from './ThemeToggle.jsx'

const links = [
  { to: '/', label: 'Início' },
  { to: '/explore', label: 'Explorar' },
  { to: '/simulados', label: 'Simulados' },
  { to: '/flashcards', label: 'Flashcards' },
  { to: '/favoritas', label: 'Favoritas' },
  { to: '/progresso', label: 'Progresso' },
  { to: '/quiz/Matemática', label: 'Prática' }
]

export default function Navbar({ onOpenChat, onPreloadRoute }) {
  const [open, setOpen] = React.useState(false)
  const loc = useLocation()
  const { theme, toggle } = useTheme()
  const isActive = (to) => to === '/quiz/Matemática'
    ? loc.pathname.startsWith('/quiz/')
    : loc.pathname === to

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="glass-strong flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-5 sm:py-3">
          <Link to="/" className="group flex items-center gap-2.5" aria-label="StudyHub — início">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-cyan text-ink-950 transition-transform duration-200 group-hover:-rotate-6">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-[1.05rem] font-bold tracking-tight text-fg">StudyHub</span>
          </Link>

          <nav className="hidden lg:flex lg:items-center lg:gap-0.5" aria-label="Navegação principal">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-active={isActive(link.to)}
                className="nav-link"
                onMouseEnter={() => onPreloadRoute?.(link.to)}
                onFocus={() => onPreloadRoute?.(link.to)}
                aria-current={isActive(link.to) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors duration-150 hover:border-line-strong hover:text-fg"
              aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              <span className="icon-swap" data-state={theme}>
                <Sun className="icon-sun" />
                <Moon className="icon-moon" />
              </span>
            </button>

            <button onClick={onOpenChat} className="btn btn-primary !hidden !px-4 !py-2.5 lg:!inline-flex">
              <Sparkles className="h-4 w-4" /> Tutor IA
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg lg:hidden"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              id="menu-mobile"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="nav-sheet glass-strong mt-2 rounded-2xl p-3 lg:hidden"
            >
              <nav className="flex flex-col" aria-label="Navegação móvel">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => onPreloadRoute?.(link.to)}
                    onFocus={() => onPreloadRoute?.(link.to)}
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-fg"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3.5 w-3.5 text-faint" />
                  </Link>
                ))}
              </nav>
              <button
                onClick={() => { setOpen(false); onOpenChat() }}
                className="btn btn-primary mt-2 w-full"
              >
                <Sparkles className="h-4 w-4" /> Abrir tutor IA
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
