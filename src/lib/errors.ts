import { ApiError } from '@/api/http'

/** Network failures as `fetch` words them in Chrome, Firefox and Safari. */
const NETWORK_ERROR = /failed to fetch|networkerror|load failed/i

/** A message the user can act on. */
export function messageOf(cause: unknown): string {
  if (cause instanceof TypeError && NETWORK_ERROR.test(cause.message)) {
    return 'Cannot reach the server. Check your connection.'
  }
  if (cause instanceof ApiError && cause.status === 429) {
    return 'Too many requests right now. Try again later.'
  }
  return cause instanceof Error ? cause.message : 'Something went wrong.'
}
