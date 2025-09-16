/**
 * EzenCloud 应用配置状态管理
 * 使用Vite环境变量，构建时从server/.env.{环境}自动读取
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'

export const useAppConfig = defineStore('app-config', () => {
  // 直接从Vite环境变量读取配置
  const recaptchaSiteKey = computed(() => import.meta.env.VITE_RECAPTCHA_SITE_KEY)
  const recaptchaV2SiteKey = computed(() => import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY)
  const apiBaseUrl = computed(() => import.meta.env.VITE_API_BASE_URL || '/api/v1')
  const wsBaseUrl = computed(() => import.meta.env.VITE_WS_BASE_URL || 'AUTO')

  // 检查配置是否完整
  const isConfigComplete = computed(() => {
    return !!(recaptchaSiteKey.value && recaptchaV2SiteKey.value)
  })

  // 配置始终已加载（构建时确定）
  const isLoaded = computed(() => true)
  const loadError = computed(() => null)
  const isLoading = computed(() => false)

  return {
    // 计算属性
    recaptchaSiteKey,
    recaptchaV2SiteKey, 
    apiBaseUrl,
    wsBaseUrl,
    isConfigComplete,
    
    // 状态（兼容性）
    isLoaded,
    loadError,
    isLoading
  }
})