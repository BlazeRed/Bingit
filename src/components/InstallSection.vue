<script setup lang="ts">
import { useInstall } from '@/lib/install'

const { canPrompt, needsInstructions, install } = useInstall()
</script>

<template>
  <!-- Hidden when installed, or when the browser cannot install. -->
  <section v-if="canPrompt() || needsInstructions">
    <h2>Install</h2>
    <div class="card">
      <p class="muted">
        Bingit then opens like an app, also without a connection.
        <template v-if="needsInstructions">
          In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Without
          it, Safari deletes saved data after a week without a visit.
        </template>
      </p>
      <button v-if="canPrompt()" type="button" class="button" @click="install">
        Install Bingit
      </button>
    </div>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}
</style>
