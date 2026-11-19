import React from 'react'
// Sem animação de entrada para evitar flicker no Firefox.
import { ArrowRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden pt-28"
    >
      <div className="absolute inset-0 opacity-40" />

      {/* abstract shapes reacting to mouse */}
      <div className="absolute -top-32 -right-20 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-neon-cyan via-neon-violet to-neon-pink opacity-20 blur-3xl" />
      <div className="absolute bottom-0 -left-32 h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-neon-violet to-neon-cyan opacity-20 blur-3xl" />

      <div className="absolute inset-0 noise" />

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-white/80 mb-8">
          <span className="w-2 h-2 rounded-full bg-neon-cyan" />
          Nova geração de aprendizado com IA
        </div>

        <h1 className="font-display font-bold tracking-tighter leading-[0.9] text-[12vw] md:text-[8.5vw] lg:text-[7.5rem]">
          Estude <span className="text-gradient">mais rápido.</span>
          <br />
          Entenda <span className="text-gradient">de verdade.</span>
        </h1>

        <p className="mt-8 max-w-2xl text-lg md:text-xl text-gray-600 dark:text-white/60 leading-relaxed">
          Uma plataforma imersiva que combina aulas interativas, quizzes inteligentes e um tutor de IA
          que simplifica qualquer assunto em segundos.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/explore"
            className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold bg-white text-ink-950 hover:scale-[1.02] transition-transform"
          >
            Começar agora
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/quiz/Matemática"
            className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold glass hover:bg-white/10 transition-colors"
          >
            <Play className="w-4 h-4" /> Ver demonstração
          </Link>
        </div>

        <div className="mt-20 flex items-center gap-6 text-gray-400 dark:text-white/40 text-sm">
          <div className="h-px w-12 bg-white/20" />
          Role para explorar
        </div>
      </div>
    </section>
  )
}