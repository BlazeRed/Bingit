import { beforeEach, describe, expect, it, vi } from 'vitest'

import { simklUser } from '@/api/simkl'
import { fakeLocks } from './fake-locks'
import { completeSignIn, createAuthorizeUrl, getAccessToken, hasSession, signOut } from '../session'

const db = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => void db.set(key, value),
  del: async (key: string) => void db.delete(key),
  clear: async () => db.clear(),
}))

const fetchMock = vi.fn<typeof fetch>()

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const tokens = (accessToken: string) =>
  json({
    access_token: accessToken,
    refresh_token: 'refresh',
    expires_in: 604800,
    scope: 'media:read media:write',
  })
const storeSession = (accessToken: string, expiresAt = Date.now() + 3_600_000) =>
  db.set('session', { accessToken, refreshToken: 'refresh', expiresAt })

beforeEach(() => {
  db.clear()
  sessionStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('navigator', { locks: fakeLocks() })
  vi.stubEnv('VITE_SIMKL_CLIENT_ID', 'client')
})

async function startSignIn() {
  const url = new URL(await createAuthorizeUrl())
  return new URLSearchParams({
    code: 'code',
    iss: 'https://simkl.com',
    state: url.searchParams.get('state')!,
  })
}

describe('sign in', () => {
  it('stores the session after a valid callback', async () => {
    const query = await startSignIn()
    fetchMock.mockResolvedValue(tokens('first'))

    await completeSignIn(query)

    await expect(getAccessToken()).resolves.toBe('first')
  })

  it.each([
    ['state', 'forged', 'not valid'],
    ['iss', 'https://evil.example', 'did not come from Simkl'],
    ['error', 'access_denied', 'cancelled'],
  ])('rejects a callback with a bad %s without calling Simkl', async (name, value, message) => {
    const query = await startSignIn()
    query.set(name, value)

    await expect(completeSignIn(query)).rejects.toThrow(message)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('refresh', () => {
  it('refreshes once when several callers find an expired token', async () => {
    storeSession('old', Date.now())
    fetchMock.mockResolvedValue(tokens('new'))

    await expect(Promise.all([getAccessToken(), getAccessToken()])).resolves.toEqual(['new', 'new'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reuses a token that another tab already replaced', async () => {
    storeSession('from-other-tab')

    await expect(getAccessToken('stale')).resolves.toBe('from-other-tab')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ends the session when Simkl rejects the grant', async () => {
    storeSession('old', Date.now())
    fetchMock.mockResolvedValue(json({ error: 'invalid_grant' }, 400))

    await expect(getAccessToken()).rejects.toThrow('Sign in again')
    await expect(hasSession()).resolves.toBe(false)
  })

  it('keeps the session when the network fails', async () => {
    storeSession('old', Date.now())
    fetchMock.mockRejectedValue(new TypeError('offline'))

    await expect(getAccessToken()).rejects.toThrow('offline')
    await expect(hasSession()).resolves.toBe(true)
  })

  it('retries a user request once with a new token after a 401', async () => {
    storeSession('old')
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(tokens('new'))
      .mockResolvedValueOnce(json({ ok: true }))

    await expect(simklUser('/sync/activities')).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls[2]![1]?.headers).toMatchObject({ Authorization: 'Bearer new' })
  })
})

describe('sign out', () => {
  it('wipes local data even when revocation fails', async () => {
    storeSession('old')
    fetchMock.mockRejectedValue(new TypeError('offline'))

    await signOut()

    expect(db.size).toBe(0)
  })
})
