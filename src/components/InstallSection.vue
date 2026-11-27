<script setup lang="ts">
import { Download } from '@lucide/vue'
import { ref } from 'vue'

import BottomSheet from './BottomSheet.vue'
import { useInstall } from '@/lib/install'

const STEPS = [
  {
    device: 'iPhone and iPad',
    steps:
      'In Safari, tap Share, then Add to Home Screen. Without it, Safari deletes saved data after a week without a visit.',
  },
  {
    device: 'Android',
    steps:
      'In Chrome, open the ⋮ menu, then tap Add to Home screen or Install app. In Firefox, open the menu, then tap Install.',
  },
  {
    device: 'Chrome and Edge on a computer',
    steps:
      'Select the install icon in the address bar. In the menu, Chrome has “Install page as app” and Edge has “Apps”.',
  },
  { device: 'Safari on a Mac', steps: 'Open the File menu, then choose Add to Dock.' },
  {
    device: 'Firefox on a computer',
    steps:
      'Firefox on Windows can add the page to the taskbar from the address bar. On macOS and Linux, use another browser.',
  },
]

const { canPrompt, isStandalone, isInstalled, install } = useInstall()
const isOpen = ref(false)

/** The browser's own dialog where there is one, else the steps. */
function start() {
  if (canPrompt()) void install()
  else isOpen.value = true
}
</script>

<template>
  <section v-if="!isStandalone && !isInstalled">
    <h2>Install</h2>
    <div class="card-list">
      <button type="button" class="row row--button" @click="start">
        <span class="row__text">
          <strong>Install Bingit</strong>
          <span class="muted">Opens like an app, also without a connection</span>
        </span>
        <Download :size="18" aria-hidden="true" />
      </button>
    </div>

    <BottomSheet
      v-model:open="isOpen"
      title="Install Bingit"
      description="How to install Bingit in your browser."
      close-label="Close"
      fit
    >
      <dl class="install-steps">
        <div v-for="item in STEPS" :key="item.device">
          <dt>{{ item.device }}</dt>
          <dd class="muted">{{ item.steps }}</dd>
        </div>
      </dl>
    </BottomSheet>
  </section>
</template>

<!-- Not scoped: the sheet is rendered in <body>. -->
<style>
.install-steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: 0;
  padding: var(--space-4) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom));
}

.install-steps dt {
  font-weight: var(--weight-semibold);
}

.install-steps dd {
  margin: 0;
}
</style>
