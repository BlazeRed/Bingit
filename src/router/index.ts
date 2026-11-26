import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/library/:type?/:bucket?',
      name: 'library',
      component: () => import('../views/LibraryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:type(movie|tv|anime)/:id(\\d+)',
      name: 'title',
      component: () => import('../views/TitleView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/callback', name: 'callback', component: () => import('../views/CallbackView.vue') },
  ],
})

export default router
