// Optional shared daily request budget. Stores only an aggregate UTC-day counter.
const RESERVE = `
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
if used >= tonumber(ARGV[1]) then return 0 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 172800)
return 1
`

export async function reserveChatRequest(env = process.env, now = new Date()) {
  if (!env.CHAT_DAILY_REQUEST_LIMIT) return 'unconfigured'
  const limit = Number(env.CHAT_DAILY_REQUEST_LIMIT)
  if (!Number.isSafeInteger(limit) || limit < 1 || !env.UPSTASH_REDIS_REST_TOKEN) return 'unavailable'

  try {
    const url = new URL(env.UPSTASH_REDIS_REST_URL)
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.upstash.io')) return 'unavailable'
    const day = now.toISOString().slice(0, 10)
    const scope = env.VERCEL_ENV || 'local'
    const response = await fetch(url.origin, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', RESERVE, 1, `studyhub:chat:${scope}:${day}`, limit]),
      redirect: 'error',
      signal: AbortSignal.timeout(2000)
    })
    if (!response.ok) return 'unavailable'
    const { result } = await response.json()
    return result === 1 ? 'allowed' : result === 0 ? 'limited' : 'unavailable'
  } catch { return 'unavailable' }
}
