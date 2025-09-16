/**
 * 测试辅助工具集
 * 提供可复用的测试工具函数、断言扩展和常用测试模式
 */

import { vi, expect } from 'vitest'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import type { ApiResponse, ErrorResponse } from '/@src/api/types'

// === 异步测试工具 ===

/**
 * 等待Vue组件更新完成
 */
export const waitForVueUpdate = async (times: number = 1): Promise<void> => {
  for (let i = 0; i < times; i++) {
    await nextTick()
  }
}

/**
 * 等待异步操作完成
 */
export const waitForAsync = async (ms: number = 0): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 等待条件满足或超时
 */
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await waitForAsync(interval)
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * 等待元素在DOM中出现
 */
export const waitForElement = async (
  wrapper: VueWrapper<any>,
  selector: string,
  timeout: number = 5000
): Promise<void> => {
  await waitForCondition(
    () => wrapper.find(selector).exists(),
    timeout,
    50
  )
}

// === Mock管理工具 ===

/**
 * 创建标准的API响应Mock
 */
export const createApiMock = <T>(data: T, success: boolean = true): ApiResponse<T> => ({
  success,
  message: success ? 'Operation successful' : 'Operation failed',
  data,
  timestamp: new Date().toISOString(),
  request_id: Math.random().toString(36).substring(2, 15)
})

/**
 * 创建标准的错误响应Mock
 */
export const createErrorMock = (
  message: string,
  code: string = 'API_ERROR',
  statusCode: number = 400
): ErrorResponse => ({
  success: false,
  message,
  error: code,
  code,
  statusCode,
  timestamp: new Date().toISOString(),
  request_id: Math.random().toString(36).substring(2, 15)
})

/**
 * Mock管理器类，统一管理所有mock函数
 */
export class MockManager {
  private mocks: Map<string, any> = new Map()

  /**
   * 注册一个mock函数
   */
  register(name: string, mockFn: any): this {
    this.mocks.set(name, mockFn)
    return this
  }

  /**
   * 获取mock函数
   */
  get(name: string): any {
    return this.mocks.get(name)
  }

  /**
   * 清理所有mock
   */
  clearAll(): void {
    this.mocks.forEach(mock => {
      if (typeof mock.mockClear === 'function') {
        mock.mockClear()
      }
    })
  }

  /**
   * 重置所有mock
   */
  resetAll(): void {
    this.mocks.forEach(mock => {
      if (typeof mock.mockReset === 'function') {
        mock.mockReset()
      }
    })
  }

  /**
   * 设置API响应序列（按顺序返回不同响应）
   */
  setApiResponseSequence(apiName: string, responses: any[]): void {
    const mock = this.get(apiName)
    if (mock) {
      responses.forEach((response, index) => {
        mock.mockImplementationOnce(() => 
          Promise.resolve(response)
        )
      })
    }
  }

  /**
   * 设置API延迟响应
   */
  setApiDelay(apiName: string, delay: number, response: any): void {
    const mock = this.get(apiName)
    if (mock) {
      mock.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(response), delay))
      )
    }
  }

  /**
   * 设置API失败
   */
  setApiFailure(apiName: string, error: Error): void {
    const mock = this.get(apiName)
    if (mock) {
      mock.mockRejectedValue(error)
    }
  }
}

// === 组件测试工具 ===

/**
 * 等待组件的特定事件被触发
 */
export const waitForEvent = async (
  wrapper: VueWrapper<any>,
  eventName: string,
  timeout: number = 5000
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Event "${eventName}" not emitted within ${timeout}ms`))
    }, timeout)

    const emittedEvents = wrapper.emitted(eventName)
    if (emittedEvents && emittedEvents.length > 0) {
      clearTimeout(timer)
      resolve(emittedEvents[emittedEvents.length - 1])
    } else {
      // 监听新的事件
      const originalEmitted = wrapper.emitted
      wrapper.emitted = () => {
        const events = originalEmitted()
        if (events[eventName]) {
          clearTimeout(timer)
          resolve(events[eventName][events[eventName].length - 1])
        }
        return events
      }
    }
  })
}

/**
 * 查找组件中的表单字段
 */
export const findFormField = (wrapper: VueWrapper<any>, fieldName: string) => {
  const selectors = [
    `[name="${fieldName}"]`,
    `[data-testid="${fieldName}"]`,
    `[id="${fieldName}"]`,
    `.field-${fieldName} input`,
    `.field-${fieldName} select`,
    `.field-${fieldName} textarea`
  ]

  for (const selector of selectors) {
    const element = wrapper.find(selector)
    if (element.exists()) {
      return element
    }
  }

  throw new Error(`Form field "${fieldName}" not found`)
}

/**
 * 填写表单数据
 */
export const fillForm = async (wrapper: VueWrapper<any>, formData: Record<string, any>): Promise<void> => {
  for (const [fieldName, value] of Object.entries(formData)) {
    const field = findFormField(wrapper, fieldName)
    
    if (field.element.tagName.toLowerCase() === 'select') {
      await field.setValue(value)
    } else if (field.element.type === 'checkbox') {
      await field.setChecked(!!value)
    } else {
      await field.setValue(value)
    }
    
    await nextTick()
  }
}

/**
 * 验证表单错误
 */
export const expectFormErrors = (wrapper: VueWrapper<any>, expectedErrors: Record<string, string>): void => {
  for (const [fieldName, expectedError] of Object.entries(expectedErrors)) {
    const errorElement = wrapper.find(`[data-testid="${fieldName}-error"], .field-${fieldName} .error`)
    expect(errorElement.exists()).toBe(true)
    expect(errorElement.text()).toContain(expectedError)
  }
}

// === 性能测试工具 ===

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private startTime: number = 0
  private measurements: Map<string, number[]> = new Map()

  start(): void {
    this.startTime = performance.now()
  }

  measure(name: string): number {
    const duration = performance.now() - this.startTime
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, [])
    }
    this.measurements.get(name)!.push(duration)
    
    return duration
  }

  getStats(name: string) {
    const measures = this.measurements.get(name) || []
    if (measures.length === 0) return null

    const sorted = [...measures].sort((a, b) => a - b)
    return {
      count: measures.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: measures.reduce((a, b) => a + b, 0) / measures.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    }
  }

  expectPerformance(name: string, maxDuration: number): void {
    const stats = this.getStats(name)
    expect(stats).not.toBeNull()
    expect(stats!.avg).toBeLessThanOrEqual(maxDuration)
  }

  clear(): void {
    this.measurements.clear()
  }
}

// === 数据验证工具 ===

/**
 * 验证API响应结构
 */
export const expectValidApiResponse = (response: any, expectedKeys?: string[]): void => {
  expect(response).toHaveProperty('success')
  expect(response).toHaveProperty('message')
  expect(response).toHaveProperty('data')
  expect(response).toHaveProperty('timestamp')
  expect(response).toHaveProperty('request_id')

  if (expectedKeys) {
    expectedKeys.forEach(key => {
      expect(response.data).toHaveProperty(key)
    })
  }
}

/**
 * 验证分页响应结构
 */
export const expectValidPaginationResponse = (response: any): void => {
  expectValidApiResponse(response)
  expect(response.data).toHaveProperty('pagination')
  
  const pagination = response.data.pagination
  expect(pagination).toHaveProperty('page')
  expect(pagination).toHaveProperty('limit')
  expect(pagination).toHaveProperty('total')
  expect(pagination).toHaveProperty('pages')
  expect(pagination).toHaveProperty('has_next')
  expect(pagination).toHaveProperty('has_prev')
}

/**
 * 验证设备对象结构
 */
export const expectValidDevice = (device: any): void => {
  const requiredFields = [
    'id', 'serial', 'name', 'is_online', 'is_activate',
    'created_at', 'updated_at'
  ]
  
  requiredFields.forEach(field => {
    expect(device).toHaveProperty(field)
  })

  expect(typeof device.id).toBe('number')
  expect(typeof device.serial).toBe('string')
  expect(typeof device.name).toBe('string')
  expect(typeof device.is_online).toBe('boolean')
  expect(typeof device.is_activate).toBe('boolean')
}

// === 错误测试工具 ===

/**
 * 测试错误边界情况
 */
export const testErrorBoundary = async (
  errorTrigger: () => Promise<void> | void,
  expectedErrorPattern?: string | RegExp
): Promise<Error> => {
  let caughtError: Error | null = null

  try {
    await errorTrigger()
  } catch (error) {
    caughtError = error as Error
  }

  expect(caughtError).not.toBeNull()
  
  if (expectedErrorPattern) {
    if (typeof expectedErrorPattern === 'string') {
      expect(caughtError!.message).toContain(expectedErrorPattern)
    } else {
      expect(caughtError!.message).toMatch(expectedErrorPattern)
    }
  }

  return caughtError!
}

/**
 * 验证控制台错误
 */
export const expectConsoleError = (callback: () => void, expectedMessage?: string): void => {
  const originalError = console.error
  const mockError = vi.fn()
  console.error = mockError

  try {
    callback()
    expect(mockError).toHaveBeenCalled()
    
    if (expectedMessage) {
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining(expectedMessage))
    }
  } finally {
    console.error = originalError
  }
}

// === 网络测试工具 ===

/**
 * 模拟网络延迟
 */
export const simulateNetworkDelay = (min: number = 100, max: number = 500): number => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return delay
}

/**
 * 模拟网络错误
 */
export const createNetworkError = (type: 'timeout' | 'connection' | 'server' = 'connection'): Error => {
  const errors = {
    timeout: new Error('Network timeout'),
    connection: new Error('Network connection failed'),
    server: new Error('Server error')
  }
  
  const error = errors[type] as any
  error.code = type.toUpperCase()
  return error
}

// === 测试数据清理工具 ===

/**
 * 测试数据清理器
 */
export class TestDataCleaner {
  private cleanupTasks: Array<() => void> = []

  addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task)
  }

  addStorageCleanup(storageKey: string): void {
    this.addCleanupTask(() => {
      localStorage.removeItem(storageKey)
      sessionStorage.removeItem(storageKey)
    })
  }

  addMockCleanup(mockFn: any): void {
    this.addCleanupTask(() => {
      if (typeof mockFn.mockRestore === 'function') {
        mockFn.mockRestore()
      }
    })
  }

  cleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task()
      } catch (error) {
        console.warn('Cleanup task failed:', error)
      }
    })
    this.cleanupTasks = []
  }
}

// === 全局测试工具实例 ===

export const globalMockManager = new MockManager()
export const globalPerformanceMonitor = new PerformanceMonitor()
export const globalTestDataCleaner = new TestDataCleaner()

// === 常用测试模式 ===

/**
 * 创建标准的测试环境设置
 */
export const createTestEnvironment = () => {
  const mockManager = new MockManager()
  const performanceMonitor = new PerformanceMonitor()
  const dataCleaner = new TestDataCleaner()

  return {
    mockManager,
    performanceMonitor,
    dataCleaner,
    
    cleanup: () => {
      mockManager.clearAll()
      performanceMonitor.clear()
      dataCleaner.cleanup()
    }
  }
}

/**
 * 高阶函数：为测试添加通用的beforeEach和afterEach处理
 */
export const withTestEnvironment = (testSuite: (env: ReturnType<typeof createTestEnvironment>) => void) => {
  const env = createTestEnvironment()
  
  beforeEach(() => {
    // 每个测试前的通用设置
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    // 每个测试后的通用清理
    env.cleanup()
  })
  
  testSuite(env)
}