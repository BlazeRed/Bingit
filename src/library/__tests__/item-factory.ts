import type { LibraryItem } from '../item'

export const item = (id: number, over: Partial<LibraryItem> = {}): LibraryItem => ({
  id,
  type: 'tv',
  status: 'watching',
  title: `Title ${id}`,
  year: 2020,
  poster: null,
  runtime: null,
  ids: { simkl: id },
  animeType: null,
  rating: null,
  addedAt: null,
  lastWatchedAt: null,
  nextToWatch: null,
  watchedCount: 0,
  totalCount: 10,
  notAiredCount: 0,
  ...over,
})
