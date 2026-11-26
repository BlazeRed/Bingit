/**
 * Simkl AUTH V2 session (authorization code + PKCE, public client).
 *
 * A Simkl grant has exactly one live access token: each refresh invalidates the
 * previous one. All tabs therefore share one session in IndexedDB, and refresh
 * under a Web Lock.
 */
import { clear, del, get, set } from 'idb-keyval'

import { ApiError, readJson } from '@/api/http'
import { simklUrl } from '@/api/simkl-url'
import { codeChallenge, randomToken } from './pkce'

const SESSION_KEY = 'session'
const PENDING_KEY = 'bingit-oauth'
const LOCK_NAME = 'bingit-session'
/** Held while the library is written, so sign-in and sign-out can't race a sync. */
export const SYNC_LOCK = 'bingit-sync'
const SCOPE = 'media:read media:write'
const EXPIRY_MARGIN_MS = 5 * 60 * 1000

interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}

export class SignedOutError extends Error {
  constructor() {
    super('Your Simkl session ended. Sign in again.')
    this.name = 'SignedOutError'
  }
}

const redirectUri = () => `${location.origin}/callback`

/** Builds the Simkl consent URL and remembers the PKCE values for the callback. */
export async function createAuthorizeUrl(): Promise<string> {
  const clientId = import.meta.env.VITE_SIMKL_CLIENT_ID
  if (!clientId) throw new Error('VITE_SIMKL_CLIENT_ID is not set. See .env.example.')

  const verifier = randomToken()
  const state = randomToken()
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state }))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri(),
    scope: SCOPE,
    state,
    code_challenge: await codeChallenge(verifier),
    code_challenge_method: 'S256',
  })
  return `https://simkl.com/oauth2/authorize?${params}`
}

async function requestToken(grant: Record<string, string>): Promise<Session> {
  // Form encoding keeps this a "simple" CORS request (no preflight).
  const response = await fetch(simklUrl('/oauth2/token'), {
    method: 'POST',
    body: new URLSearchParams({ ...grant, client_id: import.meta.env.VITE_SIMKL_CLIENT_ID }),
  })
  const token = await readJson<TokenResponse>(response)
  if (!token.scope.includes('media:write')) {
    throw new Error(`Simkl granted read-only access (${token.scope}).`)
  }
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  }
}

/** Handles the query string of the /callback route. */
export async function completeSignIn(query: URLSearchParams): Promise<void> {
  const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? 'null')
  sessionStorage.removeItem(PENDING_KEY)

  if (!pending || query.get('state') !== pending.state) {
    throw new Error('This sign-in link is not valid anymore. Start again.')
  }
  if (query.get('iss') !== 'https://simkl.com') {
    throw new Error('The sign-in response did not come from Simkl.')
  }
  const code = query.get('code')
  if (query.has('error') || !code) throw new Error('Sign-in was cancelled.')

  const session = await requestToken({
    grant_type: 'authorization_code',
    code,
    code_verifier: pending.verifier,
    redirect_uri: redirectUri(),
  })
  await navigator.locks.request(SYNC_LOCK, async () => {
    // Data left by an expired session may belong to another account.
    await clear()
    await set(SESSION_KEY, session)
  })
}

export async function hasSession(): Promise<boolean> {
  return (await get<Session>(SESSION_KEY)) !== undefined
}

const isUsable = (session: Session, staleToken?: string) =>
  session.accessToken !== staleToken && session.expiresAt - Date.now() > EXPIRY_MARGIN_MS

/**
 * Returns a valid access token, refreshing it if needed.
 * Pass `staleToken` after a 401: if another tab already replaced it, that new
 * token is returned without a second refresh.
 */
export async function getAccessToken(staleToken?: string): Promise<string> {
  return navigator.locks.request(LOCK_NAME, async () => {
    const session = await get<Session>(SESSION_KEY)
    if (!session) throw new SignedOutError()
    if (isUsable(session, staleToken)) return session.accessToken

    try {
      const renewed = await requestToken({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      })
      await set(SESSION_KEY, renewed)
      return renewed.accessToken
    } catch (error) {
      // Only a rejected grant ends the session. Offline or 5xx keeps it.
      if (!(error instanceof ApiError) || error.code !== 'invalid_grant') throw error
      await del(SESSION_KEY)
      throw new SignedOutError()
    }
  })
}

export async function clearSession(): Promise<void> {
  await del(SESSION_KEY)
}

/** Revokes the grant and wipes all local data, even when revocation fails. */
export async function signOut(): Promise<void> {
  const revokeAndWipe = async () => {
    const session = await get<Session>(SESSION_KEY)
    if (session) {
      await fetch(simklUrl('/oauth2/revoke'), {
        method: 'POST',
        body: new URLSearchParams({
          token: session.refreshToken,
          client_id: import.meta.env.VITE_SIMKL_CLIENT_ID,
        }),
      }).catch(() => undefined)
    }
    await clear()
  }
  // Same lock order as a sync: library first, then session.
  await navigator.locks.request(SYNC_LOCK, () => navigator.locks.request(LOCK_NAME, revokeAndWipe))
}
