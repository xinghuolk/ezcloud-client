import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'

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
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
      meta: { requiresAuth: true }
    },
    // 设备管理相关路由（预留）
    {
      path: '/devices',
      name: 'devices',
      component: () => import('../views/DeviceList.vue'),
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
      meta: { requiresAuth: true }
    },
    {
      path: '/serials',
      name: 'serials',
      component: () => import('../views/SerialList.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  const userInfoStr = localStorage.getItem('user_info')
  const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null
  
  const requiresAuth = to.meta.requiresAuth !== false
  const requiresAdmin = to.meta.requiresAdmin === true

  if (requiresAuth && !token) {
    // 需要认证但没有token，跳转到登录页
    ElMessage.warning('请先登录')
    next('/login')
  } else if (requiresAdmin && (!userInfo || userInfo.role !== 'admin')) {
    // 需要管理员权限但不是管理员
    ElMessage.error('需要管理员权限才能访问此页面')
    next('/')
  } else if (to.path === '/login' && token) {
    // 已登录用户访问登录页，跳转到首页
    next('/')
  } else {
    next()
  }
})

export default router
