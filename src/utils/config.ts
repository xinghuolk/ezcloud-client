/**
 * 前端配置工具
 * 用于获取后端服务配置信息
 */

/**
 * 获取后端服务端口
 * @returns {string} 后端服务端口
 */
export function getBackendPort(): string {
  // 开发环境使用vite代理配置的端口
  if (import.meta.env.DEV) {
    return '3001'
  }
  
  // 生产环境使用默认端口
  // 可以通过环境变量或API动态获取
  return '3001'
}

/**
 * 获取后端API基础URL
 * @returns {string} API基础URL
 */
export function getApiBaseUrl(): string {
  const hostname = window.location.hostname
  const port = getBackendPort()
  const protocol = window.location.protocol
  
  return `${protocol}//${hostname}:${port}`
}

/**
 * 获取WebSocket基础URL
 * @returns {string} WebSocket基础URL
 */
export function getWebSocketBaseUrl(): string {
  const hostname = window.location.hostname
  const port = getBackendPort()
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  
  return `${protocol}//${hostname}:${port}`
}