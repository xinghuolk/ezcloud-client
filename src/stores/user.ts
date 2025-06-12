import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const isLoggedIn = ref<boolean>(!!token.value)

  // 计算属性
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isUser = computed(() => user.value?.role === 'user')
  const isActive = computed(() => user.value?.is_active === true)
  const userRole = computed(() => user.value?.role || null)
  const userInfo = computed(() => user.value)

  // 方法
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('auth_token', newToken)
    isLoggedIn.value = true
  }

  const setUser = (userData: User) => {
    user.value = userData
    localStorage.setItem('user_info', JSON.stringify(userData))
    isLoggedIn.value = true
  }

  const logout = () => {
    user.value = null
    token.value = null
    isLoggedIn.value = false
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
  }

  const updateUser = (updatedData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...updatedData }
      localStorage.setItem('user_info', JSON.stringify(user.value))
    }
  }

  const initializeAuth = () => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('user_info')

    if (storedToken) {
      token.value = storedToken
      isLoggedIn.value = true
    }

    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (error) {
        console.error('Failed to parse stored user info:', error)
        localStorage.removeItem('user_info')
      }
    }
  }

  // 权限检查方法
  const hasPermission = (permission: string) => {
    if (!user.value || !isActive.value) return false
    
    // 管理员拥有所有权限
    if (isAdmin.value) return true
    
    // 普通用户权限检查
    const userPermissions = [
      'device:view',
      'device:bind',
      'device:unbind',
      'wifi:view',
      'wifi:configure',
      'profile:edit'
    ]
    
    return userPermissions.includes(permission)
  }

  const hasRole = (role: string) => {
    return user.value?.role === role
  }

  // 初始化认证状态
  initializeAuth()

  return {
    // 状态
    user,
    token,
    isLoggedIn,
    
    // 计算属性
    isAdmin,
    isUser,
    isActive,
    userRole,
    userInfo,
    
    // 方法
    setToken,
    setUser,
    logout,
    updateUser,
    initializeAuth,
    hasPermission,
    hasRole
  }
}) 