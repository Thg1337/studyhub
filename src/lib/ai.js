export function cleanAIResponse(text) {
  if (!text) return text
  let out = String(text)

  // Conversões LaTeX comuns para texto legível
  const latexMap = [
    [/\\varphi\b/g, 'φ'],
    [/\\phi\b/g, 'φ'],
    [/\\equiv\b/g, '≡'],
    [/\\le\b/g, '≤'],
    [/\\ge\b/g, '≥'],
    [/\\neq\b/g, '≠'],
    [/\\approx\b/g, '≈'],
    [/\\infty\b/g, '∞'],
    [/\\cdot\b/g, '·'],
    [/\\times\b/g, '×'],
    [/\\sum\b/g, 'Σ'],
    [/\\prod\b/g, '∏'],
    [/\\pmod\{([^}]*)\}/g, '(mod $1)'],
    [/\\text\{([^}]*)\}/g, '$1'],
    [/\\sqrt\{([^}]*)\}/g, '√($1)'],
    [/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)'],
    [/\\left\(/g, '('],
    [/\\right\)/g, ')'],
    [/\\left\[/g, '['],
    [/\\right\]/g, ']'],
    [/\\left\{/g, '{'],
    [/\\right\}/g, '}'],
    [/\\{/g, '{'],
    [/\\}/g, '}'],
  ]
  for (const [re, rep] of latexMap) out = out.replace(re, rep)

  // Exponentes e subscritos LaTeX -> notação legível
  out = out.replace(/([a-zA-Z0-9)])\^{([^}]+)}/g, '$1^($2)')
  out = out.replace(/([a-zA-Z0-9)])_\{([^}]+)\}/g, '$1_($2)')

  // Remove comandos de espaçamento LaTeX
  out = out.replace(/\\(;|,|!|quad|qquad)\b/g, ' ')

  // Remove cercas de código markdown
  out = out.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, '').trim())
  // Remove delimitadores LaTeX soltos
  out = out.replace(/\\\(|\\\)|\\\[|\\\]/g, '')
  // Remove quebras de linha LaTeX
  out = out.replace(/\\\\/g, '\n')
  // Remove títulos markdown (# ## ###)
  out = out.replace(/^#{1,6}\s*/gm, '')
  // Remove negrito/itálico markdown
  out = out.replace(/\*\*(.+?)\*\*/g, '$1')
  out = out.replace(/__(.+?)__/g, '$1')
  out = out.replace(/\*(.+?)\*/g, '$1')
  out = out.replace(/_(.+?)_/g, '$1')
  // Remove crases de código inline
  out = out.replace(/`([^`]+)`/g, '$1')

  // Colapsa espaços múltiplos
  out = out.replace(/[ \t]{2,}/g, ' ')
  return out.trim()
}

export async function askAI(messages, options = {}) {
  const systemParts = []
  const rest = []
  for (const m of Array.isArray(messages) ? messages : []) {
    if (m?.role === 'system') systemParts.push(String(m?.content ?? ''))
    else rest.push({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content ?? '') })
  }
  const system = systemParts.join('\n\n').slice(0, 4000)

  const doFetch = async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: rest,
        system,
        max_tokens: options.max_tokens || 1024,
        temperature: options.temperature ?? 0.7,
        model: options.model
      })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `IA indisponível (${response.status})`)
    }
    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error('A IA não retornou uma resposta.')
    return cleanAIResponse(text)
  }

  // Uma tentativa de retry em falhas transitórias (rede ou 5xx).
  try {
    return await doFetch()
  } catch (err) {
    const msg = String(err?.message || '')
    const transient = /indisponível \((5\d\d|429)\)|network|fetch/i.test(msg)
    if (!transient) throw err
    await new Promise((r) => setTimeout(r, 800))
    return doFetch()
  }
}