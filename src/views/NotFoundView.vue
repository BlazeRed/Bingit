<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="page">
    <h1>Page not found</h1>
    <p><RouterLink :to="{ name: 'home' }">Back to the start page</RouterLink></p>
  </main>
</template>
