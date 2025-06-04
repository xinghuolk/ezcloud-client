import request from './request'
import type { ApiResponse, PaginationParams, PaginationResponse } from './types'

// 序列号相关类型定义
export interface SerialNumber {
  id: number
  model_id: number
  batch_id: string
  serial: string
  mac_start: string
  mac_count: number
  mac_interval: number
  status: 'unused' | 'bound' | 'activated'
  bound_at?: string
  created_at: string
  deviceModel?: {
    id: number
    oemname: string
    stdname: string
    devtype: string
    description?: string
    vendor?: {
      id: number
      name: string
    }
  }
}

export interface BatchInfo {
  batch_id: string
  model_id: number
  total_count: number
  unused_count: number
  bound_count: number
  activated_count: number
  created_at: string
  deviceModel?: {
    id: number
    oemname: string
    stdname: string
    vendor?: {
      id: number
      name: string
    }
  }
}

export interface SerialGenerateRequest {
  model_id: number
  count: number
  mac_start: string
  mac_count?: number
  mac_interval?: number
  serial_prefix?: string
  serial_suffix?: string
}

export interface ConflictCheckRequest {
  mac_start: string
  count: number
  mac_count: number
  mac_interval?: number
}

export interface ConflictCheckResult {
  hasConflict: boolean
  conflicts: Array<{
    serial: string
    mac_start: string
    mac_end: string
    overlap_start: string
    overlap_end: string
  }>
  requestedRange: {
    start: string
    end: string
    total_count: number
  }
}

// 序列号API接口
export const serialsApi = {
  // 批量生成序列号
  generate: (data: SerialGenerateRequest): Promise<ApiResponse<{
    batch_id: string
    count: number
    model_id: number
    mac_start: string
    mac_count: number
    mac_interval: number
  }>> => {
    return request.post('/api/v1/serials/generate', data)
  },

  // 获取序列号列表
  getList: (params: PaginationParams & {
    batch_id?: string
    model_id?: number
    status?: string
    search?: string
  }): Promise<ApiResponse<{
    serials: SerialNumber[]
    pagination: PaginationResponse
  }>> => {
    return request.get('/api/v1/serials', { params })
  },

  // 获取批次列表
  getBatches: (params: PaginationParams): Promise<ApiResponse<{
    batches: BatchInfo[]
    pagination: PaginationResponse
  }>> => {
    return request.get('/api/v1/serials/batches', { params })
  },

  // 获取批次详情
  getBatchDetail: (batchId: string, params: PaginationParams): Promise<ApiResponse<{
    batch_id: string
    serials: SerialNumber[]
    pagination: PaginationResponse
  }>> => {
    return request.get(`/api/v1/serials/batches/${batchId}`, { params })
  },

  // 删除批次
  deleteBatch: (batchId: string): Promise<ApiResponse<{
    deleted_count: number
  }>> => {
    return request.delete(`/api/v1/serials/batches/${batchId}`)
  },

  // 检查MAC地址冲突
  checkConflicts: (data: ConflictCheckRequest): Promise<ApiResponse<ConflictCheckResult>> => {
    return request.post('/api/v1/serials/check-conflicts', data)
  },

  // 导出Excel
  exportExcel: (params: {
    batch_id?: string
    model_id?: number
    status?: string
  }): Promise<Blob> => {
    return request.get('/api/v1/serials/export', {
      params,
      responseType: 'blob'
    }) as Promise<Blob>
  }
}

export default serialsApi 