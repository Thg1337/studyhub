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
    return text
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