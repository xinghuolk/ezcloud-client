import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
      meta: { requiresAuth: true }
    },
    // Device management related routes
    {
      path: '/devices',
      name: 'devices',
      component: () => import('../views/DeviceList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/devices/:id',
      name: 'device-detail',
      component: () => import('../views/DeviceDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/devices/bind',
      name: 'device-bind',
      component: () => import('../views/DeviceBindView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/vendors',
      name: 'vendors',
      component: () => import('../views/VendorList.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/models',
      name: 'models', 
      component: () => import('../views/ModelList.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/serials',
      name: 'serials',
      component: () => import('../views/SerialList.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
})

// Route guards
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  const requiresAuth = to.meta.requiresAuth !== false
  const requiresAdmin = to.meta.requiresAdmin === true

  if (requiresAuth && !userStore.isLoggedIn) {
    // Requires authentication but no token, redirect to login
    ElMessage.warning('Please login first')
    next('/login')
  } else if (requiresAdmin && !userStore.isAdmin) {
    // Requires admin privileges but user is not admin
    ElMessage.error('Administrator privileges required to access this page')
    next('/')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    // Logged in user accessing login page, redirect to home
    next('/')
  } else {
    next()
  }
})

export default router
