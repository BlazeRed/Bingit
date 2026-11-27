<template>
  <!-- public/icons/icon.svg, inline so that it follows the theme. -->
  <svg viewBox="0 0 512 512" aria-hidden="true">
    <rect class="logo-bg" width="512" height="512" rx="112" />
    <path class="logo-play" d="M196 140v184l152-92z" stroke-width="28" />
    <rect class="logo-track" x="136" y="368" width="240" height="24" rx="12" />
    <rect class="logo-bar" x="136" y="368" width="150" height="24" rx="12" />
  </svg>
</template>

<style scoped>
.logo-bg {
  fill: var(--color-logo-bg);
}

.logo-play {
  fill: var(--color-logo-play);
  stroke: var(--color-logo-play);
  stroke-linejoin: round;
}

.logo-track {
  fill: var(--color-logo-track);
}

.logo-bar {
  fill: var(--color-logo-bar);
}
</style>
