import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useDeviceManagement } from '../useDeviceManagement'
import type { Device, DeviceQuery } from '/@src/api/types'

// Setup mocks
vi.mock('/@src/stores/devices', () => ({
  useDeviceStore: vi.fn(() => ({
    devices: [],
    pagination: { page: 1, limit: 20, total: 0 },
    deviceCount: 0,
    onlineCount: 0,
    fetchDevices: vi.fn(),
    bindDevice: vi.fn(),
    unbindDevice: vi.fn(),
    batchOperation: vi.fn()
  }))
}))

vi.mock('/@src/stores/user-session', () => ({
  useUserSession: vi.fn(() => ({
    user: { id: 1, username: 'testuser' }
  }))
}))

vi.mock('/@src/api', () => ({
  deviceApi: {
    operateDevice: vi.fn(),
    trustDevice: vi.fn()
  }
}))

vi.mock('/@src/api/request', () => ({
  notyf: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('useDeviceManagement', () => {
  // Import the mocked modules  
  let mockDeviceStore: any
  let mockUserSession: any
  let mockDeviceApi: any
  let mockNotyf: any

  // Test data factories
  const createMockDevice = (overrides: Partial<Device> = {}): Device => ({
    id: 1,
    serial: 'TEST123456789',
    name: 'Test Device',
    model: 'TestModel',
    version: '1.0.0',
    is_online: true,
    is_activate: true,
    is_owner: true,
    is_trusted: false,
    last_seen: '2023-12-01T10:00:00Z',
    created_at: '2023-12-01T09:00:00Z',
    wanip: '192.168.1.100',
    public_ip: '203.0.113.1',
    primary_mac: 'AA:BB:CC:DD:EE:FF',
    ownership: {
      isOwner: true,
      isTrusted: false,
      ownerInfo: null
    },
    deviceModel: {
      id: 1,
      modelname: 'TestModel',
      oemname: 'TestOEM'
    },
    ...overrides
  })

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    
    // Get fresh references to mocked modules
    const { useDeviceStore } = await import('/@src/stores/devices')
    const { useUserSession } = await import('/@src/stores/user-session')
    const { deviceApi } = await import('/@src/api')
    const { notyf } = await import('/@src/api/request')
    
    mockDeviceStore = vi.mocked(useDeviceStore)()
    mockUserSession = vi.mocked(useUserSession)()
    mockDeviceApi = deviceApi
    mockNotyf = notyf
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { loading, devices, pagination, deviceCount, onlineCount } = useDeviceManagement()
      
      expect(loading.value).toBe(false)
      expect(devices.value).toEqual([])
      expect(pagination.value).toEqual({ page: 1, limit: 20, total: 0 })
      expect(deviceCount.value).toBe(0)
      expect(onlineCount.value).toBe(0)
    })

    it('should provide all expected methods', () => {
      const composable = useDeviceManagement()
      
      expect(typeof composable.fetchDevices).toBe('function')
      expect(typeof composable.bindDevice).toBe('function')
      expect(typeof composable.unbindDevice).toBe('function')
      expect(typeof composable.batchOperation).toBe('function')
      expect(typeof composable.rebootDevice).toBe('function')
      expect(typeof composable.trustDevice).toBe('function')
      expect(typeof composable.searchWithDebounce).toBe('function')
    })
  })

  describe('Computed Statistics', () => {
    it('should calculate ownedCount correctly', () => {
      const mockDevices = [
        createMockDevice({ id: 1, is_owner: true, is_trusted: false }),
        createMockDevice({ id: 2, is_owner: false, is_trusted: true }),
        createMockDevice({ id: 3, is_owner: true, is_trusted: false })
      ]
      
      mockDeviceStore.devices = mockDevices
      
      const { ownedCount } = useDeviceManagement()
      expect(ownedCount.value).toBe(2)
    })

    it('should calculate trustedCount correctly', () => {
      const mockDevices = [
        createMockDevice({ id: 1, is_owner: true, is_trusted: false }),
        createMockDevice({ id: 2, is_owner: false, is_trusted: true }),
        createMockDevice({ id: 3, is_owner: false, is_trusted: true })
      ]
      
      mockDeviceStore.devices = mockDevices
      
      const { trustedCount } = useDeviceManagement()
      expect(trustedCount.value).toBe(2)
    })

    it('should return 0 for counts when devices is null/undefined', () => {
      mockDeviceStore.devices = null
      
      const { ownedCount, trustedCount } = useDeviceManagement()
      expect(ownedCount.value).toBe(0)
      expect(trustedCount.value).toBe(0)
    })

    it('should update counts reactively when devices change', async () => {
      const { ownedCount, trustedCount } = useDeviceManagement()
      
      // Initially empty
      expect(ownedCount.value).toBe(0)
      expect(trustedCount.value).toBe(0)
      
      // Add devices
      mockDeviceStore.devices = [
        createMockDevice({ id: 1, is_owner: true, is_trusted: false }),
        createMockDevice({ id: 2, is_owner: false, is_trusted: true })
      ]
      
      await nextTick()
      
      expect(ownedCount.value).toBe(1)
      expect(trustedCount.value).toBe(1)
    })
  })

  describe('fetchDevices', () => {
    it('should fetch devices successfully', async () => {
      mockDeviceStore.fetchDevices.mockResolvedValue(undefined)
      
      const { fetchDevices, loading } = useDeviceManagement()
      
      const promise = fetchDevices()
      expect(loading.value).toBe(true)
      
      await promise
      
      expect(mockDeviceStore.fetchDevices).toHaveBeenCalledWith(undefined)
      expect(loading.value).toBe(false)
    })

    it('should fetch devices with query parameters', async () => {
      mockDeviceStore.fetchDevices.mockResolvedValue(undefined)
      
      const { fetchDevices } = useDeviceManagement()
      const query: DeviceQuery = { page: 2, limit: 50, search: 'test' }
      
      await fetchDevices(query)
      
      expect(mockDeviceStore.fetchDevices).toHaveBeenCalledWith(query)
    })

    it('should handle fetch error with notification', async () => {
      const error = new Error('Network error')
      mockDeviceStore.fetchDevices.mockRejectedValue(error)
      
      const { fetchDevices, loading } = useDeviceManagement()
      
      await expect(fetchDevices()).rejects.toThrow('Network error')
      
      expect(mockNotyf.error).toHaveBeenCalledWith('Failed to load devices')
      expect(loading.value).toBe(false)
    })

    it('should log errors to console', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Network error')
      mockDeviceStore.fetchDevices.mockRejectedValue(error)
      
      const { fetchDevices } = useDeviceManagement()
      
      try {
        await fetchDevices()
      } catch (e) {
        // Expected
      }
      
      expect(consoleError).toHaveBeenCalledWith('Failed to fetch devices:', error)
      consoleError.mockRestore()
    })
  })

  describe('bindDevice', () => {
    it('should bind device successfully', async () => {
      mockDeviceStore.bindDevice.mockResolvedValue(true)
      
      const { bindDevice } = useDeviceManagement()
      const result = await bindDevice('TEST123456')
      
      expect(result).toBe(true)
      expect(mockDeviceStore.bindDevice).toHaveBeenCalledWith('TEST123456')
      expect(mockNotyf.success).toHaveBeenCalledWith('Device bound successfully')
    })

    it('should handle bind device failure', async () => {
      mockDeviceStore.bindDevice.mockResolvedValue(false)
      
      const { bindDevice } = useDeviceManagement()
      const result = await bindDevice('TEST123456')
      
      expect(result).toBe(false)
      expect(mockNotyf.success).not.toHaveBeenCalled()
    })

    it('should handle bind device error with notification', async () => {
      const error = new Error('Bind error')
      mockDeviceStore.bindDevice.mockRejectedValue(error)
      
      const { bindDevice } = useDeviceManagement()
      const result = await bindDevice('TEST123456')
      
      expect(result).toBe(false)
      expect(mockNotyf.error).toHaveBeenCalledWith('Failed to bind device')
    })

    it('should log bind errors to console', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Bind error')
      mockDeviceStore.bindDevice.mockRejectedValue(error)
      
      const { bindDevice } = useDeviceManagement()
      await bindDevice('TEST123456')
      
      expect(consoleError).toHaveBeenCalledWith('Failed to bind device:', error)
      consoleError.mockRestore()
    })
  })

  describe('unbindDevice', () => {
    it('should unbind device successfully', async () => {
      mockDeviceStore.unbindDevice.mockResolvedValue(true)
      
      const { unbindDevice } = useDeviceManagement()
      const result = await unbindDevice(1)
      
      expect(result).toBe(true)
      expect(mockDeviceStore.unbindDevice).toHaveBeenCalledWith(1)
      expect(mockNotyf.success).toHaveBeenCalledWith('Device unbound successfully')
    })

    it('should handle unbind device failure', async () => {
      mockDeviceStore.unbindDevice.mockResolvedValue(false)
      
      const { unbindDevice } = useDeviceManagement()
      const result = await unbindDevice(1)
      
      expect(result).toBe(false)
      expect(mockNotyf.success).not.toHaveBeenCalled()
    })

    it('should handle unbind device error with notification', async () => {
      const error = new Error('Unbind error')
      mockDeviceStore.unbindDevice.mockRejectedValue(error)
      
      const { unbindDevice } = useDeviceManagement()
      const result = await unbindDevice(1)
      
      expect(result).toBe(false)
      expect(mockNotyf.error).toHaveBeenCalledWith('Failed to unbind device')
    })

    it('should log unbind errors to console', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Unbind error')
      mockDeviceStore.unbindDevice.mockRejectedValue(error)
      
      const { unbindDevice } = useDeviceManagement()
      await unbindDevice(1)
      
      expect(consoleError).toHaveBeenCalledWith('Failed to unbind device:', error)
      consoleError.mockRestore()
    })
  })

  describe('batchOperation', () => {
    it('should perform batch operation successfully', async () => {
      mockDeviceStore.batchOperation.mockResolvedValue(undefined)
      
      const { batchOperation } = useDeviceManagement()
      const result = await batchOperation([1, 2, 3], 'reboot')
      
      expect(result).toBe(true)
      expect(mockDeviceStore.batchOperation).toHaveBeenCalledWith([1, 2, 3], 'reboot', undefined)
      expect(mockNotyf.success).toHaveBeenCalledWith('Batch operation completed successfully')
    })

    it('should perform batch operation with parameters', async () => {
      mockDeviceStore.batchOperation.mockResolvedValue(undefined)
      
      const { batchOperation } = useDeviceManagement()
      const params = { timeout: 30 }
      const result = await batchOperation([1, 2], 'update', params)
      
      expect(result).toBe(true)
      expect(mockDeviceStore.batchOperation).toHaveBeenCalledWith([1, 2], 'update', params)
    })

    it('should handle batch operation error with notification', async () => {
      const error = new Error('Batch error')
      mockDeviceStore.batchOperation.mockRejectedValue(error)
      
      const { batchOperation } = useDeviceManagement()
      const result = await batchOperation([1, 2], 'reboot')
      
      expect(result).toBe(false)
      expect(mockNotyf.error).toHaveBeenCalledWith('Failed to perform batch operation')
    })

    it('should log batch operation errors to console', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Batch error')
      mockDeviceStore.batchOperation.mockRejectedValue(error)
      
      const { batchOperation } = useDeviceManagement()
      await batchOperation([1, 2], 'reboot')
      
      expect(consoleError).toHaveBeenCalledWith('Failed to perform batch operation:', error)
      consoleError.mockRestore()
    })
  })

  describe('rebootDevice', () => {
    it('should reboot device successfully', async () => {
      mockDeviceApi.operateDevice.mockResolvedValue({ success: true })
      
      const { rebootDevice } = useDeviceManagement()
      const result = await rebootDevice(1)
      
      expect(result).toBe(true)
      expect(mockDeviceApi.operateDevice).toHaveBeenCalledWith(1, 'restart')
      expect(mockNotyf.success).toHaveBeenCalledWith('Reboot command sent successfully')
    })

    it('should handle reboot device failure', async () => {
      mockDeviceApi.operateDevice.mockResolvedValue({ success: false })
      
      const { rebootDevice } = useDeviceManagement()
      const result = await rebootDevice(1)
      
      expect(result).toBe(false)
      expect(mockNotyf.success).not.toHaveBeenCalled()
    })

    it('should handle reboot device error with notification', async () => {
      const error = new Error('Reboot error')
      mockDeviceApi.operateDevice.mockRejectedValue(error)
      
      const { rebootDevice } = useDeviceManagement()
      const result = await rebootDevice(1)
      
      expect(result).toBe(false)
      expect(mockNotyf.error).toHaveBeenCalledWith('Failed to reboot device')
    })

    it('should log reboot errors to console', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Reboot error')
      mockDeviceApi.operateDevice.mockRejectedValue(error)
      
      const { rebootDevice } = useDeviceManagement()
      await rebootDevice(1)
      
      expect(consoleError).toHaveBeenCalledWith('Failed to reboot device:', error)
      consoleError.mockRestore()
    })
  })

  describe('trustDevice', () => {
    it('should trust device successfully', async () => {
      mockDeviceApi.trustDevice.mockResolvedValue({ success: true })
      mockDeviceStore.fetchDevices.mockResolvedValue(undefined)
      
      const { trustDevice } = useDeviceManagement()
      const result = await trustDevice(1, true)
      
      expect(result).toBe(true)
      expect(mockDeviceApi.trustDevice).toHaveBeenCalledWith(1, true)
      expect(mockNotyf.success).toHaveBeenCalledWith('Device trusted successfully')
      expect(mockDeviceStore.fetchDevices).toHaveBeenCalled()
    })

    it('should untrust device successfully', async () => {
      mockDeviceApi.trustDevice.mockResolvedValue({ success: true })
      mockDeviceStore.fetchDevices.mockResolvedValue(undefined)
      
      const { trustDevice } = useDeviceManagement()
      const result = await trustDevice(1, false)
      
      expect(result).toBe(true)
      expect(mockDeviceApi.trustDevice).toHaveBeenCalledWith(1, false)
      expect(mockNotyf.success).toHaveBeenCalledWith('Device untrusted successfully')
      expect(mockDeviceStore.fetchDevices).toHaveBeenCalled()
    })

    it('should handle trust device failure', async () => {
      mockDeviceApi.trustDevice.mockResolvedValue({ success: false })
      
      const { trustDevice } = useDeviceManagement()
      const result = await trustDevice(1, true)
      
      expect(result).toBe(false)
      expect(mockNotyf.success).not.toHaveBeenCalled()
      expect(mockDeviceStore.fetchDevices).not.toHaveBeenCalled()
    })

    it('should handle trust device error with notification', async () => {
      const error = new Error('Trust error')
      mockDeviceApi.trustDevice.mockRejectedValue(error)
      
      const { trustDevice } = useDeviceManagement()
      const result = await trustDevice(1, true)
      
      expect(result).toBe(false)
      expect(mockNotyf.error).toHaveBeenCalledWith('Failed to update device trust')
    })

    it('should log trust errors to console', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Trust error')
      mockDeviceApi.trustDevice.mockRejectedValue(error)
      
      const { trustDevice } = useDeviceManagement()
      await trustDevice(1, true)
      
      expect(consoleError).toHaveBeenCalledWith('Failed to update device trust:', error)
      consoleError.mockRestore()
    })
  })

  describe('searchWithDebounce', () => {
    it('should execute callback after debounce delay', async () => {
      const { searchWithDebounce } = useDeviceManagement()
      const callback = vi.fn()
      const query: DeviceQuery = { search: 'test' }
      
      searchWithDebounce(query, callback)
      
      // Should not execute immediately
      expect(callback).not.toHaveBeenCalled()
      
      // Fast forward 500ms
      vi.advanceTimersByTime(500)
      
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should clear previous timeout when called multiple times', async () => {
      const { searchWithDebounce } = useDeviceManagement()
      const callback = vi.fn()
      const query: DeviceQuery = { search: 'test' }
      
      // Call multiple times rapidly
      searchWithDebounce(query, callback)
      searchWithDebounce(query, callback)
      searchWithDebounce(query, callback)
      
      // Fast forward 300ms (not enough to trigger)
      vi.advanceTimersByTime(300)
      expect(callback).not.toHaveBeenCalled()
      
      // Fast forward another 200ms (total 500ms from last call)
      vi.advanceTimersByTime(200)
      
      // Should only execute once (last call)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple debounced searches independently', async () => {
      const { searchWithDebounce } = useDeviceManagement()
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const query: DeviceQuery = { search: 'test' }
      
      searchWithDebounce(query, callback1)
      
      // Fast forward 250ms
      vi.advanceTimersByTime(250)
      
      searchWithDebounce(query, callback2)
      
      // Fast forward another 250ms (total 500ms from first, 250ms from second)
      vi.advanceTimersByTime(250)
      
      expect(callback1).not.toHaveBeenCalled() // Should be cleared
      expect(callback2).not.toHaveBeenCalled() // Not yet time
      
      // Fast forward another 250ms (total 500ms from second call)
      vi.advanceTimersByTime(250)
      
      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('should work with different query parameters', async () => {
      const { searchWithDebounce } = useDeviceManagement()
      const callback = vi.fn()
      
      const query1: DeviceQuery = { search: 'test1', page: 1 }
      const query2: DeviceQuery = { search: 'test2', page: 2 }
      
      searchWithDebounce(query1, () => callback('query1'))
      searchWithDebounce(query2, () => callback('query2'))
      
      vi.advanceTimersByTime(500)
      
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith('query2')
    })
  })

  describe('State Management', () => {
    it('should reflect store state changes', async () => {
      const { devices, pagination, deviceCount, onlineCount } = useDeviceManagement()
      
      // Update mock store state
      mockDeviceStore.devices = [createMockDevice()]
      mockDeviceStore.pagination = { page: 2, limit: 10, total: 25 }
      mockDeviceStore.deviceCount = 25
      mockDeviceStore.onlineCount = 20
      
      await nextTick()
      
      expect(devices.value).toHaveLength(1)
      expect(pagination.value.page).toBe(2)
      expect(deviceCount.value).toBe(25)
      expect(onlineCount.value).toBe(20)
    })
  })

  describe('Error Handling', () => {
    it('should handle all methods gracefully on error', async () => {
      const error = new Error('Test error')
      
      // Mock all methods to throw errors
      mockDeviceStore.fetchDevices.mockRejectedValue(error)
      mockDeviceStore.bindDevice.mockRejectedValue(error)
      mockDeviceStore.unbindDevice.mockRejectedValue(error)
      mockDeviceStore.batchOperation.mockRejectedValue(error)
      mockDeviceApi.operateDevice.mockRejectedValue(error)
      mockDeviceApi.trustDevice.mockRejectedValue(error)
      
      const composable = useDeviceManagement()
      
      // All methods should handle errors gracefully
      await expect(() => composable.fetchDevices()).rejects.toThrow()
      expect(await composable.bindDevice('TEST')).toBe(false)
      expect(await composable.unbindDevice(1)).toBe(false)
      expect(await composable.batchOperation([1], 'test')).toBe(false)
      expect(await composable.rebootDevice(1)).toBe(false)
      expect(await composable.trustDevice(1, true)).toBe(false)
      
      // All should show error notifications
      expect(mockNotyf.error).toHaveBeenCalledTimes(6)
    })
  })
})