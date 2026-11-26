/** The user's daily Simkl allowance, read from the response headers. */

const KEY = 'bingit-quota'
/** Below this share of the allowance, background checks stop. */
const LOW_SHARE = 0.1

export interface Quota {
  limit: number
  remaining: number
  savedAt: number
}

/** Headers are absent on exempt calls and on a new token's first request. */
export function recordQuota(headers: Headers): void {
  const limit = Number(headers.get('X-RateLimit-Limit'))
  const remaining = headers.get('X-RateLimit-Remaining')
  if (!limit || remaining === null) return
  const quota: Quota = { limit, remaining: Number(remaining), savedAt: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(quota))
}

/** Every Simkl quota resets at midnight US Eastern. */
export function nextReset(from: number): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(from)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const elapsed = part('hour') * 3600 + part('minute') * 60 + part('second')
  return new Date(from - (from % 1000) + (86_400 - elapsed) * 1000)
}

/** The last known quota, unless it has reset since. */
export function readQuota(now = Date.now()): Quota | null {
  const quota = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Quota | null
  return quota && now < nextReset(quota.savedAt).getTime() ? quota : null
}

export function isQuotaLow(now = Date.now()): boolean {
  const quota = readQuota(now)
  return quota !== null && quota.remaining < quota.limit * LOW_SHARE
}

export const clearQuota = () => localStorage.removeItem(KEY)
