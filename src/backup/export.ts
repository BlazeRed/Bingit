import { getAllItems } from '@/api/simkl'
import type { SimklAllItems, SimklItemsKey } from '@/api/simkl-types'
import { toBackup } from './format'

const FULL = { extended: 'full', include_all_episodes: 'yes', episode_watched_at: 'yes' }

/** A complete copy straight from Simkl: three requests, started by the user. */
export async function fetchBackup() {
  const responses: SimklAllItems[] = []
  const keys: SimklItemsKey[] = ['shows', 'movies', 'anime']
  // Sequential, as Simkl asks for large pulls.
  for (const key of keys) responses.push(await getAllItems(FULL, key))
  return toBackup(responses, new Date())
}

export function download(name: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  link.click()
  URL.revokeObjectURL(url)
}
