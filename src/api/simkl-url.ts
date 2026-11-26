import { version } from '../../package.json'

/** Every Simkl request must identify the app with these three parameters. */
export function simklUrl(
  path: string,
  query: Record<string, string> = {},
  host = 'https://api.simkl.com',
): string {
  const params = new URLSearchParams({
    ...query,
    client_id: import.meta.env.VITE_SIMKL_CLIENT_ID,
    'app-name': 'bingit',
    'app-version': version,
  })
  return `${host}${path}?${params}`
}
