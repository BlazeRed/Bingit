import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import { fakeLocks } from '@/auth/__tests__/fake-locks'
import type { LibraryItem } from '@/library/item'
import { useLibraryStore } from '@/stores/library'
import LibraryView from '../LibraryView.vue'

const item = (id: number, over: Partial<LibraryItem>): LibraryItem => ({
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

const items = [
  item(1, { title: 'Northbound' }),
  item(2, { title: 'Low Tide' }),
  item(3, { title: 'Fox Signal', type: 'movies', status: 'plantowatch' }),
]

vi.mock('idb-keyval', () => ({ get: async () => undefined }))
vi.mock('@/api/simkl', () => ({}))
vi.mock('@/sync/engine', () => ({
  readLibrary: async () => undefined,
  syncLibrary: async () => ({ items: { ...items }, checkedAt: Date.now() }),
}))

async function mountAt(path: string) {
  vi.stubGlobal('navigator', { locks: fakeLocks() })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library/:type?/:bucket?', name: 'library', component: LibraryView },
      { path: '/:type/:id', name: 'title', component: LibraryView },
    ],
  })
  await router.push(path)
  const pinia = createPinia()
  const wrapper = mount(LibraryView, { global: { plugins: [router, pinia] } })
  await useLibraryStore(pinia).sync()
  await flushPromises()
  return wrapper
}

const titles = (wrapper: Awaited<ReturnType<typeof mountAt>>) =>
  wrapper.findAll('.entry__title').map((title) => title.text())

describe('LibraryView', () => {
  it('shows TV shows in progress by default and filters them', async () => {
    const wrapper = await mountAt('/library')
    expect(titles(wrapper)).toEqual(['Northbound', 'Low Tide'])

    await wrapper.get('input[type="search"]').setValue('tide')

    expect(titles(wrapper)).toEqual(['Low Tide'])
  })

  it('opens movies on the watchlist, without a Watching tab', async () => {
    const wrapper = await mountAt('/library/movies/watching')

    expect(titles(wrapper)).toEqual(['Fox Signal'])
    expect(wrapper.get('[aria-label="Status"]').text()).not.toContain('Watching')
  })
})
