<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />

  <!-- Attribution required by Simkl, TMDB and AniList terms. See docs/simkl-api-research.md -->
  <footer class="attribution">
    Movie, TV and anime data from <a href="https://simkl.com">Simkl</a>. Extra metadata from
    <a href="https://www.themoviedb.org">TMDB</a> and <a href="https://anilist.co">AniList</a>. This
    product uses the TMDB API but is not endorsed or certified by TMDB.
  </footer>
</template>

<style scoped>
.attribution {
  padding: 1rem;
  font-size: 0.75rem;
  opacity: 0.7;
}
</style>
