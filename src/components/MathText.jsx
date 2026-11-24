import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

function renderMath(tex, displayMode) {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, output: 'html' })
  } catch {
    return tex
  }
}

// Divide o texto em segmentos de texto puro e fórmulas LaTeX delimitadas por $...$ ou $$...$$.
export default function MathText({ text, className = '' }) {
  const segments = React.useMemo(() => {
    const src = String(text || '').replace(/(^|\n)(?!\s*\$)([^\n]*\\(?:frac|times|cdot)[^\n]*)(?=\n|$)/g, (_match, prefix, formula) => `${prefix}$${formula.trim()}$`)
    const result = []
    // Primeiro, captura blocos $$...$$
    const blockRegex = /\$\$([\s\S]+?)\$\$/g
    let last = 0
    let m
    const parts = []
    while ((m = blockRegex.exec(src)) !== null) {
      if (m.index > last) parts.push({ type: 'text', value: src.slice(last, m.index) })
      parts.push({ type: 'math', value: m[1], display: true })
      last = m.index + m[0].length
    }
    if (last < src.length) parts.push({ type: 'text', value: src.slice(last) })

    // Depois, dentro do texto, captura $...$
    const final = []
    for (const part of parts) {
      if (part.type !== 'text') { final.push(part); continue }
      const inlineRegex = /\$([^$\n]+?)\$/g
      let l = 0
      let mm
      while ((mm = inlineRegex.exec(part.value)) !== null) {
        if (mm.index > l) final.push({ type: 'text', value: part.value.slice(l, mm.index) })
        final.push({ type: 'math', value: mm[1], display: false })
        l = mm.index + mm[0].length
      }
      if (l < part.value.length) final.push({ type: 'text', value: part.value.slice(l) })
    }
    return final.length ? final : [{ type: 'text', value: src }]
  }, [text])

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i} style={{ whiteSpace: 'pre-line' }}>{seg.value}</span>
        }
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: renderMath(seg.value, seg.display) }}
          />
        )
      })}
    </span>
  )
}
