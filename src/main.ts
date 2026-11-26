import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// The callback route completes the sign-in itself.
if (location.pathname !== '/callback') void useAuthStore().restore()
