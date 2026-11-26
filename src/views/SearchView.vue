<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { searchTitles, type Card, type SearchScope } from '@/api/discover'
import { SignedOutError } from '@/auth/session'
import DiscoverPanel from '@/components/DiscoverPanel.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import TitleRow from '@/components/TitleRow.vue'
import { messageOf } from '@/lib/errors'
import { useAuthStore } from '@/stores/auth'

const DEBOUNCE_MS = 400
const MIN_LENGTH = 3
const SCOPES = { all: 'All', movie: 'Movies', tv: 'TV', anime: 'Anime' }

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// The URL keeps the search, so going back to this page restores it.
const query = ref(String(route.query.q ?? ''))
const scope = ref<SearchScope>(
  (Object.keys(SCOPES).find((key) => key === route.query.type) as SearchScope | undefined) ?? 'all',
)

/** With an empty box the page shows what to discover instead. */
const isActive = computed(() => query.value.trim() !== '')

const results = shallowRef<Card[]>()
const isSearching = ref(false)
const error = ref('')

let timer: ReturnType<typeof setTimeout> | undefined
let request: AbortController | undefined

function cancel() {
  clearTimeout(timer)
  request?.abort()
}

async function search(text: string) {
  const controller = new AbortController()
  request = controller
  try {
    const found = await searchTitles(text, scope.value, controller.signal)
    if (!controller.signal.aborted) results.value = found
  } catch (cause) {
    if (controller.signal.aborted) return
    if (cause instanceof SignedOutError) auth.expire(cause.message)
    else error.value = messageOf(cause)
  }
  isSearching.value = false
}

watch(
  [query, scope],
  () => {
    cancel()
    error.value = ''
    const text = query.value.trim()
    void router.replace({ query: { q: text || undefined, type: scope.value } })
    isSearching.value = text.length >= MIN_LENGTH
    if (!isSearching.value) results.value = undefined
    else timer = setTimeout(() => void search(text), DEBOUNCE_MS)
  },
  { immediate: true },
)

onUnmounted(cancel)
</script>

<template>
  <main class="page">
    <h1>Search</h1>
    <input
      id="search-input"
      v-model="query"
      class="field"
      type="search"
      aria-label="Search titles"
      placeholder="Search movies, TV, anime"
      autocomplete="off"
    />

    <template v-if="isActive">
      <SegmentedControl v-model="scope" :options="SCOPES" label="Search in" />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else-if="isSearching" class="muted" role="status">Searching…</p>
      <p v-else-if="!results" class="muted">Type at least {{ MIN_LENGTH }} characters.</p>
      <p v-else class="muted" role="status">
        {{ results.length ? `${results.length} results` : 'No title found.' }}
      </p>
      <ul v-if="results?.length" class="card-list">
        <TitleRow v-for="card in results" :key="card.id" :card="card" />
      </ul>
    </template>

    <!-- Hidden, not removed: the chosen list survives a search. -->
    <DiscoverPanel v-show="!isActive" />
  </main>
</template>
