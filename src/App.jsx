import React, { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import SubjectCards from './components/SubjectCards.jsx'
import ChatAI from './components/ChatAI.jsx'
import Quiz from './pages/Quiz.jsx'
import Explore from './pages/Explore.jsx'
import Simulados from './pages/Simulados.jsx'

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="min-h-screen relative">
      <Navbar onOpenChat={() => setChatOpen(true)} />
      <Routes>
        <Route
          path="/"
          element={
            <main>
              <Hero />
              <SubjectCards />
              <section className="max-w-6xl mx-auto px-6 py-24">
                <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
                  Por que estudar aqui?
                </h2>
                <p className="text-white/60 max-w-2xl text-lg">
                  Uma experiência de aprendizado imersiva, com IA que simplifica, personaliza e acelera sua jornada.
                </p>
                <div className="grid md:grid-cols-3 gap-6 mt-12">
                  {[
                    { t: 'IA Tutor', d: 'Explicações adaptadas ao seu ritmo e estilo.' },
                    { t: 'Prática gamificada', d: 'Quizzes com feedback instantâneo.' },
                    { t: 'Progresso vivo', d: 'Visualize sua evolução em tempo real.' }
                  ].map((f) => (
                    <div key={f.t} className="glass rounded-2xl p-6 hover:border-neon-cyan/40 transition-colors">
                      <div className="font-display text-xl font-semibold mb-2 text-gradient">{f.t}</div>
                      <p className="text-white/60 text-sm">{f.d}</p>
                    </div>
                  ))}
                </div>
              </section>
            </main>
          }
        />
        <Route path="/quiz/:subject" element={<Quiz onOpenChat={() => setChatOpen(true)} />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/simulados" element={<Simulados />} />
      </Routes>
      <ChatAI open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}