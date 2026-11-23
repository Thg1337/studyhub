export function cleanAIResponse(text) {
  if (!text) return text
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/(?<!\\)\\\[\s*/g, () => '\n$$\n')
    .replace(/\s*\\\](?!\])/g, () => '\n$$\n')
    .replace(/(?<!\\)\\\(/g, '$')
    .replace(/(?<!\\)\\\)/g, '$')
    .replace(/\$\$([^\n]+?)\$\$/g, (_match, formula) => `\n\n$$\n${formula.trim()}\n$$\n\n`)
    .replace(/(?:\\(?:;|,|!|quad|qquad)\s*){2,}/g, ' ')
    .trim()
}

export async function askAI(messages, options = {}) {
  const systemParts = []
  const rest = []
  for (const m of Array.isArray(messages) ? messages : []) {
    if (m?.role === 'system') systemParts.push(String(m?.content ?? ''))
    else rest.push({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content ?? '') })
  }
  const system = systemParts.join('\n\n').slice(0, 4000)
  const initialMaxTokens = options.max_tokens || 1024

  const doFetch = async (maxTokens) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: rest,
        system,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.7,
        model: options.model
      })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || `IA indisponível (${response.status})`)
    }
    const data = await response.json()
    const choice = data?.choices?.[0]
    if (choice?.finish_reason === 'length') {
      const error = new Error('A resposta foi interrompida antes de terminar. Tente novamente.')
      error.code = 'response_truncated'
      throw error
    }
    const text = choice?.message?.content?.trim()
    if (!text) throw new Error('A IA não retornou uma resposta.')
    return options.format === 'json' ? text : cleanAIResponse(text)
  }

  const fetchWithRetry = async (maxTokens) => {
    try {
      return await doFetch(maxTokens)
    } catch (err) {
      const msg = String(err?.message || '')
      const transient = /indisponível \((5\d\d|429)\)|network|fetch/i.test(msg)
      if (!transient) throw err
      await new Promise((resolve) => setTimeout(resolve, 800))
      return doFetch(maxTokens)
    }
  }

  try {
    return await fetchWithRetry(initialMaxTokens)
  } catch (err) {
    if (err?.code !== 'response_truncated' || initialMaxTokens >= 3000) throw err
    return fetchWithRetry(Math.min(3000, Math.max(initialMaxTokens + 500, initialMaxTokens * 2)))
  }
}
