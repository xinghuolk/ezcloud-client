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
  operation_id: string
  message: string
  estimated_time?: number
}

// 远程访问API
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
  }
} 