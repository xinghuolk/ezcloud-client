import axios, { type AxiosResponse, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { Notyf } from 'notyf'
import { useRouter } from 'vue-router'

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
      // 如果响应不成功，对于登录API不在这里显示错误消息
      if (data.success === false) {
        if (response.config.url?.includes('/auth/login')) {
          // 登录API的错误由上层处理，这里只reject错误，不显示消息
          return Promise.reject(new Error(data.message || 'Request failed'))
        } else {
          // 其他API的错误在这里显示消息
          notyf.error(data.message || 'Request failed')
          return Promise.reject(new Error(data.message || 'Request failed'))
        }
      }
      
      // 响应成功，返回完整响应数据
      return data
    }
    
    // 如果响应格式不符合预期，直接返回
    return data
  },
  (error: AxiosError) => {
    console.error('🚨 Request interceptor 捕获错误:', error)
    console.error('🔍 error.config.url:', error.config?.url)
    console.error('🔍 error.response:', error.response)
    
    // 处理HTTP错误状态码
    if (error.response) {
      const { status, data } = error.response
      let errorMessage = 'Request failed'
      
      // 尝试从响应数据中获取错误消息
      if (data && typeof data === 'object') {
        const dataMessage = (data as any).message
        console.error('🔍 data.message:', dataMessage, '类型:', typeof dataMessage)
        errorMessage = dataMessage || errorMessage
        console.error('🔍 最终errorMessage:', errorMessage, '类型:', typeof errorMessage)
      }
      
      switch (status) {
        case 400:
          // 使用后端返回的具体错误信息
          errorMessage = errorMessage || 'Bad request'
          notyf.error(errorMessage)
          break
        case 401:
        case 403:
          // 对于登录API的401错误，不在这里显示错误消息（由上层处理）
          if (error.config?.url?.includes('/auth/login')) {
            // 登录失败的错误消息由登录逻辑处理，这里不显示重复消息
            // 但需要传递具体的错误消息给上层
            return Promise.reject(new Error(errorMessage))
          }
          
          // 其他401和403都是token无效导致的，统一处理
          errorMessage = status === 401 ? 'Unauthorized, please login again' : 'Access denied, please login again'
          notyf.error(errorMessage)
          // 清除本地存储的认证信息
          localStorage.removeItem('token')
          localStorage.removeItem('user_info')
          // 跳转到登录页面（使用window.location避免router问题）
          window.location.href = '/auth'
          break
        case 404:
          // 对于某些预期的404（如开发中的API），不显示通知
          errorMessage = 'Resource not found'
          // 只在控制台记录，不显示用户通知（允许应用优雅降级）
          console.warn(`API endpoint not found: ${error.config?.url}`)
          break
        case 429:
          errorMessage = 'Too many requests, please try again later'
          notyf.error(errorMessage)
          break
        case 409:
          // 冲突错误（如厂商重复等），显示具体错误信息
          errorMessage = errorMessage || 'Resource conflict'
          notyf.error(errorMessage)
          break
        case 422:
          // 不可处理的实体（如删除有关联的资源）
          errorMessage = errorMessage || 'Cannot process request'
          notyf.error(errorMessage)
          break
        case 423:
          // 423 Locked - 用于 reCAPTCHA 挑战响应
          // 对于登录API的423错误，不显示通知消息，让上层组件处理
          if (error.config?.url?.includes('/auth/login')) {
            // 保持错误消息但不显示通知，让前端组件处理 reCAPTCHA 挑战
            break
          } else {
            // 非登录API的423错误显示通知
            errorMessage = errorMessage || 'Resource locked, please try again later'
            notyf.error(errorMessage)
          }
          break
        case 500:
          // 使用后端返回的具体错误信息
          errorMessage = errorMessage || 'Internal server error'
          notyf.error(errorMessage)
          break
        default:
          notyf.error(errorMessage)
      }
    } else if (error.request) {
      notyf.error('Network error, please check your connection')
    } else {
      notyf.error('Request configuration error')
    }
    
    return Promise.reject(error)
  }
)

// 导出统一的通知实例供其他模块使用
export { notyf }

export default request