import { createOriginChecker } from './_origin.js'

const isAllowedOrigin = createOriginChecker()

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages
    .slice(0, 40)
    .map((m) => {
      const role = m?.role === 'assistant' ? 'assistant' : 'user'
      return { role, content: String(m?.content ?? '').slice(0, 4000) }
    })
    .filter((m) => m.content.trim().length > 0)
}

const ALLOWED_MODELS = /^[a-zA-Z0-9][a-zA-Z0-9._/\-]{0,79}$/

const UPSTREAM_TIMEOUT_MS = 25000

export default async function handler(req, res) {
  if (!isAllowedOrigin(req)) {
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

  const body = req.body || {}
  const messages = sanitizeMessages(body.messages)
  if (messages.length === 0) {
    res.status(400).json({ error: 'messages é obrigatório' })
    return
  }
  const system = String(body.system || '').slice(0, 4000).trim()
  const finalMessages = system ? [{ role: 'system', content: system }, ...messages] : messages

  const requestedModel = String(body.model || 'openai/gpt-oss-20b').slice(0, 80)
  const model = ALLOWED_MODELS.test(requestedModel) ? requestedModel : 'openai/gpt-oss-20b'
  const temperature = Math.min(2, Math.max(0, Number(body.temperature) || 0.7))
  const max_tokens = Math.min(4096, Math.max(1, Number(body.max_tokens) || 1024))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages: finalMessages, temperature, max_tokens }),
      signal: controller.signal
    })

    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      const upstream = r.status < 500 ? (data?.error?.message || r.statusText) : 'Falha no provedor de IA'
      res.status(r.status).json({ error: upstream })
      return
    }
    res.status(200).json(data)
  } catch (e) {
    if (e?.name === 'AbortError') {
      res.status(504).json({ error: 'Tempo esgotado ao consultar a IA' })
      return
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  } finally {
    clearTimeout(timeout)
  }
}