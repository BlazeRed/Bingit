import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { searchTitles } from '@/api/discover'
import SearchView from '../SearchView.vue'

vi.mock('@/api/discover', () => ({
  searchTitles: vi.fn<typeof import('@/api/discover').searchTitles>(async () => []),
  getTrending: async () => [],
  getGenres: async () => [],
}))
vi.mock('idb-keyval', () => ({ get: async () => undefined }))
vi.mock('@/api/simkl', () => ({}))

afterEach(() => vi.useRealTimers())

describe('SearchView', () => {
  it('waits for a pause and at least 3 characters before one request', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/search', name: 'search', component: SearchView }],
    })
    await router.push('/search')
    vi.useFakeTimers()
    const wrapper = mount(SearchView, {
      attachTo: document.body,
      global: { plugins: [router, createPinia()] },
    })
    const input = wrapper.get('input')
    expect(wrapper.find('[aria-label="Discover"]').isVisible()).toBe(true)

    await input.setValue('no')
    await vi.advanceTimersByTimeAsync(1000)
    await input.setValue('nor')
    await vi.advanceTimersByTimeAsync(100)
    await input.setValue('north')
    await vi.advanceTimersByTimeAsync(400)

    expect(searchTitles).toHaveBeenCalledExactlyOnceWith('north', 'all', expect.any(AbortSignal))
    expect(wrapper.text()).toContain('No title found.')
    expect(wrapper.find('[aria-label="Discover"]').isVisible()).toBe(false)
    wrapper.unmount()
  })
})
