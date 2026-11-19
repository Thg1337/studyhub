import { createOriginChecker } from './_origin.js'

const isAllowedOrigin = createOriginChecker()

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

  const q = String(req.query?.q || '').slice(0, 200)
  const maxResults = Math.min(12, Math.max(1, Number(req.query?.maxResults) || 6))

  if (!q.trim()) {
    res.status(400).json({ error: 'Parâmetro q é obrigatório' })
    return
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=${maxResults}&key=${apiKey}`
    const r = await fetch(url)
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      const upstream = r.status < 500 ? (data?.error?.message || r.statusText) : 'Falha no provedor de vídeo'
      res.status(r.status).json({ error: upstream })
      return
    }
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}