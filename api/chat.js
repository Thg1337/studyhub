const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.length === 0) return true // dev: allow all
  if (!origin) return true
  return ALLOWED_ORIGINS.includes(origin)
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages
    .slice(0, 40)
    .map((m) => ({
      role: ['system', 'user', 'assistant'].includes(m?.role) ? m.role : 'user',
      content: String(m?.content ?? '').slice(0, 4000)
    }))
    .filter((m) => m.content.trim().length > 0)
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({ error: 'Origem não permitida' })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY não configurada no servidor' })
    return
  }

  try {
    const body = req.body || {}
    const messages = sanitizeMessages(body.messages)
    if (messages.length === 0) {
      res.status(400).json({ error: 'messages é obrigatório' })
      return
    }
    const model = String(body.model || 'openai/gpt-oss-20b').slice(0, 80)
    const temperature = Math.min(2, Math.max(0, Number(body.temperature) || 0.7))
    const max_tokens = Math.min(4096, Math.max(1, Number(body.max_tokens) || 1024))

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    })

    const data = await r.json()
    if (!r.ok) {
      res.status(r.status).json({ error: data?.error?.message || r.statusText })
      return
    }
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}