export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'YOUTUBE_API_KEY não configurada no servidor' })
    return
  }

  const q = req.query?.q || ''
  const maxResults = req.query?.maxResults || '6'

  if (!q) {
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