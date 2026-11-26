/**
 * TMDB proxy: keeps TMDB_TOKEN on the server. Anyone can call this endpoint,
 * so it only forwards GET requests for the resources the app reads.
 * Sub-resources (credits, videos, …) come through `append_to_response`.
 */
const ALLOWED_PATH = /^(movie|tv|person)\/\d+$/

export default async function tmdbProxy(request: Request): Promise<Response> {
  if (request.method !== 'GET') return fail(405, 'Method not allowed')

  const { pathname, search } = new URL(request.url)
  const path = pathname.replace('/api/tmdb/', '')
  if (!ALLOWED_PATH.test(path)) return fail(404, 'Unknown TMDB path')

  const token = process.env.TMDB_TOKEN
  if (!token) return fail(500, 'TMDB_TOKEN is not set')

  const upstream = await fetch(`https://api.themoviedb.org/3/${path}${search}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (upstream.ok) {
    headers.set('Cache-Control', 'public, max-age=3600')
    // Served from Netlify's cache for a day, without running the function again.
    headers.set('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=86400')
    headers.set('Netlify-Vary', 'query')
  }
  return new Response(upstream.body, { status: upstream.status, headers })
}

function fail(status: number, message: string): Response {
  return Response.json({ message }, { status })
}

export const config = { path: '/api/tmdb/*' }
