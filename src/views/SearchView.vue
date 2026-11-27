<script setup lang="ts">
import { computed, onActivated, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { searchTitles, type Card, type SearchScope } from '@/api/discover'
import { SignedOutError } from '@/auth/session'
import DiscoverPanel from '@/components/DiscoverPanel.vue'
import SearchField from '@/components/SearchField.vue'
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

const syncUrl = () =>
  router.replace({ query: { q: query.value.trim() || undefined, type: scope.value } })

// The page is kept alive: a plain link to it must not leave the URL behind.
onActivated(syncUrl)

watch(
  [query, scope],
  () => {
    cancel()
    error.value = ''
    const text = query.value.trim()
    void syncUrl()
    isSearching.value = text.length >= MIN_LENGTH
    if (!isSearching.value) results.value = undefined
    else timer = setTimeout(() => void search(text), DEBOUNCE_MS)
  },
  { immediate: true },
)

onUnmounted(cancel)
</script>

<template>
  <main class="page search">
    <!-- Hidden, not removed: the chosen list survives a search. -->
    <DiscoverPanel :hidden="isActive">
      <h1>Search</h1>
      <SearchField
        id="search-input"
        v-model="query"
        aria-label="Search titles"
        placeholder="Search movies, TV, anime"
      />
      <SegmentedControl v-if="isActive" v-model="scope" :options="SCOPES" label="Search in" />
    </DiscoverPanel>

    <template v-if="isActive">
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
  </main>
</template>

<style scoped>
/* The pinned header brings its own top space. */
.search {
  padding-top: 0;
}
</style>
