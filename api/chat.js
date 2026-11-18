export default async function handler(req, res) {
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
    const { messages, model, temperature, max_tokens } = body

    if (!Array.isArray(messages)) {
      res.status(400).json({ error: 'messages deve ser um array' })
      return
    }

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-20b',
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 512
      })
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