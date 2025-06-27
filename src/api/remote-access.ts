import request from './request'
import type { ApiResponse } from './types'

// 远程访问相关类型
export interface RemoteAccessStatus {
  device_id: number
  http: {
    status: 'connecting' | 'connected' | 'disconnected' | 'error'
    url?: string
    connected_at?: string
    error_message?: string
  }
  ssh: {
    status: 'connecting' | 'connected' | 'disconnected' | 'error'
    host?: string
    port?: number
    connected_at?: string
    error_message?: string
  }
  last_updated: string
}

export interface StartRemoteAccessParams {
  type: 'http' | 'ssh'
  device_id: number
}

export interface StartRemoteAccessResponse {
  operation_id?: string
  message: string
  estimated_time?: number
  device_id: number
  serial: string
  url?: string
  host?: string
  port?: number
  command?: string
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  type: 'http' | 'ssh'
}

// 远程访问API - 统一使用/api/v1前缀（通过baseURL配置）
export const remoteAccessApi = {
  // 启动HTTP访问
  startHttpAccess: (deviceId: number, config?: object): Promise<ApiResponse<StartRemoteAccessResponse>> => {
    return request.post('/remote-access/http/start', { device_id: deviceId, config })
  },

  // 启动SSH访问
  startSshAccess: (deviceId: number, config?: object): Promise<ApiResponse<StartRemoteAccessResponse>> => {
    return request.post('/remote-access/ssh/start', { device_id: deviceId, config })
  },

  // 停止远程访问
  stopRemoteAccess: (deviceId: number, type: 'http' | 'ssh'): Promise<ApiResponse<{ message: string }>> => {
    return request.post(`/remote-access/${type}/stop`, { device_id: deviceId })
  },

  // 获取远程访问状态
  getRemoteAccessStatus: (deviceId: number): Promise<ApiResponse<RemoteAccessStatus>> => {
    return request.get(`/remote-access/status/${deviceId}`)
  },

  // 批量获取设备远程访问状态
  getBatchRemoteAccessStatus: (deviceIds: number[]): Promise<ApiResponse<RemoteAccessStatus[]>> => {
    return request.post('/remote-access/status/batch', { device_ids: deviceIds })
  },

  // 获取活跃连接列表
  getActiveConnections: (): Promise<ApiResponse<any[]>> => {
    return request.get('/remote-access/active')
  },

  // 获取端口池状态
  getPortPoolStats: (): Promise<ApiResponse<any>> => {
    return request.get('/remote-access/port-pool/stats')
  },

  // 获取连接统计
  getConnectionStats: (): Promise<ApiResponse<any>> => {
    return request.get('/remote-access/connection/stats')
  },

  // 获取指令统计
  getCommandStats: (): Promise<ApiResponse<any>> => {
    return request.get('/remote-access/command/stats')
  },

  // 释放端口（管理员）
  releasePort: (deviceId: number, type?: 'http' | 'ssh'): Promise<ApiResponse<{ message: string }>> => {
    return request.post('/remote-access/port/release', { device_id: deviceId, type })
  }
} 