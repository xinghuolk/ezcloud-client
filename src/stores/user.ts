import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/types'

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref<string>('')
  const user = ref<User | null>(null)
  const isLoggedIn = ref<boolean>(false)

  // Getters
  const isAdmin = computed(() => {
    return user.value?.role === 'admin'
  })

  const isUser = computed(() => {
    return user.value?.role === 'user'
  })

  const userRole = computed(() => {
    return user.value?.role || null
  })

  const userInfo = computed(() => {
    return user.value
  })

  // Actions
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('auth_token', newToken)
    isLoggedIn.value = true
  }

  const setUser = (userData: User) => {
    user.value = userData
    localStorage.setItem('user_info', JSON.stringify(userData))
  }

  const clearAuth = () => {
    token.value = ''
    user.value = null
    isLoggedIn.value = false
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
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

  const updateUser = (updatedData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...updatedData }
      localStorage.setItem('user_info', JSON.stringify(user.value))
    }
  }

  const hasPermission = (permission: string) => {
    if (!user.value) return false
    
    // Admin has all permissions
    if (user.value.role === 'admin') return true
    
    // Define permission mappings
    const userPermissions = ['device:view', 'device:bind', 'profile:edit']
    const adminPermissions = [
      'vendor:create', 'vendor:edit', 'vendor:delete',
      'model:create', 'model:edit', 'model:delete',
      'serial:generate', 'serial:manage', 'serial:export',
      'user:manage', 'audit:view', 'system:manage'
    ]
    
    if (user.value.role === 'user') {
      return userPermissions.includes(permission)
    }
    
    return false
  }

  // Initialize auth state when store is created
  initializeAuth()

  return {
    // State
    token,
    user,
    isLoggedIn,
    
    // Getters
    isAdmin,
    isUser,
    userRole,
    userInfo,
    
    // Actions
    setToken,
    setUser,
    clearAuth,
    initializeAuth,
    updateUser,
    hasPermission
  }
}) 