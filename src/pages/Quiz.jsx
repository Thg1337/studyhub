import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, ArrowLeft, Sparkles } from 'lucide-react'

const quizzes = {
  Matemática: [
    { q: 'A função f(x)=2x+4 tem raiz em:', options: ['x = -2', 'x = 2', 'x = 4', 'x = -4'], correct: 0, explain: '2x+4=0 → x=-2.' },
    { q: 'Em f(x)=ax+b, se a<0 a função é:', options: ['Crescente', 'Decrescente', 'Constante', 'Linear'], correct: 1, explain: 'Coeficiente angular negativo implica função decrescente.' },
    { q: 'A área de um círculo de raio 3 é:', options: ['6π', '9π', '3π', '12π'], correct: 1, explain: 'A=πr²=π·9=9π.' }
  ],
  Física: [
    { q: 'Um corpo em MU percorre 100 m em 20 s. Sua velocidade é:', options: ['4 m/s', '5 m/s', '6 m/s', '20 m/s'], correct: 1, explain: 'v=Δs/Δt=100/20=5 m/s.' },
    { q: 'Segunda Lei de Newton: F =', options: ['m/a', 'm·a', 'a/m', 'm+a'], correct: 1, explain: 'F = m·a.' },
    { q: 'A energia cinética é:', options: ['mgh', '½mv²', 'mcΔT', 'Pt'], correct: 1, explain: 'Ec=½ m v².' }
  ],
  Química: [
    { q: 'O número atômico do carbono é:', options: ['4', '6', '8', '12'], correct: 1, explain: 'Carbono tem 6 prótons.' },
    { q: 'Ligação iônica ocorre entre:', options: ['Dois não-metais', 'Metal e não-metal', 'Dois metais', 'Gases nobres'], correct: 1, explain: 'Transferência de elétrons de metal para não-metal.' },
    { q: 'pH de uma solução neutra a 25°C é:', options: ['0', '7', '14', '1'], correct: 1, explain: 'pH=7 é neutro.' }
  ],
  Biologia: [
    { q: 'A fotossíntese produz:', options: ['CO₂ e água', 'Glicose e O₂', 'ATP e NADH', 'Ácido lático'], correct: 1, explain: '6CO₂+6H₂O → C₆H₁₂O₆+6O₂.' },
    { q: 'Cruzamento Aa x Aa resulta em:', options: ['100% Aa', '75% dominante, 25% recessivo', '50/50', '100% recessivo'], correct: 1, explain: 'Proporção genotípica 1:2:1, fenotípica 3:1.' },
    { q: 'O sistema que transporta O₂ no corpo é o:', options: ['Digestório', 'Respiratório', 'Circulatório', 'Excretor'], correct: 2, explain: 'Sangue transporta O₂.' }
  ],
  História: [
    { q: 'A Proclamação da República no Brasil ocorreu em:', options: ['1822', '1888', '1889', '1930'], correct: 2, explain: '15 de novembro de 1889.' },
    { q: 'A Revolução Francesa começou em:', options: ['1776', '1789', '1848', '1917'], correct: 1, explain: '1789.' },
    { q: 'O período da Ditadura Militar no Brasil foi:', options: ['1930-1945', '1964-1985', '1985-1990', '1990-2000'], correct: 1, explain: '1964 a 1985.' }
  ],
  Português: [
    { q: 'Na frase "Os meninos jogaram", o sujeito é:', options: ['simples', 'composto', 'oculto', 'inexistente'], correct: 0, explain: 'Sujeito simples: "Os meninos".' },
    { q: 'A crase ocorre em:', options: ['Vou a praia', 'Vou à praia', 'Vou a casa', 'Vou ao mercado'], correct: 1, explain: 'Preposição "a" + artigo "a" = à.' },
    { q: 'A redação do ENEM é:', options: ['Narração', 'Dissertação-argumentativa', 'Descritiva', 'Poema'], correct: 1, explain: 'Dissertação-argumentativa.' }
  ]
}

export default function Quiz({ onOpenChat }) {
  const { subject } = useParams()
  const qs = quizzes[subject] || quizzes.Matemática
  const [idx, setIdx] = React.useState(0)
  const [selected, setSelected] = React.useState(null)
  const [showFeedback, setShowFeedback] = React.useState(false)
  const [score, setScore] = React.useState(0)
  const [finished, setFinished] = React.useState(false)

  const current = qs[idx]

  const handleSelect = (i) => {
    if (showFeedback) return
    setSelected(i)
    setShowFeedback(true)
    if (i === current.correct) setScore((s) => s + 1)
  }

  const next = () => {
    if (idx + 1 < qs.length) {
      setIdx(idx + 1)
      setSelected(null)
      setShowFeedback(false)
    } else {
      setFinished(true)
    }
  }

  const reset = () => {
    setIdx(0); setSelected(null); setShowFeedback(false); setScore(0); setFinished(false)
  }

  return (
    <div className="pt-28 pb-24 max-w-3xl mx-auto px-6">
      <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="mb-8">
        <div className="text-xs text-white/50 mb-2">Prática · {subject}</div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-violet"
            animate={{ width: `${((idx + (finished ? 1 : 0)) / qs.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!finished ? (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl p-8"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6 leading-snug">{current.q}</h2>
            <div className="space-y-3">
              {current.options.map((opt, i) => {
                const isCorrect = i === current.correct
                const isSelected = i === selected
                let cls = 'glass hover:bg-white/10'
                if (showFeedback) {
                  if (isCorrect) cls = 'bg-emerald-500/20 border-emerald-400/60'
                  else if (isSelected) cls = 'bg-rose-500/20 border-rose-400/60'
                  else cls = 'glass opacity-50'
                }
                return (
                  <motion.button
                    key={i}
                    onClick={() => handleSelect(i)}
                    whileHover={!showFeedback ? { scale: 1.01, x: 4 } : {}}
                    whileTap={!showFeedback ? { scale: 0.98 } : {}}
                    animate={isSelected ? { scale: [1, 1.04, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className={`w-full text-left px-5 py-4 rounded-2xl border border-white/10 font-medium transition-colors ${cls}`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className={`mt-6 rounded-2xl p-5 border ${
                    selected === current.correct
                      ? 'bg-emerald-500/15 border-emerald-400/40 shadow-[0_0_40px_-10px_rgba(52,211,153,0.5)]'
                      : 'bg-rose-500/15 border-rose-400/40 shadow-[0_0_40px_-10px_rgba(251,113,133,0.5)]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {selected === current.correct ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-400" />
                    )}
                    <span className="font-display font-bold text-lg">
                      {selected === current.correct ? 'Correto!' : 'Quase lá'}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm">{current.explain}</p>
                  <button
                    onClick={next}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-white text-ink-950 text-sm"
                  >
                    Próxima →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-3xl p-10 text-center"
          >
            <div className="font-display text-6xl font-bold text-gradient mb-2">{score}/{qs.length}</div>
            <p className="text-white/60 mb-6">Sua pontuação final</p>
            <div className="flex justify-center gap-3">
              <button onClick={reset} className="px-6 py-3 rounded-2xl font-semibold glass hover:bg-white/10">Repetir</button>
              <button onClick={onOpenChat} className="px-6 py-3 rounded-2xl font-semibold bg-gradient-to-r from-neon-cyan to-neon-violet text-ink-950 inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Pedir ajuda à IA
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}