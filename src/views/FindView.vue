<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { findByExternalId, type ExternalSource } from '@/api/discover'
import { useAsync } from '@/composables/useAsync'
import { useLibraryStore } from '@/stores/library'
import { routeType } from '@/title/model'

/** Turns a TMDB or AniList id into the matching Simkl title page. */
const route = useRoute()
const router = useRouter()
const library = useLibraryStore()

const source = String(route.params.source) as ExternalSource
const id = String(route.params.id)

/** Titles already in the library need no request. */
const saved = () =>
  library.items.find((item) =>
    source === 'anilist'
      ? item.ids.anilist === id
      : item.ids.tmdb === id && item.type === (source === 'tmdb-movie' ? 'movies' : 'tv'),
  )

const { data, error } = useAsync(
  () => id,
  async () => saved() ?? (await findByExternalId(source, id)),
)

watch(data, (title) => {
  if (!title) return
  // Replace: "Back" then skips this step.
  void router.replace({
    name: 'title',
    params: { type: routeType(title.type), id: title.id },
  })
})

const externalUrl =
  source === 'anilist'
    ? `https://anilist.co/anime/${id}`
    : `https://www.themoviedb.org/${source.slice('tmdb-'.length)}/${id}`
</script>

<template>
  <main class="page">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else-if="data === null">
      <p>Simkl does not know this title.</p>
      <p>
        <a :href="externalUrl" target="_blank" rel="noopener">
          Open it on {{ source === 'anilist' ? 'AniList' : 'TMDB' }}
        </a>
      </p>
    </template>
    <p v-else class="muted" role="status">Opening…</p>
  </main>
</template>
