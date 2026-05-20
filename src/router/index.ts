import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import GalleryView from '@/views/GalleryView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/gallery'
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: GalleryView
    },
    {
      path: '/news',
      name: 'news',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/deck-builder',
      name: 'deck-builder',
      component: () => import('@/views/DeckBuilderView.vue')
    },
    {
      path: '/meta',
      name: 'meta',
      component: () => import('@/views/MetaView.vue')
    },
    {
      path: '/tournament',
      name: 'tournament',
      component: () => import('@/views/TournamentView.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/deck/:id',
      name: 'deck-detail',
      component: () => import('@/views/DeckDetailView.vue')
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
