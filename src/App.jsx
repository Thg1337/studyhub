import React, { useDeferredValue, useEffect, useRef, useState, lazy, Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import SubjectCards from './components/SubjectCards.jsx'
import Footer from './components/Footer.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { ThemeProvider } from './components/ThemeToggle.jsx'

const ChatAI = lazy(() => import('./components/ChatAI.jsx'))
const loadQuiz = () => import('./pages/Quiz.jsx')
const loadExplore = () => import('./pages/Explore.jsx')
const loadSimulados = () => import('./pages/Simulados.jsx')
const loadFlashcards = () => import('./pages/Flashcards.jsx')
const loadFavoritas = () => import('./pages/Favoritas.jsx')
const loadProgresso = () => import('./pages/Progresso.jsx')
const Quiz = lazy(loadQuiz)
const Explore = lazy(loadExplore)
const Simulados = lazy(loadSimulados)
const Flashcards = lazy(loadFlashcards)
const Favoritas = lazy(loadFavoritas)
const Progresso = lazy(loadProgresso)

const routeLoaders = {
  '/quiz': loadQuiz,
  '/explore': loadExplore,
  '/simulados': loadSimulados,
  '/flashcards': loadFlashcards,
  '/favoritas': loadFavoritas,
  '/progresso': loadProgresso
}

function preloadRoute(path) {
  const loader = Object.entries(routeLoaders).find(([prefix]) => path.startsWith(prefix))?.[1]
  loader?.()
}

const method = [
  {
    title: 'Diagnóstico, não chute',
    text: 'O índice mostra onde você perde pontos, com faixa de incerteza em vez de um número inventado.'
  },
  {
    title: 'Cada erro vira revisão',
    text: 'A questão errada entra na fila de revisão espaçada e volta no intervalo certo para fixar.'
  },
  {
    title: 'Tutor com contexto',
    text: 'A IA recebe a questão, sua resposta e o gabarito — e explica só o que faltou.'
  }
]

function MethodSection() {
  return (
    <section id="metodo" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-20 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div data-reveal>
            <p className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Método
            </p>
            <h2 className="display-title mt-4 max-w-md font-display text-3xl font-bold sm:text-4xl md:text-5xl">
              Um ciclo que fecha: erro, explicação, revisão.
            </h2>
            <p className="body-copy mt-5 max-w-sm text-sm leading-relaxed text-muted">
              Não é sobre responder mais. É sobre entender por que errou e voltar na hora certa.
            </p>
            <Link to="/progresso" className="btn btn-ghost mt-8">
              Ver meu progresso <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <ol>
          {method.map((item, index) => (
            <li
              key={item.title}
              data-reveal
              style={{ '--reveal-delay': `${index * 60}ms` }}
              className="grid gap-2 border-t border-line py-7 sm:grid-cols-[3rem_1fr]"
            >
              <span className="font-display text-sm font-semibold text-accent">0{index + 1}</span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function ClosingBand() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 sm:pb-24">
      <div className="cta-band" data-reveal>
        <p className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          Comece agora
        </p>
        <h2 className="display-title mt-4 max-w-2xl font-display text-3xl font-bold sm:text-4xl md:text-5xl">
          Uma questão por vez. Até virar rotina.
        </h2>
        <p className="body-copy mt-4 max-w-md text-sm leading-relaxed text-muted">
          Sem cadastro e sem assinatura. Abra a prática e comece pela matéria que você mais precisa.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/quiz/Matemática" className="btn btn-primary">
            Abrir a prática <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/simulados" className="btn btn-ghost">Fazer um simulado</Link>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  // null até a primeira abertura; depois mantemos o tutor montado para preservar a conversa.
  const [chatOpen, setChatOpen] = useState(null)
  const [chatContext, setChatContext] = useState('')
  // Mantém a página atual visível enquanto o código da próxima rota carrega.
  const location = useDeferredValue(useLocation())
  const contentRef = useRef(null)
  const previousPath = useRef(location.pathname)
  const [pageAnnouncement, setPageAnnouncement] = useState('')

  useEffect(() => {
    if (previousPath.current === location.pathname) return
    previousPath.current = location.pathname

    const content = contentRef.current
    const focusTitle = () => {
      const title = content?.querySelector('h1')
      if (!title) return false
      title.tabIndex = -1
      title.focus()
      const name = title.textContent.trim()
      document.title = `${name} | StudyHub`
      setPageAnnouncement(`Página: ${name}`)
      return true
    }

    if (focusTitle()) return
    const observer = new MutationObserver(() => {
      if (focusTitle()) observer.disconnect()
    })
    observer.observe(content, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [location.pathname])

  return (
    <MotionConfig reducedMotion="never">
    <ThemeProvider>
      <ToastProvider>
        <div className="relative min-h-screen">
          <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo principal</a>
          <Navbar onOpenChat={() => { setChatContext(''); setChatOpen(true) }} onPreloadRoute={preloadRoute} />
          <span className="sr-only" role="status" aria-live="polite">{pageAnnouncement}</span>
          <Suspense fallback={<main className="px-6 pt-28" role="status">Carregando página…</main>}>
            <div
              ref={contentRef}
              key={location.pathname}
              id="conteudo-principal"
              tabIndex="-1"
            >
              <div className={location.pathname === '/' ? undefined : 'page-enter'}>
              <Routes location={location}>
                <Route
                  path="/"
                  element={
                    <main aria-label="Página inicial">
                      <Hero />
                      <SubjectCards />
                      <MethodSection />
                      <ClosingBand />
                    </main>
                  }
                />
                <Route path="/quiz/:subject" element={<Quiz onOpenChat={(ctx) => { setChatContext(ctx || ''); setChatOpen(true) }} />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/simulados" element={<Simulados onOpenChat={(ctx) => { setChatContext(ctx); setChatOpen(true) }} />} />
                <Route path="/flashcards" element={<Flashcards />} />
                <Route path="/favoritas" element={<Favoritas onOpenChat={(ctx) => { setChatContext(ctx); setChatOpen(true) }} />} />
                <Route path="/progresso" element={<Progresso />} />
              </Routes>
              </div>
            </div>
          </Suspense>
          <Footer />
          {chatOpen !== null && (
            <Suspense fallback={<div role="status" className="fixed bottom-6 right-6 z-[60] glass-strong rounded-xl px-4 py-3">Abrindo tutor…</div>}>
              <ChatAI open={chatOpen} onClose={() => setChatOpen(false)} context={chatContext} />
            </Suspense>
          )}
        </div>
      </ToastProvider>
    </ThemeProvider>
    </MotionConfig>
  )
}
