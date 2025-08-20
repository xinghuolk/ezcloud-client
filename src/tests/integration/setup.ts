/**
 * 集成测试设置文件
 * 为集成测试提供额外的配置和模拟设置
 */

import { vi } from 'vitest'

// 集成测试专用的全局配置
globalThis.IS_INTEGRATION_TEST = true

// 模拟axios的默认配置
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    defaults: {
      headers: {
        common: {},
        delete: {},
        get: {},
        head: {},
        post: {},
        put: {},
        patch: {}
      },
      timeout: 5000,
      baseURL: 'http://localhost:3000'
    },
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn()
      },
      response: {
        use: vi.fn(),
        eject: vi.fn()
      }
    }
  }
  
  return {
    default: mockAxios,
    ...mockAxios
  }
})

// 模拟WebSocket连接（集成测试中通常不需要真实的WebSocket）
global.WebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1, // OPEN
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
})) as any

// 模拟performance API（更详细的性能测试）
// 使用configurable: true 来避免只读属性冲突
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  },
  configurable: true,
  writable: true
})

// 模拟console.time和console.timeEnd（用于性能测试）
const originalConsole = global.console
global.console = {
  ...originalConsole,
  time: vi.fn(),
  timeEnd: vi.fn(),
  timeLog: vi.fn()
}

// 扩展期望匹配器（用于集成测试的特定断言）
expect.extend({
  toBeValidApiResponse(received, expectedShape) {
    const pass = (
      typeof received === 'object' &&
      received !== null &&
      typeof received.success === 'boolean' &&
      typeof received.message === 'string' &&
      'data' in received
    )

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid API response`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid API response with shape { success: boolean, message: string, data: any }`,
        pass: false
      }
    }
  },

  toHaveBeenCalledWithApiEndpoint(received, endpoint) {
    const calls = received.mock.calls
    const pass = calls.some(call => {
      const url = call[0]
      return typeof url === 'string' && url.includes(endpoint)
    })

    if (pass) {
      return {
        message: () => `expected function not to have been called with endpoint "${endpoint}"`,
        pass: true
      }
    } else {
      return {
        message: () => `expected function to have been called with endpoint "${endpoint}", but it was called with: ${calls.map(call => call[0]).join(', ')}`,
        pass: false
      }
    }
  },

  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      }
    }
  }
})

// 类型声明扩展
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeValidApiResponse(expectedShape?: any): void
      toHaveBeenCalledWithApiEndpoint(endpoint: string): void
      toBeWithinRange(floor: number, ceiling: number): void
    }
  }
  
  var IS_INTEGRATION_TEST: boolean
}

// 集成测试的通用工具函数
export const integrationTestUtils = {
  /**
   * 等待指定时间
   */
  async waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  /**
   * 创建模拟的API响应延迟
   */
  createApiDelay(min = 100, max = 500): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },

  /**
   * 验证API调用序列
   */
  verifyApiCallSequence(mockFn: any, expectedSequence: string[]): boolean {
    const calls = mockFn.mock.calls
    if (calls.length !== expectedSequence.length) return false
    
    return expectedSequence.every((endpoint, index) => {
      const call = calls[index]
      return call && call[0] && call[0].includes(endpoint)
    })
  },

  /**
   * 生成测试用的UUID
   */
  generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * 模拟网络延迟
   */
  simulateNetworkDelay(): Promise<void> {
    const delay = this.createApiDelay(50, 200)
    return this.waitFor(delay)
  }
}

// Timer管理 - 提供全局timer控制但不强制设置
// 每个测试可以根据需要选择使用fake timers或real timers
const timerState = { isFakeTimersEnabled: false }

// 导出timer工具函数供测试使用
export const timerUtils = {
  enableFakeTimers: () => {
    if (!timerState.isFakeTimersEnabled) {
      vi.useFakeTimers()
      timerState.isFakeTimersEnabled = true
    }
  },
  
  disableFakeTimers: () => {
    if (timerState.isFakeTimersEnabled) {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
      timerState.isFakeTimersEnabled = false
    }
  },
  
  advanceTimers: (ms: number) => {
    if (timerState.isFakeTimersEnabled) {
      vi.advanceTimersByTime(ms)
    }
  },
  
  isFakeTimersEnabled: () => timerState.isFakeTimersEnabled
}

// 在每个测试后确保timer状态清理
afterEach(() => {
  timerUtils.disableFakeTimers()
})

// 全局错误处理器（用于捕获未处理的错误）
const originalError = console.error
console.error = (...args) => {
  // 在集成测试中，我们可能想要记录所有错误
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning:')) {
    // 忽略Vue的警告（测试环境中可能产生）
    return
  }
  originalError.apply(console, args)
}