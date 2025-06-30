import axios, { type AxiosResponse, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从localStorage获取token
    const token = localStorage.getItem('auth_token')
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
      // 如果响应不成功，显示错误消息
      if (data.success === false) {
        ElMessage.error(data.message || 'Request failed')
        return Promise.reject(new Error(data.message || 'Request failed'))
      }
      
      // 响应成功，返回完整响应数据
      return data
    }
    
    // 如果响应格式不符合预期，直接返回
    return data
  },
  (error: AxiosError) => {
    // 处理HTTP错误状态码
    if (error.response) {
      const { status, data } = error.response
      let errorMessage = 'Request failed'
      
      // 尝试从响应数据中获取错误消息
      if (data && typeof data === 'object') {
        errorMessage = (data as any).message || errorMessage
      }
      
      switch (status) {
        case 400:
          // 使用后端返回的具体错误信息
          errorMessage = errorMessage || 'Bad request'
          ElMessage.error(errorMessage)
          break
        case 401:
          errorMessage = 'Unauthorized, please login again'
          ElMessage.error(errorMessage)
          // 清除本地存储的认证信息
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_info')
          // 跳转到登录页面
          router.push('/login')
          break
        case 403:
          errorMessage = 'Access denied'
          ElMessage.error(errorMessage)
          break
        case 404:
          errorMessage = 'Resource not found'
          ElMessage.error(errorMessage)
          break
        case 429:
          errorMessage = 'Too many requests, please try again later'
          ElMessage.error(errorMessage)
          break
        case 500:
          // 使用后端返回的具体错误信息
          errorMessage = errorMessage || 'Internal server error'
          ElMessage.error(errorMessage)
          break
        default:
          ElMessage.error(errorMessage)
      }
    } else if (error.request) {
      ElMessage.error('Network error, please check your connection')
    } else {
      ElMessage.error('Request configuration error')
    }
    
    return Promise.reject(error)
  }
)

export default request 