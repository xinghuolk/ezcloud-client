/**
 * Vitest 全局测试设置
 * 配置模拟、全局工具和测试环境
 */

import { vi } from 'vitest'
import type { ComponentMountingOptions } from '@vue/test-utils'
import { config } from '@vue/test-utils'

// 模拟 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

// 模拟 sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

// 全局模拟设置
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// 模拟 matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 模拟 ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 模拟 IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Vue Test Utils 全局配置
config.global.stubs = {
  // 存根常用的外部组件
  'iconify-icon': {
    template: '<span data-testid="iconify-icon"><slot /></span>'
  },
  'router-link': {
    template: '<a data-testid="router-link"><slot /></slot>'
  },
  'router-view': {
    template: '<div data-testid="router-view"><slot /></div>'
  }
}

// 全局测试工具类型声明
declare global {
  interface Window {
    localStorage: typeof localStorageMock
    sessionStorage: typeof sessionStorageMock
  }
}

// 导出类型定义
export type TestMountingOptions<T = any> = ComponentMountingOptions<T>