import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAdminStore } from '@/stores/admin'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/RegisterPage.vue'),
  },
  {
    path: '/',
    name: 'main',
    component: () => import('@/components/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'chats',
        component: () => import('@/components/ChatsList.vue'),
      },
      {
        path: 'contacts',
        name: 'contacts',
        component: () => import('@/components/ContactsList.vue'),
      },
      {
        path: 'rooms',
        name: 'rooms',
        component: () => import('@/components/RoomsList.vue'),
      },
    ],
  },
  {
    path: '/chat/:userId',
    name: 'chat',
    component: () => import('@/pages/ChatPage.vue'),
    meta: { requiresAuth: true, fullScreen: true },
  },
  {
    path: '/room/:roomId',
    name: 'room-chat',
    component: () => import('@/pages/RoomChatPage.vue'),
    meta: { requiresAuth: true, fullScreen: true },
  },
  // Admin routes
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/pages/admin/AdminLoginPage.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/pages/admin/AdminDashboardPage.vue'),
    meta: { requiresAdminAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const adminStore = useAdminStore()
  authStore.initFromStorage()

  if (to.meta.requiresAdminAuth && !adminStore.isLoggedIn) {
    next({ name: 'admin-login' })
  } else if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'login' })
  } else if ((to.name === 'login' || to.name === 'register') && authStore.isLoggedIn) {
    next({ name: 'chats' })
  } else {
    next()
  }
})

export default router
