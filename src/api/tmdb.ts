import { readJson } from './http'

/**
 * TMDB v3 GET through our proxy (netlify/functions/tmdb.ts), which adds the
 * token. Response types are added next to the screens that read them.
 */
export async function tmdbGet<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  return readJson<T>(await fetch(`/api/tmdb${path}?${new URLSearchParams(query)}`))
}
