import { computed } from 'vue'

import type { Card } from '@/api/discover'
import { useLibraryStore } from '@/stores/library'
import { seedItem } from '@/title/model'

/** "Add to Watchlist" for title lists; pressing it again takes the add back. */
export function useQuickAddList() {
  const library = useLibraryStore()

  const isJustAdded = (card: Card) => library.added.some((item) => item.id === card.id)

  function toggle(card: Card) {
    if (isJustAdded(card)) return void library.undoAdd(card.id)
    const { episodes, ...detail } = card
    const item = seedItem(card.type, { ...detail, total_episodes: episodes }, [])
    void library.quickAdd({ ...item, animeType: card.animeType })
  }

  return { isJustAdded, toggle }
}

/** The same for a single row. */
export function useQuickAdd(card: () => Card) {
  const list = useQuickAddList()
  return {
    isJustAdded: computed(() => list.isJustAdded(card())),
    toggle: () => list.toggle(card()),
  }
}
