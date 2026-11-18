export async function askAI(messages, options = {}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens: options.max_tokens || 1024, temperature: options.temperature ?? 0.7 })
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
