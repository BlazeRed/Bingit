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
      meta: { requiresAuth: true, perPath: true },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/SearchView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/person/:id(\\d+)',
      name: 'person',
      component: () => import('../views/PersonView.vue'),
      meta: { requiresAuth: true, perPath: true },
    },
    {
      path: '/staff/:id(\\d+)',
      name: 'staff',
      component: () => import('../views/StaffView.vue'),
      meta: { requiresAuth: true, perPath: true },
    },
    {
      path: '/find/:source(tmdb-movie|tmdb-tv|anilist)/:id(\\d+)',
      name: 'find',
      component: () => import('../views/FindView.vue'),
      meta: { requiresAuth: true, perPath: true },
    },
    { path: '/callback', name: 'callback', component: () => import('../views/CallbackView.vue') },
  ],
})

export default router
