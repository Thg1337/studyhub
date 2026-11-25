import { createOriginChecker } from './_origin.js'

const isAllowedOrigin = createOriginChecker()

function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length > 40) return null
  if (messages.some((m) => typeof m?.content !== 'string' || m.content.length > 4000)) return null
  if (messages.reduce((total, m) => total + m.content.length, 0) > 40000) return null
  return messages
    .map((m) => {
      const role = m?.role === 'assistant' ? 'assistant' : 'user'
      return { role, content: m.content }
    })
    .filter((m) => m.content.trim().length > 0)
}

const MODEL = 'openai/gpt-oss-20b'

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
  if (!messages || messages.length === 0 || typeof body.system !== 'undefined' && (typeof body.system !== 'string' || body.system.length > 4000)) {
    res.status(400).json({ error: 'Mensagens inválidas ou acima do limite' })
    return
  }
  const system = String(body.system || '').trim()
  const finalMessages = system ? [{ role: 'system', content: system }, ...messages] : messages

  if (body.model && body.model !== MODEL) {
    res.status(400).json({ error: 'Modelo não permitido' })
    return
  }
  const requestedTemperature = body.temperature == null ? 0.7 : Number(body.temperature)
  const temperature = Number.isFinite(requestedTemperature)
    ? Math.min(2, Math.max(0, requestedTemperature))
    : 0.7
  const max_tokens = Math.min(3000, Math.max(1, Number(body.max_tokens) || 1024))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: MODEL, messages: finalMessages, temperature, max_tokens }),
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
