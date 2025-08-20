import axios, { type AxiosResponse, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { Notyf } from 'notyf'

// 创建通知实例
const notyf = new Notyf({
  duration: 4000,
  position: { x: 'right', y: 'top' },
  types: [
    {
      type: 'warning',
      background: 'orange',
      icon: {
        className: 'fas fa-exclamation-triangle',
        tagName: 'i',
        color: 'white'
      }
    },
    {
      type: 'info',
      background: 'blue',
      icon: {
        className: 'fas fa-info-circle',
        tagName: 'i',
        color: 'white'
      }
    }
  ]
})

// 获取API基础URL
// 推荐使用相对路径配置，通过nginx代理访问
function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || '/api/v1'
}

// 创建axios实例
const request = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,  // 调整为30秒，平衡普通API和文件上传需求
  headers: {
    'Content-Type': 'application/json',
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从localStorage获取token (保持与user-token composable一致)
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    
    // 处理blob响应（如文件下载）
    if (response.config.responseType === 'blob') {
      return data
    }
    
    // 新的统一响应格式：{success, message, data}
    if (typeof data === 'object' && data !== null) {
      // 如果响应不成功，需要先检查是否是Token过期错误
      if (data.success === false) {
        const message = data.message || 'Request failed'
        
        // 检查是否是Token过期错误，需要特殊处理
        if (message.includes('Token has expired') || 
            message.includes('expired') || 
            message.includes('invalid token') ||
            message.includes('token is invalid')) {
          console.warn('🔒 Token expired detected in API response, redirecting to login')
          // 清除本地存储的认证信息
          localStorage.removeItem('token')
          localStorage.removeItem('user_info')
          // 跳转到登录页面
          if (typeof window !== 'undefined') {
            window.location.href = '/auth'
          }
        }
        
        return Promise.reject(new Error(message))
      }
      
      // 响应成功，返回完整响应数据
      return data
    }
    
    // 如果响应格式不符合预期，直接返回
    return data
  },
  (error: AxiosError) => {
    // HTTP拦截器只处理关键的系统级错误，其他错误由组件层的错误处理架构统一处理
    if (error.response) {
      const { status, data } = error.response
      
      // 只处理需要立即响应的认证和授权错误
      switch (status) {
        case 401:
          // 401表示token无效或过期，需要自动重新登录
          if (!error.config?.url?.includes('/auth/login')) {
            console.warn('🔒 Token expired or invalid, redirecting to login')
            // 清除本地存储的认证信息
            localStorage.removeItem('token')
            localStorage.removeItem('user_info')
            // 跳转到登录页面
            if (typeof window !== 'undefined') {
              window.location.href = '/auth'
            }
          }
          break
          
        case 403:
          // 检查是否是token过期的情况
          const errorMessage = (data as any)?.message || ''
          if (errorMessage.includes('Token has expired') || 
              errorMessage.includes('expired') || 
              errorMessage.includes('invalid token')) {
            console.warn('🔒 Session expired, redirecting to login')
            // Token过期，需要重新登录
            localStorage.removeItem('token')
            localStorage.removeItem('user_info')
            // 跳转到登录页面
            if (typeof window !== 'undefined') {
              window.location.href = '/auth'
            }
          }
          break
          
        case 404:
          // 404错误只在控制台记录，不显示用户通知（允许应用优雅降级）
          if (import.meta.env.DEV) {
            console.warn(`🔍 API endpoint not found: ${error.config?.url}`)
          }
          break
      }
    } else if (error.request) {
      // Network errors are handled at component level
      if (import.meta.env.DEV) {
        console.error('🌐 Network error:', error.message)
      }
    }
    
    // Always reject the error for component-level handling
    // Components will use the new error handler architecture to display appropriate messages
    return Promise.reject(error)
  }
)

// 导出统一的通知实例供其他模块使用
export { notyf }

export default request