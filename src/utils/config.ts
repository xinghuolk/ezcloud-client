/**
 * EzCloud 运行时配置工具函数
 * 作为应用配置store的便捷包装器，提供向后兼容支持
 */

import { useAppConfig } from '/@src/stores/app-config'

interface EzCloudConfig {
  RECAPTCHA_SITE_KEY?: string
  RECAPTCHA_V2_SITE_KEY?: string
  API_BASE_URL?: string
  WS_BASE_URL?: string
}

/**
 * 获取配置store实例
 */
function getConfigStore() {
  try {
    return useAppConfig()
  } catch (error) {
    console.error('Unable to get config store, ensure calling within Vue app context')
    throw new Error('Config store not available')
  }
}

/**
 * 获取运行时配置（向后兼容接口）
 * @deprecated 推荐直接使用 useAppConfig() store
 */
export function getConfig(): EzCloudConfig {
  const configStore = getConfigStore()
  
  // VITE模式下配置始终已加载
  return {
    RECAPTCHA_SITE_KEY: configStore.recaptchaSiteKey,
    RECAPTCHA_V2_SITE_KEY: configStore.recaptchaV2SiteKey,
    API_BASE_URL: configStore.apiBaseUrl,
    WS_BASE_URL: configStore.wsBaseUrl
  }
}

/**
 * 获取特定配置项（向后兼容接口）
 * @deprecated 推荐直接使用 useAppConfig() store的计算属性
 */
export function getConfigValue(key: keyof EzCloudConfig): string | undefined {
  const configStore = getConfigStore()
  
  // VITE模式下配置始终已加载
  switch (key) {
    case 'RECAPTCHA_SITE_KEY': return configStore.recaptchaSiteKey
    case 'RECAPTCHA_V2_SITE_KEY': return configStore.recaptchaV2SiteKey
    case 'API_BASE_URL': return configStore.apiBaseUrl
    case 'WS_BASE_URL': return configStore.wsBaseUrl
    default: return undefined
  }
}

/**
 * 同步获取reCAPTCHA配置（推荐使用方式）
 * 配置在应用启动时预加载，可以安全地同步访问
 */
export function getReCaptchaConfigSync(): { siteKey?: string; v2SiteKey?: string } {
  try {
    const configStore = getConfigStore()
    
    if (!configStore.isLoaded) {
      console.warn('Config not loaded yet, returning empty config')
      return {}
    }
    
    return {
      siteKey: configStore.recaptchaSiteKey,
      v2SiteKey: configStore.recaptchaV2SiteKey
    }
  } catch (error) {
    console.warn('Config store not available, trying fallback method')
    
    // Fallback到window全局变量
    if (window.__EZCLOUD_CONFIG__) {
      return {
        siteKey: window.__EZCLOUD_CONFIG__.RECAPTCHA_SITE_KEY,
        v2SiteKey: window.__EZCLOUD_CONFIG__.RECAPTCHA_V2_SITE_KEY
      }
    }
    
    // 最后fallback到构建时变量（向后兼容）
    return {
      siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
      v2SiteKey: import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY
    }
  }
}

/**
 * 同步获取特定配置项（推荐使用方式）
 */
export function getConfigValueSync(key: keyof EzCloudConfig): string | undefined {
  return getConfigValue(key) // 在VITE模式下等效
}

/**
 * 重置配置缓存（向后兼容接口）
 * @deprecated VITE模式下无需重置（构建时确定）
 */
export function resetConfigCache(): void {
  console.log('Config determined at build time in VITE mode, no reset needed')
}

// 类型声明扩展
declare global {
  interface Window {
    __EZCLOUD_CONFIG__?: EzCloudConfig
  }
}