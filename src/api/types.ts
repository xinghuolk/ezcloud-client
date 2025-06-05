// 通用响应结构
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
  timestamp?: string
}

// 分页参数
export interface PaginationParams {
  page?: number
  limit?: number
}

// 分页响应结构
export interface PaginationResponse<T = any> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// 用户相关类型
export interface User {
  id: number
  username: string
  email: string
  phone?: string
  role: 'user' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface LoginParams {
  email: string
  password: string
}

export interface RegisterParams {
  username: string
  email: string
  password: string
  phone?: string
}

export interface LoginResponse {
  token: string
  user: User
}

// 设备型号相关类型
export interface DeviceModel {
  id: number
  oemname: string
  stdname: string
  devtype: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateDeviceModelParams {
  oemname: string
  stdname: string
  devtype: string
  description?: string
}

// 序列号相关类型
export interface SerialNumber {
  id: number
  model_id: number
  batch_id: string
  serial: string
  mac_start: string
  mac_count: number
  mac_interval: number
  status: 'unused' | 'bound' | 'activated'
  created_at: string
  bound_at?: string
}

export interface GenerateSerialParams {
  model_id: number
  count: number
  mac_start: string
  mac_count: number
  mac_interval: number
}

// 设备相关类型
export interface Device {
  id: number
  serial: string
  model_id: number
  userid?: number
  name?: string
  primary_mac: string
  is_online: boolean
  is_activate: boolean
  wanip?: string
  public_ip?: string
  firsttime?: string
  version?: string
  last_seen?: string
  created_at: string
  updated_at: string
  // 关联数据
  deviceModel?: {
    id: number
    oemname: string
    stdname: string
    devtype: string
    vendor?: {
      id: number
      name: string
    }
  }
  user?: {
    id: number
    username: string
    email: string
  }
  serialNumber?: {
    id: number
    batch_id: string
    mac_start: string
    mac_count: number
    mac_interval: number
    status: string
  }
}

export interface DeviceBindParams {
  serial: string
}

export interface DeviceQuery {
  page?: number
  limit?: number
  search?: string
  is_online?: boolean
  is_activate?: boolean
  oemname?: string
  stdname?: string
  serial?: string
  name?: string
}

// 设备状态相关类型
export interface DeviceStatus {
  id: number
  device_id: number
  cpuload?: number
  memload?: number
  hostnum: number
  hostmax: number
  upload_total: number
  download_total: number
  reported_at: string
}

// 插件相关类型
export interface Plugin {
  id: number
  plugin_id: string
  name: string
  version: string
  status: 'active' | 'inactive' | 'error'
  config?: Record<string, any>
  last_heartbeat?: string
  created_at: string
  updated_at: string
} 