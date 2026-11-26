import { version } from '../../package.json'

/** Every Simkl API request must identify the app with these three parameters. */
export function simklUrl(path: string, query: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    ...query,
    client_id: import.meta.env.VITE_SIMKL_CLIENT_ID,
    'app-name': 'bingit',
    'app-version': version,
  })
  return `https://api.simkl.com${path}?${params}`
}
