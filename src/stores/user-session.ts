import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '/@src/api'
import type { User, LoginParams, RegisterParams } from '/@src/api/types'
import { useUserToken } from '/@src/composables/user-token'
import { Notyf } from 'notyf'
import { extractErrorMessage } from '/@src/utils/error-utils'

// 创建通知实例
const notyf = new Notyf()

export interface UserData extends User {
  // 继承API中的User类型，可以添加额外字段
}

export const useUserSession = defineStore('userSession', () => {
  // 状态
  const user = ref<Partial<UserData>>()
  const loading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => user.value !== undefined)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const isUser = computed(() => user.value?.role === 'user')
  const isActive = computed(() => user.value?.is_active === true)
  const userRole = computed(() => user.value?.role || null)
  
  // 检查是否为任意级别的管理员
  const isAnyAdmin = computed(() => isAdmin.value || isSuperAdmin.value)

  function setUser(newUser: Partial<UserData>) {
    user.value = newUser
    localStorage.setItem('user_info', JSON.stringify(newUser))
  }

  async function logoutUser() {
    try {
      const token = useUserToken()
      if (token.value && token.value !== 'test-token-123') {
        // 只有真实token才调用API
        await authApi.logout()
      }
    } catch (error) {
      console.warn('Logout API error (may be expected for test login):', error)
    } finally {
      // 无论API调用是否成功都清除本地状态
      const token = useUserToken()
      token.value = ''
      user.value = undefined
      localStorage.removeItem('user_info')
      localStorage.removeItem('token')
    }
  }

  // 登录方法
  async function loginUser(credentials: LoginParams): Promise<boolean> {
    loading.value = true
    try {
      const response = await authApi.login(credentials)
      if (response.success && response.data) {
        const token = useUserToken()
        token.value = response.data.token
        setUser(response.data.user)
        notyf.success('Login successful')
        return true
      }
      return false
    } catch (error: any) {
      console.error('Login error:', error)
      // 不在这里显示错误消息，让上层组件处理
      // 抛出包含具体错误信息的错误供上层使用
      throw new Error(error.message || 'Login failed')
    } finally {
      loading.value = false
    }
  }

  // 注册方法
  async function registerUser(params: RegisterParams): Promise<boolean> {
    loading.value = true
    try {
      const response = await authApi.register(params)
      if (response.success && response.data) {
        notyf.success('Registration successful, please sign in')
        return true
      }
      return false
    } catch (error: any) {
      console.error('Register error:', error)
      notyf.error(extractErrorMessage(error, 'Registration failed'))
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取用户信息
  async function fetchProfile(): Promise<boolean> {
    const token = useUserToken()
    if (!token.value) return false
    
    loading.value = true
    try {
      const response = await authApi.getProfile()
      if (response.success && response.data) {
        setUser(response.data)
        return true
      }
      return false
    } catch (error: any) {
      console.error('Fetch profile error:', error)
      if (error.response?.status === 401) {
        // Token无效，清除认证状态
        logoutUser()
      }
      return false
    } finally {
      loading.value = false
    }
  }

  // 更新用户资料
  async function updateProfile(params: Partial<User>): Promise<boolean> {
    loading.value = true
    try {
      const response = await authApi.updateProfile(params)
      if (response.success && response.data) {
        setUser(response.data)
        notyf.success('Profile updated successfully')
        return true
      }
      return false
    } catch (error: any) {
      console.error('Update profile error:', error)
      notyf.error(extractErrorMessage(error, 'Profile update failed'))
      return false
    } finally {
      loading.value = false
    }
  }

  // 修改密码
  async function changePassword(params: { currentPassword: string; newPassword: string }): Promise<boolean> {
    loading.value = true
    try {
      const response = await authApi.changePassword(params)
      if (response.success) {
        notyf.success('Password changed successfully')
        return true
      }
      return false
    } catch (error: any) {
      console.error('Change password error:', error)
      notyf.error(extractErrorMessage(error, 'Password change failed'))
      return false
    } finally {
      loading.value = false
    }
  }

  // 权限检查方法
  function hasPermission(permission: string): boolean {
    if (!user.value || !isActive.value) return false
    
    // 超级管理员拥有所有权限
    if (isSuperAdmin.value) return true
    
    // 管理员权限
    if (isAdmin.value) {
      const adminPermissions = [
        // 普通用户权限
        'device:view',
        'device:bind',
        'device:unbind',
        'wifi:view',
        'wifi:configure',
        'profile:edit',
        // 管理员专用权限
        'vendor:manage',
        'model:manage',
        'serial:manage',
        'firmware:manage',
        'system:view'
      ]
      return adminPermissions.includes(permission)
    }
    
    // 普通用户权限检查
    if (isUser.value) {
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
    
    return false
  }

  function hasRole(role: string): boolean {
    return user.value?.role === role
  }

  // 检查管理员权限
  function requireAdmin(): void {
    if (!isAnyAdmin.value) {
      notyf.error('Admin permission required')
      throw new Error('Admin permission required')
    }
  }
  
  // 检查超级管理员权限
  function requireSuperAdmin(): void {
    if (!isSuperAdmin.value) {
      notyf.error('Super admin permission required')
      throw new Error('Super admin permission required')
    }
  }

  // 初始化认证状态
  function initializeAuth(): void {
    const storedUser = localStorage.getItem('user_info')
    
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (error) {
        console.error('Failed to parse stored user info:', error)
        localStorage.removeItem('user_info')
      }
    }
  }

  // 初始化
  initializeAuth()

  // 开发环境下添加全局调试函数
  if (import.meta.env.DEV) {
    (window as any).logout = () => {
      console.log('Executing logout...')
      logoutUser().then(() => {
        console.log('Logout completed')
        window.location.href = '/auth'
      })
    }
    
    console.log('Dev mode: Use window.logout() to logout quickly')
  }

  return {
    // 状态
    user,
    loading,
    
    // 计算属性
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    isUser,
    isActive,
    isAnyAdmin,
    userRole,
    
    // 方法
    loginUser,
    registerUser,
    logoutUser,
    fetchProfile,
    updateProfile,
    changePassword,
    setUser,
    hasPermission,
    hasRole,
    requireAdmin,
    requireSuperAdmin,
    initializeAuth,
  } as const
})

/**
 * Pinia supports Hot Module replacement so you can edit your stores and
 * interact with them directly in your app without reloading the page.
 *
 * @see https://pinia.esm.dev/cookbook/hot-module-replacement.html
 * @see https://vitejs.dev/guide/api-hmr.html
 */
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserSession, import.meta.hot))
}
