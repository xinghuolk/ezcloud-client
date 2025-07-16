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
  DeviceTrusted,
  DeviceTrustParams,
  DeviceTrustUpdateParams,
  DeviceTrusteesResponse,
  CreateDeviceTrustResponse,
  Plugin,
  WiFiStatus,
  WiFiData,
  WiFiTemplate,
  WiFiConfigParams,
  ModemStatus,
  DeviceCommand,
  DeviceOperationParams,
  BatchOperationParams,
  Vendor,
  CreateVendorParams,
  VendorListResponse,
  DeviceListResponse,
  SerialListResponse,
  ModelListResponse
} from './types'

// 认证相关API
export const authApi = {
  // 用户登录
  login: (params: LoginParams): Promise<ApiResponse<LoginResponse>> => {
    return request.post('/auth/login', params)
  },

  // 用户注册
  register: (params: RegisterParams): Promise<ApiResponse<User>> => {
    return request.post('/auth/register', params)
  },

  // 获取用户信息
  getProfile: (): Promise<ApiResponse<User>> => {
    return request.get('/auth/profile')
  },

  // 更新用户信息
  updateProfile: (params: Partial<User>): Promise<ApiResponse<User>> => {
    return request.put('/auth/profile', params)
  },

  // Token刷新
  refreshToken: (): Promise<ApiResponse<{ token: string }>> => {
    return request.post('/auth/refresh')
  },

  // 修改密码
  changePassword: (params: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> => {
    return request.put('/auth/password', params)
  },

  // 用户登出
  logout: (): Promise<ApiResponse<null>> => {
    return request.post('/auth/logout')
  }
}

// 设备型号管理API
export const modelApi = {
  // 获取型号列表
  getModels: (params?: { page?: number; limit?: number; oemname?: string; devtype?: string }): Promise<ApiResponse<ModelListResponse>> => {
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
  deleteModel: (id: number): Promise<ApiResponse<null>> => {
    return request.delete(`/models/${id}`)
  },

  // 获取所有可用型号（用于下拉选择）
  getAllModels: (): Promise<ApiResponse<DeviceModel[]>> => {
    return request.get('/models')
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
  }): Promise<ApiResponse<SerialListResponse>> => {
    return request.get('/serials', { params })
  },

  // 获取批次列表
  getBatches: (): Promise<ApiResponse<{ 
    batches: { batch_id: string; count: number; created_at: string }[]; 
    pagination: { page: number; limit: number; total: number; pages: number }
  }>> => {
    return request.get('/serials/batches')
  },

  // 导出序列号Excel
  exportSerials: (batch_id: string): Promise<Blob> => {
    return request.get('/serials/export', { 
      params: { batch_id },
      responseType: 'blob' 
    })
  },

  // 检查MAC地址冲突
  checkMacConflict: (params: { mac_start: string; count: number; mac_count: number; mac_interval: number }): Promise<ApiResponse<{ hasConflict: boolean; conflicts: string[] }>> => {
    return request.post('/serials/check-mac-conflict', params)
  },

  // 删除批次
  deleteBatch: (batch_id: string): Promise<ApiResponse<null>> => {
    return request.delete(`/serials/batches/${batch_id}`)
  }
}

// 设备管理API
export const deviceApi = {
  // 获取设备列表
  getDevices: (params?: DeviceQuery): Promise<ApiResponse<DeviceListResponse>> => {
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
  unbindDevice: (id: number): Promise<ApiResponse<null>> => {
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
  },

  // 获取设备WiFi状态
  getDeviceWiFi: (id: number): Promise<ApiResponse<WiFiData>> => {
    return request.get(`/devices/${id}/wifi`)
  },

  // 更新设备WiFi配置
  updateDeviceWiFi: (id: number, params: WiFiConfigParams): Promise<ApiResponse<null>> => {
    return request.put(`/devices/${id}/wifi`, params)
  },

  // 获取设备Modem状态
  getDeviceModem: (id: number): Promise<ApiResponse<ModemStatus>> => {
    return request.get(`/devices/${id}/modem`)
  },

  // 获取SIM卡切换历史
  getModemHistory: (id: number): Promise<ApiResponse<any[]>> => {
    return request.get(`/devices/${id}/modem/history`)
  },

  // 设备重启
  rebootDevice: (id: number): Promise<ApiResponse<DeviceCommand>> => {
    return request.post(`/devices/${id}/reboot`)
  },

  // SIM卡切换
  switchSIM: (id: number, slot: number): Promise<ApiResponse<DeviceCommand>> => {
    return request.post(`/devices/${id}/modem/switch`, { slot })
  },

  // 收集设备日志
  collectLogs: (id: number, params?: { types?: string[]; duration?: number }): Promise<ApiResponse<DeviceCommand>> => {
    return request.post(`/devices/${id}/logs/collect`, params)
  },

  // 获取设备日志列表
  getDeviceLogs: (id: number, params?: { page?: number; limit?: number }): Promise<ApiResponse<any[]>> => {
    return request.get(`/devices/${id}/logs`, { params })
  },

  // 批量设备操作
  batchOperation: (params: BatchOperationParams): Promise<ApiResponse<DeviceCommand[]>> => {
    return request.post('/devices/batch-operation', params)
  },

  // 获取设备命令状态
  getDeviceCommands: (id: number, params?: { status?: string; type?: string }): Promise<ApiResponse<DeviceCommand[]>> => {
    return request.get(`/devices/${id}/commands`, { params })
  },

  // 设备托管相关API
  // 创建设备托管关系
  trustDevice: (id: number, params: DeviceTrustParams): Promise<ApiResponse<CreateDeviceTrustResponse>> => {
    return request.post(`/devices/${id}/trust`, params)
  },

  // 取消设备托管关系
  untrustDevice: (id: number, userId: number): Promise<ApiResponse<null>> => {
    return request.delete(`/devices/${id}/trust/${userId}`)
  },

  // 获取设备托管关系列表
  getDeviceTrustees: (id: number): Promise<ApiResponse<DeviceTrusteesResponse>> => {
    return request.get(`/devices/${id}/trustees`)
  },

  // 更新托管关系
  updateDeviceTrust: (id: number, userId: number, params: DeviceTrustUpdateParams): Promise<ApiResponse<DeviceTrusted>> => {
    return request.put(`/devices/${id}/trust/${userId}`, params)
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
  },

  // 获取仪表板统计数据
  getDashboardStats: (): Promise<ApiResponse<{
    totalDevices: number
    onlineDevices: number
    activatedDevices: number
    totalUsers: number
    recentDevices: Device[]
  }>> => {
    return request.get('/stats/dashboard')
  },

  // 获取设备统计
  getDeviceStats: (params?: { period?: string }): Promise<ApiResponse<any>> => {
    return request.get('/stats/devices', { params })
  }
}

// WiFi模板相关API
export const wifiTemplateApi = {
  // 获取WiFi模板列表
  getTemplates: (params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<{
    templates: WiFiTemplate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> => {
    return request.get('/wifi-templates', { params })
  },

  // 获取WiFi模板详情
  getTemplate: (id: number): Promise<ApiResponse<WiFiTemplate>> => {
    return request.get(`/wifi-templates/${id}`)
  },

  // 创建WiFi模板
  createTemplate: (params: Omit<WiFiTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<WiFiTemplate>> => {
    return request.post('/wifi-templates', params)
  },

  // 更新WiFi模板
  updateTemplate: (id: number, params: Partial<WiFiTemplate>): Promise<ApiResponse<WiFiTemplate>> => {
    return request.put(`/wifi-templates/${id}`, params)
  },

  // 删除WiFi模板
  deleteTemplate: (id: number): Promise<ApiResponse<null>> => {
    return request.delete(`/wifi-templates/${id}`)
  }
}

// 厂商相关API
export const vendorApi = {
  // 获取厂商列表
  getVendors: (params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<VendorListResponse>> => {
    return request.get('/vendors', { params })
  },

  // 获取厂商详情
  getVendor: (id: number): Promise<ApiResponse<Vendor>> => {
    return request.get(`/vendors/${id}`)
  },

  // 创建厂商
  createVendor: (params: CreateVendorParams): Promise<ApiResponse<Vendor>> => {
    return request.post('/vendors', params)
  },

  // 更新厂商
  updateVendor: (id: number, params: Partial<CreateVendorParams>): Promise<ApiResponse<Vendor>> => {
    return request.put(`/vendors/${id}`, params)
  },

  // 删除厂商
  deleteVendor: (id: number): Promise<ApiResponse<null>> => {
    return request.delete(`/vendors/${id}`)
  },

  // 获取所有活跃厂商（用于下拉选择）
  getAllActiveVendors: (): Promise<ApiResponse<Vendor[]>> => {
    return request.get('/vendors/active')
  }
}

// 远程访问API
export const remoteAccessApi = {
  // 启动HTTP访问
  startHttpAccess: (deviceId: number): Promise<ApiResponse<{ message: string; url?: string }>> => {
    return request.post('/remote-access/http/start', { device_id: deviceId })
  },

  // 启动SSH访问
  startSshAccess: (deviceId: number): Promise<ApiResponse<{ message: string }>> => {
    return request.post('/remote-access/ssh/start', { device_id: deviceId })
  },

  // 停止远程访问
  stopRemoteAccess: (deviceId: number, type: 'http' | 'ssh'): Promise<ApiResponse<{ message: string }>> => {
    return request.post(`/remote-access/${type}/stop`, { device_id: deviceId })
  },

  // 获取远程访问状态
  getRemoteAccessStatus: (deviceId: number): Promise<ApiResponse<{
    http: { status: string; url?: string; port?: number; host?: string }
    ssh: { status: string; port?: number; host?: string }
  }>> => {
    return request.get(`/remote-access/status/${deviceId}`)
  }
}

// WiFi模板相关API
export const wifiTemplatesApi = {
  // 获取WiFi模板列表
  getTemplates: (params?: { page?: number; limit?: number; search?: string; is_active?: boolean }): Promise<ApiResponse<{
    templates: WiFiTemplate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> => {
    return request.get('/wifi-templates', { params })
  },

  // 获取WiFi模板详情
  getTemplate: (id: number): Promise<ApiResponse<WiFiTemplate>> => {
    return request.get(`/wifi-templates/${id}`)
  },

  // 创建WiFi模板
  createTemplate: (params: Omit<WiFiTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<WiFiTemplate>> => {
    return request.post('/wifi-templates', params)
  },

  // 更新WiFi模板
  updateTemplate: (id: number, params: Partial<WiFiTemplate>): Promise<ApiResponse<WiFiTemplate>> => {
    return request.put(`/wifi-templates/${id}`, params)
  },

  // 删除WiFi模板
  deleteTemplate: (id: number): Promise<ApiResponse<null>> => {
    return request.delete(`/wifi-templates/${id}`)
  },

  // 切换模板状态
  toggleTemplate: (id: number): Promise<ApiResponse<null>> => {
    return request.patch(`/wifi-templates/${id}/toggle`)
  }
}

// 设备管理API（别名）
export const devicesApi = deviceApi

// 厂商管理API（别名）
export const vendorsApi = vendorApi

// 导出所有API
export * from './types'
export default {
  authApi,
  modelApi,
  serialApi,
  deviceApi,
  devicesApi,
  pluginApi,
  statsApi,
  wifiTemplateApi,
  wifiTemplatesApi,
  vendorApi,
  vendorsApi,
  remoteAccessApi
}