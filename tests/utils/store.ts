/**
 * Pinia Store 测试工具
 * 提供Store测试的辅助函数和模拟
 */

import { createPinia, setActivePinia } from 'pinia'
import type { TestingPinia } from '@pinia/testing'

// 创建测试用的 Pinia 实例
export const createTestPinia = (): TestingPinia => {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia as TestingPinia
}

// Store 状态重置工具
export const resetStoreState = (store: any) => {
  if (store.$reset) {
    store.$reset()
  }
}

// Store 状态监听工具
export const watchStoreState = (store: any, property: string) => {
  const states: any[] = []
  
  store.$subscribe((mutation: any, state: any) => {
    if (mutation.events?.key === property) {
      states.push(state[property])
    }
  })
  
  return states
}

// Store Action 模拟工具
export const mockStoreAction = (store: any, actionName: string, returnValue?: any) => {
  const originalAction = store[actionName]
  store[actionName] = vi.fn().mockImplementation((...args) => {
    if (returnValue !== undefined) {
      return Promise.resolve(returnValue)
    }
    return originalAction.apply(store, args)
  })
  return store[actionName]
}

// Store Getter 测试工具
export const testStoreGetter = (store: any, getterName: string, expectedValue: any) => {
  expect(store[getterName]).toBe(expectedValue)
}

// 批量设置 Store 状态
export const setStoreState = (store: any, state: Record<string, any>) => {
  Object.keys(state).forEach(key => {
    store[key] = state[key]
  })
}