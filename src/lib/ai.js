export async function askAI(messages, options = {}) {
  // Prompts de sistema são extraídos e enviados separadamente, para que o servidor
  // possa injetá-los de forma controlada (sem aceitar role "system" no meio da conversa).
  const systemParts = []
  const rest = []
  for (const m of Array.isArray(messages) ? messages : []) {
    if (m?.role === 'system') systemParts.push(String(m?.content ?? ''))
    else rest.push({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content ?? '') })
  }
  const system = systemParts.join('\n\n').slice(0, 4000)

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