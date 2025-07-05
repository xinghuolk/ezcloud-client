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
    totalPages: number
  }
}

// 厂商列表响应结构
export interface VendorListResponse {
  vendors: Vendor[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 设备列表响应结构
export interface DeviceListResponse {
  devices: Device[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// 序列号列表响应结构
export interface SerialListResponse {
  serials: SerialNumber[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 设备型号列表响应结构
export interface ModelListResponse {
  models: DeviceModel[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
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

// 远程访问状态类型
export interface RemoteAccessStatus {
  http: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error'
    url?: string
    port?: number
    host?: string
  }
  ssh: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error'
    port?: number
    host?: string
  }
}

export interface LoginResponse {
  token: string
  user: User
}

// 设备型号相关类型
export interface DeviceModel {
  id: number
  vendor_id: number
  oemname: string
  stdname: string
  devtype: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  vendor?: Vendor
  serial_count?: number
  device_count?: number
}

export interface CreateDeviceModelParams {
  vendor_id: number
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

// WiFi相关类型
export interface WiFiStatus {
  id: number
  device_id: number
  interface: string
  ssid?: string
  status: 'up' | 'down' | 'error'
  channel?: number
  frequency?: string
  tx_power?: number
  connected_clients: number
  rx_bytes: number
  tx_bytes: number
  rx_packets: number
  tx_packets: number
  error_count: number
  noise_level?: number
  reported_at: string
}

// 新的WiFi数据结构
export interface WiFiRadio {
  band: '2.4G' | '5G' | '6G'
  enabled: boolean
  channel?: number
  txpower?: number
  htmode?: string
  noise_level?: number
  temperature?: number
  total_tx_bytes: number
  total_rx_bytes: number
  total_error_count: number
  reported_at: string
  ssids: WiFiSSID[]
}

export interface WiFiSSID {
  ssid_index: number
  name?: string
  ssid?: string
  enabled: boolean
  status: 'up' | 'down' | 'error'
  connected_clients: number
  max_clients: number
  rx_bytes: number
  tx_bytes: number
  rx_packets: number
  tx_packets: number
  rx_errors: number
  tx_errors: number
  error_count: number
  reported_at: string
}

export interface WiFiData {
  wifi: {
    radios: WiFiRadio[]
  }
}

// WiFi射频配置接口
export interface WiFiRadioConfig {
  id?: number
  template_id?: number
  band: '2.4G' | '5G' | '6G'
  channel: string
  txpower: number
  htmode: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// WiFi SSID配置接口
export interface WiFiSSIDConfig {
  id?: number
  template_id?: number
  band: '2.4G' | '5G' | '6G'
  ssid_index: number // 0-3
  ssid: string
  password?: string
  encryption: string
  hidden: boolean
  enabled: boolean
  isolate: boolean
  created_at?: string
  updated_at?: string
}

// WiFi模板接口（基于API文档v2.0架构）
export interface WiFiTemplate {
  id: number
  name: string
  description?: string
  country: string
  is_active: boolean
  created_at: string
  updated_at: string
  // 关联数据
  radioConfigs?: WiFiRadioConfig[]
  ssidConfigs?: WiFiSSIDConfig[]
}

// 创建/更新模板时的数据结构
export interface WiFiTemplateCreateData {
  name: string
  description?: string
  country: string
  is_active?: boolean
  radioConfigs: Omit<WiFiRadioConfig, 'id' | 'template_id' | 'created_at' | 'updated_at'>[]
  ssidConfigs: Omit<WiFiSSIDConfig, 'id' | 'template_id' | 'created_at' | 'updated_at'>[]
}

// Modem相关类型
export interface ModemStatus {
  id: number
  device_id: number
  active_slot: number
  operator?: string
  network_type?: string
  rssi?: number
  rsrp?: number
  rsrq?: number
  snr?: number
  iccid?: string
  imsi?: string
  phone_number?: string
  apn_name?: string
  rx_bytes: number
  tx_bytes: number
  rx_speed: number
  tx_speed: number
  last_update: string
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
  // 5G设备状态
  wifiStatus?: WiFiStatus[]
  modemStatus?: ModemStatus
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

// 设备操作相关类型
export interface DeviceCommand {
  id: string
  type: 'reboot' | 'sim_switch' | 'wifi_config' | 'log_collect' | 'apn_config'
  device_id: number
  params?: Record<string, any>
  status: 'pending' | 'sent' | 'success' | 'failed'
  created_at: string
  executed_at?: string
  result?: string
}

export interface DeviceOperationParams {
  type: DeviceCommand['type']
  params?: Record<string, any>
}

export interface BatchOperationParams {
  device_ids: number[]
  operation: DeviceOperationParams
}

// WiFi配置相关类型
export interface WiFiConfigParams {
  template_id?: number
  custom_config?: {
    ssid_2g?: string
    password_2g?: string
    ssid_5g?: string
    password_5g?: string
    channel_2g?: number
    channel_5g?: number
  }
}

// 厂商相关类型
export interface Vendor {
  id: number
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateVendorParams {
  name: string
  description?: string
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