import request from './request'
import type { ApiResponse, PaginationParams, PaginationResponse } from './types'

// 设备型号相关类型定义
export interface DeviceModel {
  id: number
  vendor_id?: number
  oemname: string
  stdname: string
  devtype: string
  description?: string
  is_active: boolean
  serialNumberCount?: number
  created_at: string
  updated_at: string
}

export interface ModelCreateParams {
  vendor_id?: number
  oemname: string
  stdname: string
  devtype: string
  description?: string
  is_active?: boolean
}

export interface ModelUpdateParams extends ModelCreateParams {
  id: number
}

export interface ModelListParams extends PaginationParams {
  search?: string
  oemname?: string
  devtype?: string
  is_active?: boolean
}

export interface ModelListResponse {
  models: DeviceModel[]
  pagination: PaginationResponse
}

export interface ModelStatsResponse {
  model: DeviceModel
  stats: {
    totalSerials: number
    unusedSerials: number
    boundSerials: number
    activeSerials: number
  }
}

// 设备型号API服务
export const modelApi = {
  // 获取型号列表
  async getModels(params?: ModelListParams): Promise<ApiResponse<ModelListResponse>> {
    return request.get('/models', { params })
  },

  // 获取型号详情
  async getModel(id: number): Promise<ApiResponse<DeviceModel>> {
    return request.get(`/models/${id}`)
  },

  // 创建型号
  async createModel(data: ModelCreateParams): Promise<ApiResponse<DeviceModel>> {
    return request.post('/models', data)
  },

  // 更新型号
  async updateModel(id: number, data: ModelCreateParams): Promise<ApiResponse<DeviceModel>> {
    return request.put(`/models/${id}`, data)
  },

  // 删除型号
  async deleteModel(id: number): Promise<ApiResponse<void>> {
    return request.delete(`/models/${id}`)
  },

  // 获取型号统计信息
  async getModelStats(id: number): Promise<ApiResponse<ModelStatsResponse>> {
    return request.get(`/models/${id}/stats`)
  }
}

// 设备类型选项
export const DEVICE_TYPES = [
  { value: 'router', label: '路由器' },
  { value: 'gateway', label: '网关' },
  { value: 'switch', label: '交换机' },
  { value: 'modem', label: '调制解调器' },
  { value: 'repeater', label: '中继器' },
  { value: 'bridge', label: '网桥' },
  { value: 'hub', label: '集线器' },
  { value: 'camera', label: '摄像头' },
  { value: 'sensor', label: '传感器' },
  { value: 'controller', label: '控制器' },
  { value: 'other', label: '其他' }
]

// 获取设备类型标签
export const getDeviceTypeLabel = (value: string): string => {
  const type = DEVICE_TYPES.find(item => item.value === value)
  return type ? type.label : value
} 