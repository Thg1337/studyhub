import React from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import TiltCard from './TiltCard.jsx'
import { BookOpen, Calculator, Globe, FlaskConical, Zap, Leaf } from 'lucide-react'

const subjects = [
  { name: 'Matemática', icon: Calculator, color: 'from-neon-cyan to-neon-violet', desc: 'Álgebra, funções e geometria (ENEM)' },
  { name: 'Física', icon: Zap, color: 'from-neon-violet to-neon-pink', desc: 'Mecânica, termologia e óptica (ENEM)' },
  { name: 'Química', icon: FlaskConical, color: 'from-neon-lime to-neon-cyan', desc: 'Atomística, físico-química e orgânica (ENEM)' },
  { name: 'Biologia', icon: Leaf, color: 'from-neon-pink to-neon-violet', desc: 'Ecologia, genética e fisiologia (ENEM)' },
  { name: 'História', icon: Globe, color: 'from-neon-cyan to-neon-lime', desc: 'Brasil, mundo e atualidades (ENEM)' },
  { name: 'Português', icon: BookOpen, color: 'from-neon-violet to-neon-cyan', desc: 'Interpretação, gramática e redação (ENEM)' }
]

export default function SubjectCards() {
  const ref = React.useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="max-w-7xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end justify-between mb-12 flex-wrap gap-4"
      >
        <div>
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            Escolha sua <span className="text-gradient">matéria</span>
          </h2>
          <p className="text-gray-600 dark:text-white/60 mt-3 max-w-xl">
            Mergulhe em conteúdos organizados, com aulas e prática guiadas por IA.
          </p>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <TiltCard className="group cursor-pointer" intensity={10}>
              <Link to={`/explore?topic=${encodeURIComponent(s.name)}`} className="block">
                <div className="glass rounded-3xl p-7 h-full relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:border-gray-300 dark:border-white/20">
                  <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${s.color} blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
                  <div className="relative" style={{ transform: 'translateZ(20px)' }}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5 shadow-glow`}>
                      <s.icon className="w-6 h-6 text-ink-950" />
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-2">{s.name}</h3>
                    <p className="text-gray-600 dark:text-white/60 text-sm mb-6">{s.desc}</p>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-white/70 group-hover:text-neon-cyan transition-colors">
                      Explorar
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  )
}