import { definePlugin } from '/@src/utils/plugins'
import { useUserSession } from '/@src/stores/user-session'
import { useUserToken } from '/@src/composables/user-token'

export default definePlugin(async ({ router, pinia }) => {
  const userSession = useUserSession(pinia)
  const token = useUserToken()

  // 如果有token但没有用户信息，尝试获取用户信息
  if (token.value && !userSession.user) {
    try {
      await userSession.fetchProfile()
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
      token.value = undefined
      userSession.logoutUser()
    }
  }

  router.beforeEach((to) => {
    const token = useUserToken()
    if (to.meta.requiresAuth && !token.value) {
      return {
        name: '/auth',
        query: { redirect: to.fullPath },
      }
    }
  })
})
