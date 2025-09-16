/**
 * API集成测试
 * 测试前端与后端API的完整集成流程，包括：
 * - HTTP请求/响应处理
 * - 错误处理和重试机制
 * - 认证和授权流程
 * - 数据序列化和反序列化
 * - API响应格式验证
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios, { AxiosError } from 'axios'
import { deviceApi, authApi } from '/@src/api'
import { notyf } from '/@src/api/request'
import { useDeviceStore } from '/@src/stores/devices'
import type { 
  Device, 
  DeviceListResponse, 
  LoginParams, 
  LoginResponse,
  ApiResponse,
  ErrorResponse,
  RateLimitErrorResponse,
  RecaptchaChallengeResponse
} from '/@src/api/types'

// Mock axios for HTTP request testing
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }))
  }
}))
const mockedAxios = vi.mocked(axios)

// Mock notification system
vi.mock('/@src/api/request', () => ({
  default: {}, // 添加默认导出
  notyf: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

// Test data factories
const createMockApiResponse = <T>(data: T, success = true): ApiResponse<T> => ({
  success,
  message: success ? 'Operation successful' : 'Operation failed',
  data,
  timestamp: new Date().toISOString()
})

const createMockErrorResponse = (
  message: string,
  code?: string,
  statusCode?: number
): ErrorResponse => ({
  success: false,
  message,
  error: code || 'API_ERROR',
  code,
  statusCode,
  timestamp: new Date().toISOString()
})

const createMockAxiosError = (
  status: number,
  data: any,
  message = 'Request failed'
): AxiosError => {
  const error = new Error(message) as AxiosError
  error.isAxiosError = true
  error.response = {
    status,
    data,
    statusText: 'Error',
    headers: {},
    config: {} as any
  }
  return error
}

describe('API集成测试', () => {
  let deviceStore: ReturnType<typeof useDeviceStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    deviceStore = useDeviceStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('设备API集成测试', () => {
    describe('设备列表获取', () => {
      it('应该正确处理成功的API响应', async () => {
        // Step 1: Setup mock response
        const mockDevices: Device[] = [
          {
            id: 1,
            serial: 'TEST001',
            name: 'Test Device 1',
            is_online: true,
            is_activate: true,
            model_id: 1,
            user_id: 1,
            primary_mac: '00:11:22:33:44:55',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            ownership: {
              isOwner: true,
              isTrusted: false
            }
          }
        ]

        const mockResponse = createMockApiResponse<DeviceListResponse>({
          devices: mockDevices,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          }
        })

        mockedAxios.get.mockResolvedValue({ data: mockResponse })

        // Step 2: Make API call
        const result = await deviceApi.getDevices({ page: 1, limit: 20 })

        // Step 3: Verify request
        expect(mockedAxios.get).toHaveBeenCalledWith(
          '/api/v1/devices',
          expect.objectContaining({
            params: { page: 1, limit: 20 }
          })
        )

        // Step 4: Verify response
        expect(result.success).toBe(true)
        expect(result.data.devices).toHaveLength(1)
        expect(result.data.devices[0].serial).toBe('TEST001')
        expect(result.data.pagination.total).toBe(1)
      })

      it('应该正确处理查询参数', async () => {
        const mockResponse = createMockApiResponse<DeviceListResponse>({
          devices: [],
          pagination: { page: 2, limit: 10, total: 0, pages: 0 }
        })
        mockedAxios.get.mockResolvedValue({ data: mockResponse })

        const query = {
          page: 2,
          limit: 10,
          search: 'test',
          is_online: true,
          include_trusted: true
        }

        await deviceApi.getDevices(query)

        expect(mockedAxios.get).toHaveBeenCalledWith(
          '/api/v1/devices',
          expect.objectContaining({
            params: query
          })
        )
      })

      it('应该正确处理404错误', async () => {
        const errorResponse = createMockErrorResponse(
          'Devices not found',
          'NOT_FOUND',
          404
        )
        
        const axiosError = createMockAxiosError(404, errorResponse)
        mockedAxios.get.mockRejectedValue(axiosError)

        await expect(deviceApi.getDevices({})).rejects.toThrow()
      })

      it('应该正确处理网络超时', async () => {
        const timeoutError = new Error('timeout of 5000ms exceeded')
        timeoutError.name = 'ECONNABORTED'
        mockedAxios.get.mockRejectedValue(timeoutError)

        await expect(deviceApi.getDevices({})).rejects.toThrow('timeout')
      })
    })

    describe('设备操作API', () => {
      it('应该正确处理设备绑定', async () => {
        const mockResponse = createMockApiResponse({
          device_id: 1,
          message: 'Device bound successfully'
        })
        mockedAxios.post.mockResolvedValue({ data: mockResponse })

        const result = await deviceApi.bindDevice({ serial: 'TEST001' })

        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/v1/devices/bind',
          { serial: 'TEST001' }
        )
        expect(result.success).toBe(true)
      })

      it('应该正确处理设备重启命令', async () => {
        const mockResponse = createMockApiResponse({
          command_id: 'cmd_123',
          status: 'sent'
        })
        mockedAxios.post.mockResolvedValue({ data: mockResponse })

        const result = await deviceApi.rebootDevice(1)

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/devices/1/reboot')
        expect(result.success).toBe(true)
        expect(result.data.command_id).toBe('cmd_123')
      })

      it('应该正确处理批量操作', async () => {
        const mockResponse = createMockApiResponse({
          batch_id: 'batch_123',
          success_count: 3,
          failed_count: 0
        })
        mockedAxios.post.mockResolvedValue({ data: mockResponse })

        const batchParams = {
          device_ids: [1, 2, 3],
          operation: {
            type: 'reboot' as const,
            params: { force: true }
          }
        }

        const result = await deviceApi.batchOperation(batchParams)

        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/v1/devices/batch',
          batchParams
        )
        expect(result.data.success_count).toBe(3)
      })
    })

    describe('设备托管API', () => {
      it('应该正确处理托管创建', async () => {
        const mockResponse = createMockApiResponse({
          trust: {
            id: 1,
            device_id: 1,
            trustee_id: 2,
            status: 'active',
            trusted_at: '2024-01-01T00:00:00Z'
          }
        })
        mockedAxios.post.mockResolvedValue({ data: mockResponse })

        const trustParams = {
          trustee_id: 2,
          expires_at: '2024-12-31T23:59:59Z',
          notes: 'Test trust'
        }

        const result = await deviceApi.trustDevice(1, trustParams)

        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/v1/devices/1/trust',
          trustParams
        )
        expect(result.success).toBe(true)
      })

      it('应该正确处理托管列表获取', async () => {
        const mockTrustees = [
          {
            id: 1,
            trustee_id: 2,
            username: 'trustee1',
            email: 'trustee1@example.com',
            trusted_at: '2024-01-01T00:00:00Z',
            status: 'active' as const
          }
        ]

        const mockResponse = createMockApiResponse({
          trustees: mockTrustees
        })
        mockedAxios.get.mockResolvedValue({ data: mockResponse })

        const result = await deviceApi.getDeviceTrustees(1)

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/devices/1/trustees')
        expect(result.data.trustees).toHaveLength(1)
      })
    })
  })

  describe('认证API集成测试', () => {
    describe('用户登录', () => {
      it('应该正确处理成功登录', async () => {
        const mockResponse = createMockApiResponse<LoginResponse>({
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'user',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        })
        mockedAxios.post.mockResolvedValue({ data: mockResponse })

        const loginParams: LoginParams = {
          email: 'test@example.com',
          password: 'password123'
        }

        const result = await authApi.login(loginParams)

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/auth/login', loginParams)
        expect(result.success).toBe(true)
        expect(result.data.token).toBeDefined()
        expect(result.data.user.email).toBe('test@example.com')
      })

      it('应该正确处理reCAPTCHA挑战', async () => {
        const recaptchaChallenge: RecaptchaChallengeResponse = {
          challenge_type: 'recaptcha_v2',
          message: 'reCAPTCHA verification required',
          site_key: 'test_site_key'
        }

        const challengeError = createMockAxiosError(429, recaptchaChallenge)
        mockedAxios.post.mockRejectedValueOnce(challengeError)

        // Second attempt with reCAPTCHA token
        const successResponse = createMockApiResponse<LoginResponse>({
          token: 'token_with_recaptcha',
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'user',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        })
        mockedAxios.post.mockResolvedValueOnce({ data: successResponse })

        // First attempt should fail with reCAPTCHA challenge
        const loginParams: LoginParams = {
          email: 'test@example.com',
          password: 'password123'
        }

        await expect(authApi.login(loginParams)).rejects.toThrow()

        // Second attempt with reCAPTCHA token should succeed
        const loginParamsWithRecaptcha: LoginParams = {
          ...loginParams,
          recaptcha_v2_token: 'recaptcha_response_token'
        }

        const result = await authApi.login(loginParamsWithRecaptcha)
        expect(result.success).toBe(true)
      })

      it('应该正确处理速率限制', async () => {
        const rateLimitError: RateLimitErrorResponse = {
          success: false,
          message: 'Too many login attempts',
          error: 'RATE_LIMITED',
          retryAfter: 300,
          limitType: 'per_minute',
          remainingAttempts: 0
        }

        const axiosError = createMockAxiosError(429, rateLimitError)
        mockedAxios.post.mockRejectedValue(axiosError)

        await expect(authApi.login({
          email: 'test@example.com',
          password: 'password123'
        })).rejects.toThrow()
      })
    })

    describe('用户存在性检查', () => {
      it('应该正确检查存在的用户', async () => {
        const mockResponse = createMockApiResponse({
          exists: true,
          user_id: 2
        })
        mockedAxios.post.mockResolvedValue({ data: mockResponse })

        const result = await authApi.checkUserExists({ email: 'existing@example.com' })

        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/v1/auth/check-user',
          { email: 'existing@example.com' }
        )
        expect(result.data.exists).toBe(true)
        expect(result.data.user_id).toBe(2)
      })

      it('应该正确处理不存在的用户', async () => {
        const mockResponse = createMockApiResponse({
          exists: false
        })
        mockedAxios.post.mockResolvedValue({ data: mockResponse })

        const result = await authApi.checkUserExists({ email: 'nonexistent@example.com' })

        expect(result.data.exists).toBe(false)
        expect(result.data.user_id).toBeUndefined()
      })
    })
  })

  describe('HTTP状态码和错误处理', () => {
    it('应该正确处理400 Bad Request', async () => {
      const errorResponse = createMockErrorResponse(
        'Invalid request parameters',
        'VALIDATION_ERROR',
        400
      )
      errorResponse.details = [
        { field: 'email', message: 'Invalid email format', code: 'INVALID_EMAIL' }
      ]

      const axiosError = createMockAxiosError(400, errorResponse)
      mockedAxios.post.mockRejectedValue(axiosError)

      await expect(authApi.login({
        email: 'invalid-email',
        password: 'password'
      })).rejects.toThrow()
    })

    it('应该正确处理401 Unauthorized', async () => {
      const errorResponse = createMockErrorResponse(
        'Invalid credentials',
        'UNAUTHORIZED',
        401
      )

      const axiosError = createMockAxiosError(401, errorResponse)
      mockedAxios.post.mockRejectedValue(axiosError)

      await expect(authApi.login({
        email: 'test@example.com',
        password: 'wrong_password'
      })).rejects.toThrow()
    })

    it('应该正确处理403 Forbidden', async () => {
      const errorResponse = createMockErrorResponse(
        'Access denied',
        'FORBIDDEN',
        403
      )

      const axiosError = createMockAxiosError(403, errorResponse)
      mockedAxios.get.mockRejectedValue(axiosError)

      await expect(deviceApi.getDevices({})).rejects.toThrow()
    })

    it('应该正确处理500 Internal Server Error', async () => {
      const errorResponse = createMockErrorResponse(
        'Internal server error',
        'INTERNAL_ERROR',
        500
      )

      const axiosError = createMockAxiosError(500, errorResponse)
      mockedAxios.get.mockRejectedValue(axiosError)

      await expect(deviceApi.getDevices({})).rejects.toThrow()
    })
  })

  describe('数据序列化和验证', () => {
    it('应该正确序列化请求数据', async () => {
      const mockResponse = createMockApiResponse({ success: true })
      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const complexData = {
        device_ids: [1, 2, 3],
        operation: {
          type: 'wifi_config',
          params: {
            template_id: 5,
            custom_config: {
              ssid_2g: 'TestWiFi_2G',
              password_2g: 'password123',
              channel_2g: 6
            }
          }
        }
      }

      await deviceApi.batchOperation(complexData)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/devices/batch',
        complexData
      )
    })

    it('应该正确处理日期字段', async () => {
      const mockResponse = createMockApiResponse({ trust_id: 1 })
      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const trustParams = {
        trustee_id: 2,
        expires_at: '2024-12-31T23:59:59.000Z',
        notes: 'Test with date'
      }

      await deviceApi.trustDevice(1, trustParams)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/devices/1/trust',
        expect.objectContaining({
          expires_at: '2024-12-31T23:59:59.000Z'
        })
      )
    })

    it('应该正确验证响应数据格式', async () => {
      // Test with malformed response
      const malformedResponse = {
        success: true,
        // Missing required fields
        data: {
          devices: 'not_an_array', // Should be array
          pagination: 'invalid' // Should be object
        }
      }

      mockedAxios.get.mockResolvedValue({ data: malformedResponse })

      // The API call should handle malformed data gracefully
      const result = await deviceApi.getDevices({})
      expect(result.success).toBe(true)
      // The client should validate and potentially transform the data
    })
  })

  describe('并发请求处理', () => {
    it('应该正确处理并发API调用', async () => {
      const responses = [
        createMockApiResponse({ device: { id: 1 } }),
        createMockApiResponse({ device: { id: 2 } }),
        createMockApiResponse({ device: { id: 3 } })
      ]

      mockedAxios.get
        .mockResolvedValueOnce({ data: responses[0] })
        .mockResolvedValueOnce({ data: responses[1] })
        .mockResolvedValueOnce({ data: responses[2] })

      const promises = [
        deviceApi.getDevice(1),
        deviceApi.getDevice(2),
        deviceApi.getDevice(3)
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.success).toBe(true)
        expect(result.data.device.id).toBe(index + 1)
      })
    })

    it('应该正确处理部分失败的并发请求', async () => {
      const successResponse = createMockApiResponse({ device: { id: 1 } })
      const errorResponse = createMockAxiosError(404, createMockErrorResponse('Not found'))

      mockedAxios.get
        .mockResolvedValueOnce({ data: successResponse })
        .mockRejectedValueOnce(errorResponse)

      const results = await Promise.allSettled([
        deviceApi.getDevice(1),
        deviceApi.getDevice(999)
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
    })
  })
})