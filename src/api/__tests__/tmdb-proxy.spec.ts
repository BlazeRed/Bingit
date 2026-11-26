// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import tmdbProxy from '../../../netlify/functions/tmdb'

const fetchMock = vi.fn<typeof fetch>()
const call = (path: string, init?: RequestInit) =>
  tmdbProxy(new Request(`https://bingit.test/api/tmdb/${path}`, init))

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('TMDB_TOKEN', 'secret')
})

describe('tmdb proxy', () => {
  it('forwards an allowed path and query with the token', async () => {
    const response = await call('movie/550?append_to_response=credits')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/550?append_to_response=credits',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    )
    expect(response.headers.get('Netlify-CDN-Cache-Control')).toContain('s-maxage')
  })

  it.each(['account/1', 'movie/550/rating', 'movie/abc', 'movie/%2e%2e/account'])(
    'rejects %s without calling TMDB',
    async (path) => {
      await expect(call(path)).resolves.toHaveProperty('status', 404)
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it('rejects writes', async () => {
    await expect(call('movie/550', { method: 'POST' })).resolves.toHaveProperty('status', 405)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not cache errors', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }))

    const response = await call('tv/1')

    expect(response.status).toBe(429)
    expect(response.headers.has('Netlify-CDN-Cache-Control')).toBe(false)
  })
})
