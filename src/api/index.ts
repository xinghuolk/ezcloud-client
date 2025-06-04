import request from './request'
import type {
  ApiResponse,
  PaginationResponse,
  User,
  LoginParams,
  RegisterParams,
  LoginResponse,
  DeviceModel,
  CreateDeviceModelParams,
  SerialNumber,
  GenerateSerialParams,
  Device,
  DeviceBindParams,
  DeviceQuery,
  DeviceStatus,
  Plugin
} from './types'

// 认证相关API
export const authApi = {
  // 用户登录
  login: (params: LoginParams): Promise<ApiResponse<LoginResponse>> => {
    return request.post('/api/v1/auth/login', params)
  },

  // 用户注册
  register: (params: RegisterParams): Promise<ApiResponse<User>> => {
    return request.post('/api/v1/auth/register', params)
  },

  // 获取用户信息
  getProfile: (): Promise<ApiResponse<User>> => {
    return request.get('/api/v1/auth/profile')
  },

  // 更新用户信息
  updateProfile: (params: Partial<User>): Promise<ApiResponse<User>> => {
    return request.put('/api/v1/auth/profile', params)
  },

  // Token刷新
  refreshToken: (): Promise<ApiResponse<{ token: string }>> => {
    return request.post('/api/v1/auth/refresh')
  },

  // 修改密码
  changePassword: (params: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> => {
    return request.put('/api/v1/auth/password', params)
  }
}

// 设备型号管理API
export const modelApi = {
  // 获取型号列表
  getModels: (params?: { page?: number; limit?: number; oemname?: string; devtype?: string }): Promise<ApiResponse<PaginationResponse<DeviceModel>>> => {
    return request.get('/models', { params })
  },

  // 获取型号详情
  getModel: (id: number): Promise<ApiResponse<DeviceModel>> => {
    return request.get(`/models/${id}`)
  },

  // 创建型号
  createModel: (params: CreateDeviceModelParams): Promise<ApiResponse<DeviceModel>> => {
    return request.post('/models', params)
  },

  // 更新型号
  updateModel: (id: number, params: Partial<CreateDeviceModelParams>): Promise<ApiResponse<DeviceModel>> => {
    return request.put(`/models/${id}`, params)
  },

  // 删除型号
  deleteModel: (id: number): Promise<ApiResponse<void>> => {
    return request.delete(`/models/${id}`)
  },

  // 获取所有可用型号（用于下拉选择）
  getAllModels: (): Promise<ApiResponse<DeviceModel[]>> => {
    return request.get('/models/all')
  }
}

// 序列号管理API
export const serialApi = {
  // 批量生成序列号
  generateSerials: (params: GenerateSerialParams): Promise<ApiResponse<{ batch_id: string; count: number }>> => {
    return request.post('/serials/generate', params)
  },

  // 获取序列号列表
  getSerials: (params?: { 
    page?: number
    limit?: number
    batch_id?: string
    status?: string
    model_id?: number
  }): Promise<ApiResponse<PaginationResponse<SerialNumber>>> => {
    return request.get('/serials', { params })
  },

  // 获取批次列表
  getBatches: (): Promise<ApiResponse<{ batch_id: string; count: number; created_at: string }[]>> => {
    return request.get('/serials/batches')
  },

  // 导出序列号Excel
  exportSerials: (batch_id: string): Promise<Blob> => {
    return request.get(`/serials/export/${batch_id}`, { 
      responseType: 'blob' 
    })
  },

  // 检查MAC地址冲突
  checkMacConflict: (params: { mac_start: string; count: number; mac_count: number; mac_interval: number }): Promise<ApiResponse<{ hasConflict: boolean; conflicts: string[] }>> => {
    return request.post('/serials/check-mac-conflict', params)
  }
}

// 设备管理API
export const deviceApi = {
  // 获取设备列表
  getDevices: (params?: DeviceQuery): Promise<ApiResponse<PaginationResponse<Device>>> => {
    return request.get('/devices', { params })
  },

  // 获取设备详情
  getDevice: (id: number): Promise<ApiResponse<Device>> => {
    return request.get(`/devices/${id}`)
  },

  // 绑定设备
  bindDevice: (params: DeviceBindParams): Promise<ApiResponse<Device>> => {
    return request.post('/devices/bind', params)
  },

  // 解绑设备
  unbindDevice: (id: number): Promise<ApiResponse<void>> => {
    return request.delete(`/devices/${id}/unbind`)
  },

  // 更新设备信息
  updateDevice: (id: number, params: Partial<Device>): Promise<ApiResponse<Device>> => {
    return request.put(`/devices/${id}`, params)
  },

  // 获取设备状态历史
  getDeviceStatus: (deviceId: number, params?: { 
    start_date?: string
    end_date?: string
    limit?: number 
  }): Promise<ApiResponse<DeviceStatus[]>> => {
    return request.get(`/devices/${deviceId}/status`, { params })
  },

  // 设备操作（重启、重置等）
  operateDevice: (id: number, operation: string, parameters?: Record<string, any>): Promise<ApiResponse<{ operation_id: string }>> => {
    return request.post(`/devices/${id}/operation`, { operation, parameters })
  },

  // 批量操作设备
  batchOperate: (deviceIds: number[], operation: string, parameters?: Record<string, any>): Promise<ApiResponse<{ operation_id: string }>> => {
    return request.post('/devices/batch-operation', { device_ids: deviceIds, operation, parameters })
  }
}

// 插件管理API（预留接口）
export const pluginApi = {
  // 获取插件列表
  getPlugins: (): Promise<ApiResponse<Plugin[]>> => {
    return request.get('/plugins')
  },

  // 插件注册
  registerPlugin: (params: { plugin_id: string; name: string; version: string; config?: Record<string, any> }): Promise<ApiResponse<Plugin>> => {
    return request.post('/plugin/register', params)
  },

  // 插件心跳
  heartbeat: (plugin_id: string): Promise<ApiResponse<void>> => {
    return request.post('/plugin/heartbeat', { plugin_id })
  },

  // 设备状态上报
  reportDeviceStatus: (devices: Array<{ serial: string; status: string; data: Record<string, any> }>): Promise<ApiResponse<void>> => {
    return request.post('/plugin/device/status', { devices })
  }
}

// 统计和报表API
export const statsApi = {
  // 获取系统概览统计
  getOverview: (): Promise<ApiResponse<{
    total_devices: number
    online_devices: number
    total_users: number
    total_models: number
    today_activations: number
  }>> => {
    return request.get('/stats/overview')
  },

  // 获取设备在线率趋势
  getOnlineRate: (days: number = 7): Promise<ApiResponse<Array<{ date: string; online_rate: number }>>> => {
    return request.get('/stats/online-rate', { params: { days } })
  },

  // 获取型号分布统计
  getModelDistribution: (): Promise<ApiResponse<Array<{ oemname: string; stdname: string; count: number }>>> => {
    return request.get('/stats/model-distribution')
  }
}

// 导出所有API
export * from './types'
export default {
  authApi,
  modelApi,
  serialApi,
  deviceApi,
  pluginApi,
  statsApi
} 