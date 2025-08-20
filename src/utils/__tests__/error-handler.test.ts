/**
 * Error Handler 工具函数单元测试
 * 测试统一的错误处理架构
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeError,
  extractErrorMessage,
  extractFormError,
  isNetworkError,
  isAuthError,
  isRecaptchaError,
  isRateLimitError,
  getSuggestedAction,
  ErrorType,
  ErrorSeverity
} from '../error-handler'

describe('Error Handler', () => {
  describe('analyzeError', () => {
    it('应该正确分析401认证错误', () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' }
        }
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.AUTHENTICATION)
      expect(analysis.severity).toBe(ErrorSeverity.HIGH)
      expect(analysis.statusCode).toBe(401)
      expect(analysis.userMessage).toBe('Invalid credentials')
      expect(analysis.requiresAuth).toBe(false) // 登录页面不需要跳转
    })

    it('应该正确分析401 token过期错误', () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Token expired' }
        }
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.AUTHENTICATION)
      expect(analysis.requiresAuth).toBe(true) // 需要重新登录
      expect(analysis.userMessage).toBe('Token expired') // 使用服务器返回的具体消息
      expect(analysis.suggestedAction).toBe('redirect_to_login')
    })

    it('应该正确分析403权限错误', () => {
      const mockError = {
        response: {
          status: 403,
          data: { message: 'Access denied' }
        }
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.AUTHORIZATION)
      expect(analysis.severity).toBe(ErrorSeverity.HIGH)
      expect(analysis.userMessage).toBe('Access denied')
    })

    it('应该正确分析400验证错误', () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'password must contain uppercase letters' }
        }
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.VALIDATION)
      expect(analysis.severity).toBe(ErrorSeverity.MEDIUM)
      expect(analysis.formField).toBe('password')
      expect(analysis.userMessage).toBe('password must contain uppercase letters')
    })

    it('应该正确分析reCAPTCHA错误', () => {
      const mockError = {
        response: {
          status: 423,
          data: { message: 'reCAPTCHA verification required' }
        }
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.RECAPTCHA)
      expect(analysis.requiresRecaptcha).toBe(true)
      expect(analysis.userMessage).toBe('reCAPTCHA verification required')
    })

    it('应该正确分析429限流错误', () => {
      const mockError = {
        response: {
          status: 429,
          data: { 
            message: 'Too many requests',
            retryAfter: 60
          }
        }
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.RATE_LIMIT)
      expect(analysis.shouldRetry).toBe(true)
      expect(analysis.userMessage).toBe('Too many requests')
    })

    it('应该正确分析网络错误', () => {
      const mockError = {
        request: {}, // 有request但没有response表示网络错误
        message: 'Network Error'
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.NETWORK)
      expect(analysis.severity).toBe(ErrorSeverity.HIGH)
      expect(analysis.shouldRetry).toBe(true)
      expect(analysis.userMessage).toContain('Network error')
    })

    it('应该正确分析超时错误', () => {
      const mockError = {
        request: {},
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.NETWORK)
      expect(analysis.userMessage).toContain('timed out')
    })

    it('应该正确分析500服务器错误', () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      }

      const analysis = analyzeError(mockError)

      expect(analysis.type).toBe(ErrorType.SERVER)
      expect(analysis.severity).toBe(ErrorSeverity.HIGH)
      expect(analysis.shouldRetry).toBe(true)
      expect(analysis.userMessage).toBe('Internal server error')
    })
  })

  describe('extractErrorMessage', () => {
    it('应该提取用户友好的错误消息', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Email is required' }
        }
      }

      const message = extractErrorMessage(error)
      expect(message).toBe('Email is required')
    })

    it('应该使用默认消息处理未知错误', () => {
      const error = {}
      const message = extractErrorMessage(error, 'Custom fallback')
      expect(message).toBe('An unexpected error occurred')
    })

    it('应该处理字符串类型的错误', () => {
      const error = 'Simple error message'
      const message = extractErrorMessage(error)
      expect(message).toBe('Simple error message')
    })
  })

  describe('extractFormError', () => {
    it('应该提取表单字段特定错误', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid email format' }
        }
      }

      const formError = extractFormError(error)
      expect(formError.message).toBe('Invalid email format')
      expect(formError.suggestedField).toBe('email')
    })

    it('应该为密码错误返回正确的字段', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'password too weak' }
        }
      }

      const formError = extractFormError(error)
      expect(formError.suggestedField).toBe('password')
    })
  })

  describe('错误类型判断函数', () => {
    it('isNetworkError 应该正确识别网络错误', () => {
      const networkError = {
        request: {},
        message: 'Network Error'
      }

      expect(isNetworkError(networkError)).toBe(true)
      
      const serverError = {
        response: { status: 500 }
      }
      expect(isNetworkError(serverError)).toBe(false)
    })

    it('isAuthError 应该正确识别认证错误', () => {
      const authError = {
        response: { status: 401 }
      }

      expect(isAuthError(authError)).toBe(true)
      
      const validationError = {
        response: { status: 400 }
      }
      expect(isAuthError(validationError)).toBe(false)
    })

    it('isRecaptchaError 应该正确识别reCAPTCHA错误', () => {
      const recaptchaError = {
        response: {
          status: 423,
          data: { message: 'reCAPTCHA required' }
        }
      }

      expect(isRecaptchaError(recaptchaError)).toBe(true)
    })

    it('isRateLimitError 应该正确识别限流错误', () => {
      const rateLimitError = {
        response: { status: 429 }
      }

      expect(isRateLimitError(rateLimitError)).toBe(true)
    })
  })

  describe('getSuggestedAction', () => {
    it('应该为认证错误返回登录建议', () => {
      const authError = {
        response: {
          status: 403,
          data: { message: 'Token expired' }
        }
      }

      const action = getSuggestedAction(authError)
      expect(action).toBe('redirect_to_login')
    })

    it('应该为其他错误返回null', () => {
      const validationError = {
        response: { status: 400 }
      }

      const action = getSuggestedAction(validationError)
      expect(action).toBeNull()
    })
  })

  describe('边缘情况', () => {
    it('应该处理空对象错误', () => {
      const analysis = analyzeError({})
      expect(analysis.type).toBe(ErrorType.UNKNOWN)
      expect(analysis.userMessage).toBe('An unexpected error occurred')
    })

    it('应该处理null错误时抛出异常', () => {
      expect(() => analyzeError(null)).toThrow('Cannot read properties of null')
    })

    it('应该处理undefined错误时抛出异常', () => {
      expect(() => analyzeError(undefined)).toThrow('Cannot read properties of undefined')
    })

    it('应该处理复杂的API响应格式', () => {
      const error = {
        success: false,
        message: 'API specific error format'
      }

      const message = extractErrorMessage(error)
      expect(message).toBe('API specific error format')
    })
  })
})