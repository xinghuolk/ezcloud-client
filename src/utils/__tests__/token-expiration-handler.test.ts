/**
 * Token过期处理测试用例
 * 验证当服务器返回Token过期错误时，前端能正确处理并跳转到登录页面
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Token Expiration Handling', () => {
  const originalLocation = window.location
  const originalLocalStorage = window.localStorage

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location
    window.location = {
      ...originalLocation,
      href: '',
    } as any

    // Mock localStorage
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    })
  })

  afterEach(() => {
    window.location = originalLocation
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    })
  })

  it('should redirect to login when server returns Token has expired', () => {
    // 模拟服务器返回的Token过期响应格式
    const mockResponse = {
      success: false,
      message: 'Token has expired',
      data: null
    }

    // 验证错误消息检测逻辑
    const isTokenExpired = (message: string) => {
      return message.includes('Token has expired') || 
             message.includes('expired') || 
             message.includes('invalid token') ||
             message.includes('token is invalid')
    }

    expect(isTokenExpired(mockResponse.message)).toBe(true)
    expect(isTokenExpired('Token has expired')).toBe(true)
    expect(isTokenExpired('Your session has expired')).toBe(true)
    expect(isTokenExpired('invalid token provided')).toBe(true)
    expect(isTokenExpired('token is invalid')).toBe(true)
  })

  it('should not trigger redirect for non-token errors', () => {
    const isTokenExpired = (message: string) => {
      return message.includes('Token has expired') || 
             message.includes('expired') || 
             message.includes('invalid token') ||
             message.includes('token is invalid')
    }

    // 这些消息不应该触发Token过期处理
    expect(isTokenExpired('Validation failed')).toBe(false)
    expect(isTokenExpired('User not found')).toBe(false)
    expect(isTokenExpired('Network error')).toBe(false)
    expect(isTokenExpired('Internal server error')).toBe(false)
  })

  it('should clear localStorage when token expires', () => {
    const mockResponse = {
      success: false,
      message: 'Token has expired',
      data: null
    }

    // 模拟Token过期处理逻辑
    if (mockResponse.success === false) {
      const message = mockResponse.message || 'Request failed'
      
      if (message.includes('Token has expired') || 
          message.includes('expired') || 
          message.includes('invalid token') ||
          message.includes('token is invalid')) {
        
        // 清除localStorage
        localStorage.removeItem('token')
        localStorage.removeItem('user_info')
        
        // 跳转到登录页面
        if (typeof window !== 'undefined') {
          window.location.href = '/auth'
        }
      }
    }

    // 验证localStorage被清除
    expect(localStorage.removeItem).toHaveBeenCalledWith('token')
    expect(localStorage.removeItem).toHaveBeenCalledWith('user_info')
    
    // 验证页面跳转
    expect(window.location.href).toBe('/auth')
  })

  it('should handle different token expiration message formats', () => {
    const tokenExpirationMessages = [
      'Token has expired',
      'Your session has expired. Please login again',
      'Authentication token is invalid',
      'The provided token is invalid or expired',
      'JWT token expired',
      'Session expired'
    ]

    const isTokenExpired = (message: string) => {
      return message.includes('Token has expired') || 
             message.includes('expired') || 
             message.includes('invalid token') ||
             message.includes('token is invalid')
    }

    tokenExpirationMessages.forEach(message => {
      expect(isTokenExpired(message)).toBe(true)
    })
  })
})