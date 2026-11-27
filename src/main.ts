import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { pruneCache } from './db/cache'
import { listenForInstallPrompt } from './lib/install'
import { applyTheme, readTheme } from './lib/theme'
import { useAuthStore } from './stores/auth'

applyTheme(readTheme())
// The browser offers installation once, possibly before any view exists.
listenForInstallPrompt()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// The callback route completes the sign-in itself.
if (location.pathname !== '/callback') void useAuthStore().restore()

void pruneCache()
