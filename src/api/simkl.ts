import { getAccessToken, SignedOutError, clearSession } from '@/auth/session'
import { ApiError, readJson } from './http'
import { simklUrl } from './simkl-url'
import type {
  SimklActivities,
  SimklAllItems,
  SimklItemsKey,
  SimklUserSettings,
} from './simkl-types'

/**
 * Cached catalog endpoints (details, episode lists). No Authorization header:
 * it would bypass Simkl's edge cache and count against the user's quota.
 */
export async function simklCatalog<T>(path: string, query?: Record<string, string>): Promise<T> {
  return readJson<T>(await fetch(simklUrl(path, query)))
}

interface UserRequest {
  query?: Record<string, string>
  /** Presence of a body makes the request a POST. */
  body?: unknown
}

/** User endpoints. Retries once with a new token after a 401. */
export async function simklUser<T>(path: string, request: UserRequest = {}): Promise<T> {
  const send = (token: string) =>
    fetch(simklUrl(path, request.query), {
      method: request.body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(request.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    })

  const token = await getAccessToken()
  let response = await send(token)
  if (response.status === 401) response = await send(await getAccessToken(token))

  try {
    return await readJson<T>(response)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    await clearSession()
    throw new SignedOutError()
  }
}

export const getUserSettings = () => simklUser<SimklUserSettings>('/users/settings')

export const getActivities = () => simklUser<SimklActivities>('/sync/activities')

/** Never call without checking `getActivities` first, except for the first import. */
export const getAllItems = (query: Record<string, string>, type?: SimklItemsKey) =>
  simklUser<SimklAllItems>(type ? `/sync/all-items/${type}` : '/sync/all-items', { query })

export const getRatings = (query: Record<string, string>) =>
  simklUser<SimklAllItems>('/sync/ratings', { query })
