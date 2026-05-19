import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('@/views/GalleryView.vue')
    },
    {
      path: '/deck-builder',
      name: 'deck-builder',
      component: () => import('@/views/DeckBuilderView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/meta',
      name: 'meta',
      component: () => import('@/views/MetaView.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  if (!to.meta.requiresAuth) return next()

  const auth = useAuthStore()

  // Wait for Firebase auth to resolve before checking login state
  if (auth.loading) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => auth.loading,
        (loading) => {
          if (!loading) {
            stop()
            resolve()
          }
        }
      )
    })
  }

  auth.isLoggedIn ? next() : next({ name: 'gallery' })
})

export default router
