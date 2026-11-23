import React, { useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import SubjectCards from './components/SubjectCards.jsx'
import Footer from './components/Footer.jsx'
import ChatAI from './components/ChatAI.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { ThemeProvider } from './components/ThemeToggle.jsx'

import Quiz from './pages/Quiz.jsx'
import Explore from './pages/Explore.jsx'
import Simulados from './pages/Simulados.jsx'
import Flashcards from './pages/Flashcards.jsx'
import Favoritas from './pages/Favoritas.jsx'
import Progresso from './pages/Progresso.jsx'

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
  const [chatOpen, setChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState('')
  const location = useLocation()

  return (
    <MotionConfig reducedMotion="never">
    <ThemeProvider>
      <ToastProvider>
        <div className="relative min-h-screen">
          <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo principal</a>
          <Navbar onOpenChat={() => { setChatContext(''); setChatOpen(true) }} />
            <div
              key={location.pathname}
              id="conteudo-principal"
              tabIndex="-1"
              className={location.pathname === '/' ? undefined : 'page-enter'}
            >
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
          <Footer />
          <ChatAI open={chatOpen} onClose={() => setChatOpen(false)} context={chatContext} />
        </div>
      </ToastProvider>
    </ThemeProvider>
    </MotionConfig>
  )
}
