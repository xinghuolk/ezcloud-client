/**
 * API测试数据工厂和高级工具集
 * 提供可复用的测试数据生成、API模拟和测试工具
 */

import { vi } from 'vitest'
import type { 
  Device, 
  DeviceListResponse, 
  User, 
  ApiResponse, 
  ErrorResponse,
  DeviceModel,
  Vendor,
  DeviceTrusteeInfo,
  DeviceStatusSystem,
  DeviceStatusNetwork,
  DeviceStatusModem,
  DeviceStatusWifi,
  LoginResponse,
  RateLimitErrorResponse,
  RecaptchaChallengeResponse
} from '/@src/api/types'

// === 基础数据生成器 ===

/**
 * 生成随机MAC地址
 */
export const generateMacAddress = (): string => {
  return Array.from({ length: 6 }, () => 
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join(':')
}

/**
 * 生成随机序列号
 */
export const generateSerialNumber = (prefix: string = 'DEV', length: number = 6): string => {
  const randomPart = Math.random().toString(36).substring(2, 2 + length).toUpperCase()
  return `${prefix}${randomPart.padStart(length, '0')}`
}

/**
 * 生成随机IP地址
 */
export const generateIpAddress = (): string => {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.')
}

/**
 * 生成随机时间戳（过去一年内）
 */
export const generateTimestamp = (daysAgo: number = 365): string => {
  const now = Date.now()
  const randomTime = now - Math.random() * daysAgo * 24 * 60 * 60 * 1000
  return new Date(randomTime).toISOString()
}

// === 厂商和设备型号工厂 ===

export const createVendor = (overrides: Partial<Vendor> = {}): Vendor => ({
  id: Math.floor(Math.random() * 1000) + 1,
  name: 'Test Vendor',
  code: 'TV',
  description: 'Test Vendor Description',
  website: 'https://test-vendor.com',
  created_at: generateTimestamp(100),
  updated_at: generateTimestamp(30),
  ...overrides
})

export const createDeviceModel = (overrides: Partial<DeviceModel> = {}): DeviceModel => ({
  id: Math.floor(Math.random() * 1000) + 1,
  oemname: `MODEL_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
  stdname: 'Standard Test Model',
  devtype: 'gateway',
  vendor_id: 1,
  description: 'Test device model',
  max_wifi_clients: 64,
  wifi_bands: ['2.4G', '5G'],
  modem_slots: 2,
  ethernet_ports: 4,
  created_at: generateTimestamp(100),
  updated_at: generateTimestamp(30),
  ...overrides
})

// === 用户数据工厂 ===

export const createUser = (overrides: Partial<User> = {}): User => ({
  id: Math.floor(Math.random() * 1000) + 1,
  username: `testuser${Math.floor(Math.random() * 1000)}`,
  email: `test${Math.floor(Math.random() * 1000)}@example.com`,
  role: 'user',
  is_active: true,
  phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
  created_at: generateTimestamp(100),
  updated_at: generateTimestamp(30),
  ...overrides
})

export const createAdmin = (overrides: Partial<User> = {}): User => createUser({
  role: 'admin',
  username: `admin${Math.floor(Math.random() * 100)}`,
  email: `admin${Math.floor(Math.random() * 100)}@example.com`,
  ...overrides
})

// === 设备状态数据工厂 ===

export const createDeviceStatusSystem = (overrides: Partial<DeviceStatusSystem> = {}): DeviceStatusSystem => ({
  id: Math.floor(Math.random() * 1000) + 1,
  device_id: 1,
  uptime: Math.floor(Math.random() * 86400 * 30), // Up to 30 days
  cpu_usage: Math.random() * 100,
  memory_usage: Math.random() * 100,
  disk_usage: Math.random() * 100,
  temperature: Math.random() * 40 + 20, // 20-60°C
  load_average: `${(Math.random() * 2).toFixed(2)} ${(Math.random() * 2).toFixed(2)} ${(Math.random() * 2).toFixed(2)}`,
  kernel_version: '5.4.0-openwrt',
  firmware_version: '1.0.0',
  last_update: generateTimestamp(1),
  ...overrides
})

export const createDeviceStatusNetwork = (overrides: Partial<DeviceStatusNetwork> = {}): DeviceStatusNetwork => ({
  id: Math.floor(Math.random() * 1000) + 1,
  device_id: 1,
  interface_name: 'eth0',
  ip_address: generateIpAddress(),
  netmask: '255.255.255.0',
  gateway: generateIpAddress(),
  dns_servers: [generateIpAddress(), generateIpAddress()],
  rx_bytes: Math.floor(Math.random() * 1e9),
  tx_bytes: Math.floor(Math.random() * 1e9),
  rx_packets: Math.floor(Math.random() * 1e6),
  tx_packets: Math.floor(Math.random() * 1e6),
  rx_errors: Math.floor(Math.random() * 100),
  tx_errors: Math.floor(Math.random() * 100),
  last_update: generateTimestamp(1),
  ...overrides
})

export const createDeviceStatusModem = (overrides: Partial<DeviceStatusModem> = {}): DeviceStatusModem => ({
  id: Math.floor(Math.random() * 1000) + 1,
  device_id: 1,
  active_slot: Math.floor(Math.random() * 2) + 1,
  operator: ['中国移动', '中国联通', '中国电信'][Math.floor(Math.random() * 3)],
  network_type: ['4G', '5G'][Math.floor(Math.random() * 2)],
  signal_strength: Math.floor(Math.random() * 40) - 100, // -100 to -60 dBm
  rsrp: Math.floor(Math.random() * 40) - 140, // -140 to -100 dBm
  rsrq: Math.floor(Math.random() * 20) - 20, // -20 to 0 dB
  snr: Math.floor(Math.random() * 30), // 0 to 30 dB
  cell_id: `${Math.floor(Math.random() * 1000000)}`,
  lac: `${Math.floor(Math.random() * 65536)}`,
  imei: `86${Math.floor(Math.random() * 1e13).toString().padStart(13, '0')}`,
  iccid: `898601${Math.floor(Math.random() * 1e13).toString().padStart(13, '0')}`,
  phone_number: `138${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`,
  data_usage_month: Math.floor(Math.random() * 10 * 1024 * 1024 * 1024), // Up to 10GB
  last_update: generateTimestamp(1),
  ...overrides
})

export const createDeviceStatusWifi = (overrides: Partial<DeviceStatusWifi> = {}): DeviceStatusWifi => ({
  id: Math.floor(Math.random() * 1000) + 1,
  device_id: 1,
  interface_name: 'wlan0',
  ssid: `TestWiFi_${Math.random().toString(36).substring(2, 8)}`,
  bssid: generateMacAddress(),
  frequency: [2412, 2437, 2462, 5180, 5200, 5220][Math.floor(Math.random() * 6)],
  channel: Math.floor(Math.random() * 13) + 1,
  mode: ['AP', 'STA'][Math.floor(Math.random() * 2)],
  encryption: 'WPA2-PSK',
  signal_strength: Math.floor(Math.random() * 60) - 90, // -90 to -30 dBm
  connected_clients: Math.floor(Math.random() * 20),
  max_clients: 64,
  bandwidth: ['20MHz', '40MHz', '80MHz'][Math.floor(Math.random() * 3)],
  tx_power: Math.floor(Math.random() * 20) + 10, // 10-30 dBm
  last_update: generateTimestamp(1),
  ...overrides
})

// === 设备数据工厂 ===

export const createDevice = (overrides: Partial<Device> = {}): Device => {
  const deviceId = overrides.id || Math.floor(Math.random() * 1000) + 1
  
  return {
    id: deviceId,
    serial: generateSerialNumber('DEV'),
    name: `测试设备 ${deviceId}`,
    is_online: Math.random() > 0.3, // 70% chance online
    is_activate: Math.random() > 0.1, // 90% chance activated
    model_id: Math.floor(Math.random() * 10) + 1,
    user_id: Math.floor(Math.random() * 100) + 1,
    primary_mac: generateMacAddress(),
    created_at: generateTimestamp(100),
    updated_at: generateTimestamp(10),
    ownership: {
      isOwner: Math.random() > 0.5,
      isTrusted: Math.random() > 0.7
    },
    deviceModel: createDeviceModel(),
    systemStatus: createDeviceStatusSystem({ device_id: deviceId }),
    networkStatus: createDeviceStatusNetwork({ device_id: deviceId }),
    modemStatus: createDeviceStatusModem({ device_id: deviceId }),
    wifiStatus: createDeviceStatusWifi({ device_id: deviceId }),
    ...overrides
  }
}

export const createDeviceList = (count: number, overrides: Partial<Device>[] = []): Device[] => {
  return Array.from({ length: count }, (_, index) => 
    createDevice({ 
      id: index + 1, 
      ...(overrides[index] || {}) 
    })
  )
}

// === 设备托管数据工厂 ===

export const createDeviceTrusteeInfo = (overrides: Partial<DeviceTrusteeInfo> = {}): DeviceTrusteeInfo => ({
  id: Math.floor(Math.random() * 1000) + 1,
  device_id: 1,
  trustee_id: Math.floor(Math.random() * 1000) + 2,
  username: `trustee${Math.floor(Math.random() * 1000)}`,
  email: `trustee${Math.floor(Math.random() * 1000)}@example.com`,
  trusted_at: generateTimestamp(30),
  expires_at: Math.random() > 0.5 ? generateTimestamp(-30) : undefined, // 50% have expiration
  status: ['active', 'inactive', 'expired'][Math.floor(Math.random() * 3)] as 'active' | 'inactive' | 'expired',
  notes: Math.random() > 0.5 ? `Trust note ${Math.floor(Math.random() * 1000)}` : undefined,
  ...overrides
})

// === API响应工厂 ===

export const createApiResponse = <T>(data: T, success: boolean = true): ApiResponse<T> => ({
  success,
  message: success ? 'Operation successful' : 'Operation failed',
  data,
  timestamp: new Date().toISOString(),
  request_id: Math.random().toString(36).substring(2, 15)
})

export const createDeviceListResponse = (devices: Device[], page: number = 1, limit: number = 20): ApiResponse<DeviceListResponse> => {
  const total = devices.length
  const pages = Math.ceil(total / limit)
  
  return createApiResponse({
    devices,
    pagination: {
      page,
      limit,
      total,
      pages,
      has_next: page < pages,
      has_prev: page > 1
    }
  })
}

export const createErrorResponse = (
  message: string,
  error: string = 'API_ERROR',
  statusCode: number = 400,
  details?: any[]
): ErrorResponse => ({
  success: false,
  message,
  error,
  code: error,
  statusCode,
  timestamp: new Date().toISOString(),
  request_id: Math.random().toString(36).substring(2, 15),
  details
})

export const createLoginResponse = (user: User): ApiResponse<LoginResponse> => {
  const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ 
    user_id: user.id, 
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 3600 
  }))}.${Math.random().toString(36).substring(2, 15)}`
  
  return createApiResponse({
    token,
    user,
    expires_in: 3600,
    refresh_token: Math.random().toString(36).substring(2, 30)
  })
}

export const createRateLimitError = (
  retryAfter: number = 300,
  limitType: string = 'per_minute'
): RateLimitErrorResponse => ({
  success: false,
  message: 'Rate limit exceeded',
  error: 'RATE_LIMITED',
  retryAfter,
  limitType,
  remainingAttempts: 0,
  resetTime: new Date(Date.now() + retryAfter * 1000).toISOString()
})

export const createRecaptchaChallenge = (
  challengeType: 'recaptcha_v2' | 'recaptcha_v3' = 'recaptcha_v2'
): RecaptchaChallengeResponse => ({
  challenge_type: challengeType,
  message: 'reCAPTCHA verification required',
  site_key: 'test_site_key_6Ldh6ZsrAAAAAAVpZwayZLdWi73EJxtVtEFWMK7m',
  action: challengeType === 'recaptcha_v3' ? 'login' : undefined,
  threshold: challengeType === 'recaptcha_v3' ? 0.5 : undefined
})

// === 高级测试场景生成器 ===

/**
 * 生成大规模设备数据集，包含各种状态分布
 */
export const createLargeDeviceDataset = (
  count: number,
  options: {
    onlineRate?: number
    activeRate?: number
    ownershipRate?: number
    trustRate?: number
  } = {}
): Device[] => {
  const {
    onlineRate = 0.7,
    activeRate = 0.9,
    ownershipRate = 0.6,
    trustRate = 0.2
  } = options

  return Array.from({ length: count }, (_, index) => {
    const deviceId = index + 1
    return createDevice({
      id: deviceId,
      serial: generateSerialNumber('BULK', 6),
      name: `批量设备 ${deviceId.toString().padStart(6, '0')}`,
      is_online: Math.random() < onlineRate,
      is_activate: Math.random() < activeRate,
      ownership: {
        isOwner: Math.random() < ownershipRate,
        isTrusted: Math.random() < trustRate
      }
    })
  })
}

/**
 * 生成复杂的设备状态更新场景
 */
export const createStatusUpdateScenario = (deviceId: number) => {
  const scenarios = [
    // 设备启动场景
    {
      type: 'device_startup',
      updates: [
        { type: 'system', data: createDeviceStatusSystem({ device_id: deviceId, uptime: 0 }) },
        { type: 'network', data: createDeviceStatusNetwork({ device_id: deviceId }) },
        { type: 'modem', data: createDeviceStatusModem({ device_id: deviceId }) }
      ]
    },
    // 网络切换场景
    {
      type: 'network_handover',
      updates: [
        { type: 'modem', data: createDeviceStatusModem({ 
          device_id: deviceId, 
          network_type: '5G',
          signal_strength: -65,
          operator: '中国移动'
        }) },
        { type: 'modem', data: createDeviceStatusModem({ 
          device_id: deviceId, 
          network_type: '4G',
          signal_strength: -85,
          operator: '中国联通'
        }) }
      ]
    },
    // 设备离线场景
    {
      type: 'device_offline',
      updates: [
        { type: 'system', data: { ...createDeviceStatusSystem({ device_id: deviceId }), last_update: generateTimestamp(1) } },
        { type: 'network', data: null }, // 网络断开
        { type: 'modem', data: null } // 调制解调器断开
      ]
    }
  ]

  return scenarios[Math.floor(Math.random() * scenarios.length)]
}

// === 性能测试工具 ===

export class ApiPerformanceProfiler {
  private startTime: number = 0
  private endTime: number = 0
  private memoryStart: number = 0
  private memoryEnd: number = 0
  private callCounts: Map<string, number> = new Map()

  start() {
    this.startTime = performance.now()
    this.memoryStart = (performance as any).memory?.usedJSHeapSize || 0
  }

  end() {
    this.endTime = performance.now()
    this.memoryEnd = (performance as any).memory?.usedJSHeapSize || 0
  }

  recordApiCall(apiName: string) {
    const current = this.callCounts.get(apiName) || 0
    this.callCounts.set(apiName, current + 1)
  }

  getDuration() {
    return this.endTime - this.startTime
  }

  getMemoryUsage() {
    return this.memoryEnd - this.memoryStart
  }

  getApiCallStats() {
    return Object.fromEntries(this.callCounts)
  }

  getReport() {
    return {
      duration: this.getDuration(),
      memoryUsage: this.getMemoryUsage(),
      apiCalls: this.getApiCallStats(),
      callsPerSecond: Array.from(this.callCounts.values()).reduce((a, b) => a + b, 0) / (this.getDuration() / 1000)
    }
  }
}

// === Mock工具增强 ===

export class AdvancedApiMocker {
  private callHistory: Array<{
    method: string
    url: string
    data?: any
    timestamp: number
    duration: number
  }> = []

  private responseDelays: Map<string, number> = new Map()
  private failureRates: Map<string, number> = new Map()

  mockAxios(mockedAxios: any) {
    const originalGet = mockedAxios.get
    const originalPost = mockedAxios.post
    const originalPut = mockedAxios.put
    const originalDelete = mockedAxios.delete

    mockedAxios.get = this.wrapMethod('GET', originalGet.bind(mockedAxios))
    mockedAxios.post = this.wrapMethod('POST', originalPost.bind(mockedAxios))
    mockedAxios.put = this.wrapMethod('PUT', originalPut.bind(mockedAxios))
    mockedAxios.delete = this.wrapMethod('DELETE', originalDelete.bind(mockedAxios))
  }

  private wrapMethod(method: string, originalMethod: Function) {
    return async (url: string, ...args: any[]) => {
      const startTime = performance.now()
      
      // Simulate network delay
      const delay = this.responseDelays.get(url) || 0
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      // Simulate random failures
      const failureRate = this.failureRates.get(url) || 0
      if (Math.random() < failureRate) {
        throw new Error(`Simulated network failure for ${method} ${url}`)
      }
      
      try {
        const result = await originalMethod(url, ...args)
        
        this.callHistory.push({
          method,
          url,
          data: args[0],
          timestamp: Date.now(),
          duration: performance.now() - startTime
        })
        
        return result
      } catch (error) {
        this.callHistory.push({
          method,
          url,
          data: args[0],
          timestamp: Date.now(),
          duration: performance.now() - startTime
        })
        throw error
      }
    }
  }

  setResponseDelay(urlPattern: string, delay: number) {
    this.responseDelays.set(urlPattern, delay)
  }

  setFailureRate(urlPattern: string, rate: number) {
    this.failureRates.set(urlPattern, rate)
  }

  getCallHistory() {
    return [...this.callHistory]
  }

  getCallsByUrl(urlPattern: string) {
    return this.callHistory.filter(call => call.url.includes(urlPattern))
  }

  getAverageResponseTime(urlPattern?: string) {
    const calls = urlPattern 
      ? this.getCallsByUrl(urlPattern)
      : this.callHistory
    
    if (calls.length === 0) return 0
    
    const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0)
    return totalDuration / calls.length
  }

  clearHistory() {
    this.callHistory = []
  }
}