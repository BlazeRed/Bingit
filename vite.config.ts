import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// '' prefix: also load variables without VITE_, which never reach the bundle.
const env = loadEnv('development', process.cwd(), '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
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
