import { createOriginChecker } from './_origin.js'

const isAllowedOrigin = createOriginChecker()
const UPSTREAM_TIMEOUT_MS = 15000

export default async function handler(req, res) {
  if (!isAllowedOrigin(req)) {
    res.status(403).json({ error: 'Origem não permitida' })
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'YOUTUBE_API_KEY não configurada no servidor' })
    return
  }

  const q = String(req.query?.q || '').slice(0, 200).trim()
  const maxResults = Math.min(12, Math.max(1, Number(req.query?.maxResults) || 6))

  if (!q) {
    res.status(400).json({ error: 'Parâmetro q é obrigatório' })
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=${maxResults}&key=${apiKey}`
    const r = await fetch(url, { signal: controller.signal })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      const errors = data?.error?.errors
      const quotaReasons = ['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded']
      const limited = r.status === 429 || (r.status === 403 && Array.isArray(errors) &&
        errors.some((entry) => quotaReasons.includes(entry?.reason)))
      res.status(limited ? 429 : 502).json({ error: limited ? 'Limite de busca de vídeos atingido' : 'Falha no provedor de vídeo' })
      return
    }
    res.status(200).json(data)
  } catch (e) {
    if (e?.name === 'AbortError') {
      res.status(504).json({ error: 'Tempo esgotado ao buscar vídeos' })
      return
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  } finally {
    clearTimeout(timeout)
  }
}
