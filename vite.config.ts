import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// '' prefix: also load variables without VITE_, which never reach the bundle.
const env = loadEnv('development', process.cwd(), '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // Installable app. Only the app shell is cached: data stays in IndexedDB and
    // images in the browser's HTTP cache. Not active in `npm run dev`.
    VitePWA({
      registerType: 'prompt',
      manifest: {
        id: '/',
        name: 'Bingit',
        short_name: 'Bingit',
        description: 'Free, open-source movie, TV and anime tracker built on Simkl.',
        display: 'standalone',
        theme_color: '#4B1D3F',
        background_color: '#F7F1F4',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // The TMDB proxy is not a page.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    // Local stand-in for netlify/functions/tmdb.ts (also used by `vite preview`).
    proxy: {
      '/api/tmdb': {
        target: 'https://api.themoviedb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/tmdb', '/3'),
        headers: { Authorization: `Bearer ${env.TMDB_TOKEN}` },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
