/**
 * API 模拟工具
 * 用于在测试中模拟 HTTP 请求和响应
 */

import { vi } from 'vitest'
import type { ApiResponse } from '/@src/api/types'

// 模拟成功响应的工厂函数
export const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  message: 'Success'
})

// 模拟错误响应的工厂函数
export const createErrorResponse = (
  message: string = 'Error occurred',
  statusCode: number = 400
): { response: { status: number; data: { message: string } } } => ({
  response: {
    status: statusCode,
    data: { message }
  }
})

// API 模拟数据
export const mockApiData = {
  // 用户数据
  users: {
    currentUser: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      created_at: '2024-01-01T00:00:00Z'
    },
    loginResponse: {
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      },
      token: 'mock-jwt-token'
    }
  },

  // 设备数据
  devices: {
    device: {
      id: 1,
      serial: 'TEST-DEVICE-001',
      name: 'Test Device',
      is_online: true,
      is_activate: true,
      model_id: 1,
      user_id: 1,
      ownership: {
        isOwner: true,
        isTrusted: false
      }
    },
    deviceList: {
      devices: [
        {
          id: 1,
          serial: 'TEST-DEVICE-001',
          name: 'Test Device 1',
          is_online: true,
          is_activate: true
        },
        {
          id: 2,
          serial: 'TEST-DEVICE-002',
          name: 'Test Device 2',
          is_online: false,
          is_activate: true
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        pages: 1
      }
    }
  },

  // Modem状态数据
  modemStatus: {
    operator: 'China Mobile',
    network_type: '5G',
    rssi: -75,
    rsrp: -105,
    rsrq: -10,
    snr: 20,
    active_slot: 1,
    apn_name: 'cmnet',
    iccid: '898600123456789012',
    imsi: '460001234567890',
    phone_number: '+8613812345678',
    rx_bytes: 1024000,
    tx_bytes: 512000,
    rx_speed: 50000000,
    tx_speed: 10000000,
    last_update: '2024-01-01T12:00:00Z'
  },

  // 设备托管数据
  deviceTrust: {
    trustees: [
      {
        id: 1,
        trustee_id: 2,
        username: 'trusted_user',
        email: 'trusted@example.com',
        status: 'active',
        trusted_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-12-31T23:59:59Z',
        notes: 'Test trust relationship'
      }
    ]
  }
}

// 创建模拟的 axios 实例
export const createMockAxios = () => {
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }

  return mockAxios
}

// API 响应模拟助手
export const mockApiResponse = <T>(data: T, delay: number = 0) => {
  return new Promise<ApiResponse<T>>((resolve) => {
    setTimeout(() => {
      resolve(createSuccessResponse(data))
    }, delay)
  })
}

// API 错误模拟助手
export const mockApiError = (message: string, statusCode: number = 400, delay: number = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(createErrorResponse(message, statusCode))
    }, delay)
  })
}