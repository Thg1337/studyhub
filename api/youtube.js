const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.length === 0) return true
  if (!origin) return true
  return ALLOWED_ORIGINS.includes(origin)
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && !isAllowedOrigin(origin)) {
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