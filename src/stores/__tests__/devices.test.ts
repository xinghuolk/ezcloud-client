/**
 * Device Store 单元测试
 * 测试设备管理状态和操作的所有功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDeviceStore } from '../devices'
import { deviceApi } from '/@src/api'
import { notyf } from '/@src/api/request'
import type { Device, DeviceQuery, DeviceTrustParams } from '/@src/api/types'

// Mock dependencies
vi.mock('/@src/api', () => ({
  deviceApi: {
    getDevices: vi.fn(),
    getDevice: vi.fn(),
    bindDevice: vi.fn(),
    unbindDevice: vi.fn(),
    updateDevice: vi.fn(),
    rebootDevice: vi.fn(),
    switchSIM: vi.fn(),
    collectLogs: vi.fn(),
    batchOperation: vi.fn(),
    trustDevice: vi.fn(),
    untrustDevice: vi.fn(),
    getDeviceTrustees: vi.fn(),
    updateDeviceTrust: vi.fn()
  }
}))

vi.mock('/@src/api/request', () => ({
  notyf: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// 测试数据工厂函数，确保每次测试都使用新的对象实例
const createMockDevice = (): Device => ({
  id: 1,
  serial: 'TEST001',
  name: 'Test Device',
  is_online: true,
  is_activate: true,
  model_id: 1,
  user_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  ownership: {
    isOwner: true,
    isTrusted: false
  }
})

const createMockDevice2 = (): Device => ({
  id: 2,
  serial: 'TEST002',
  name: 'Test Device 2',
  is_online: false,
  is_activate: true,
  model_id: 1,
  user_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  ownership: {
    isOwner: false,
    isTrusted: true
  }
})

const createMockTrustedDevice = (): Device => ({
  id: 3,
  serial: 'TRUST001',
  name: 'Trusted Device',
  is_online: true,
  is_activate: false,
  model_id: 1,
  user_id: 2,
  created_at: '2024-01-01T00:00:00Z',
  ownership: {
    isOwner: false,
    isTrusted: true
  }
})

describe('Device Store', () => {
  let store: ReturnType<typeof useDeviceStore>

  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia())
    store = useDeviceStore()
    
    // 清除所有 mock 调用记录
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该正确初始化状态', () => {
      expect(store.devices).toEqual([])
      expect(store.currentDevice).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      })
    })
  })

  describe('计算属性 (Getters)', () => {
    let testDevice1: Device
    let testDevice2: Device 
    let testTrustedDevice: Device

    beforeEach(() => {
      // 为每个测试创建新的设备实例
      testDevice1 = createMockDevice()
      testDevice2 = createMockDevice2()
      testTrustedDevice = createMockTrustedDevice()
      
      // 设置测试数据
      store.devices = [testDevice1, testDevice2, testTrustedDevice]
    })

    it('应该正确计算设备总数', () => {
      expect(store.deviceCount).toBe(3)
    })

    it('应该正确筛选在线设备', () => {
      expect(store.onlineDevices).toHaveLength(2)
      expect(store.onlineDevices.map(d => d.id)).toEqual([testDevice1.id, testTrustedDevice.id])
      expect(store.onlineCount).toBe(2)
    })

    it('应该正确筛选离线设备', () => {
      expect(store.offlineDevices).toHaveLength(1)
      expect(store.offlineDevices[0].id).toBe(testDevice2.id)
      expect(store.offlineCount).toBe(1)
    })

    it('应该正确筛选已激活设备', () => {
      expect(store.activatedDevices).toHaveLength(2)
      expect(store.activatedDevices.map(d => d.id)).toEqual([testDevice1.id, testDevice2.id])
      expect(store.activatedCount).toBe(2)
    })

    it('应该正确筛选拥有的设备', () => {
      expect(store.ownedDevices).toHaveLength(1)
      expect(store.ownedDevices[0].id).toBe(testDevice1.id)
      expect(store.ownedCount).toBe(1)
    })

    it('应该正确筛选托管设备', () => {
      expect(store.trustedDevices).toHaveLength(2)
      expect(store.trustedDevices.map(d => d.id)).toEqual([testDevice2.id, testTrustedDevice.id])
      expect(store.trustedCount).toBe(2)
    })

    it('应该在空数据时返回正确的计算结果', () => {
      store.devices = []
      expect(store.deviceCount).toBe(0)
      expect(store.onlineCount).toBe(0)
      expect(store.offlineCount).toBe(0)
      expect(store.activatedCount).toBe(0)
      expect(store.ownedCount).toBe(0)
      expect(store.trustedCount).toBe(0)
    })
  })

  describe('Actions - 设备获取', () => {
    describe('fetchDevices', () => {
      it('应该成功获取设备列表', async () => {
        const testDevice = createMockDevice()
        const mockResponse = {
          success: true,
          data: {
            devices: [testDevice],
            pagination: { page: 1, limit: 20, total: 1, pages: 1 }
          }
        }
        vi.mocked(deviceApi.getDevices).mockResolvedValue(mockResponse)

        await store.fetchDevices()

        expect(store.loading).toBe(false)
        expect(store.devices).toHaveLength(1)
        expect(store.devices[0].id).toBe(testDevice.id)
        expect(store.pagination).toEqual(mockResponse.data.pagination)
        expect(deviceApi.getDevices).toHaveBeenCalledWith({})
      })

      it('应该传递查询参数', async () => {
        const query: DeviceQuery = { page: 2, limit: 10 }
        const mockResponse = {
          success: true,
          data: { devices: [], pagination: { page: 2, limit: 10, total: 0, pages: 0 } }
        }
        vi.mocked(deviceApi.getDevices).mockResolvedValue(mockResponse)

        await store.fetchDevices(query)

        expect(deviceApi.getDevices).toHaveBeenCalledWith(query)
      })

      it('应该处理API失败响应', async () => {
        const mockResponse = { success: false, message: 'Failed to fetch' }
        vi.mocked(deviceApi.getDevices).mockResolvedValue(mockResponse)

        await store.fetchDevices()

        expect(store.devices).toEqual([])
        expect(store.loading).toBe(false)
      })

      it('应该处理网络错误', async () => {
        const error = new Error('Network error')
        vi.mocked(deviceApi.getDevices).mockRejectedValue(error)

        await expect(store.fetchDevices()).rejects.toThrow('Network error')
        expect(store.loading).toBe(false)
      })

      it('应该正确设置loading状态', async () => {
        const mockResponse = {
          success: true,
          data: { devices: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }
        }
        vi.mocked(deviceApi.getDevices).mockImplementation(() => {
          expect(store.loading).toBe(true) // 确认请求期间loading为true
          return Promise.resolve(mockResponse)
        })

        await store.fetchDevices()
        expect(store.loading).toBe(false) // 请求完成后loading为false
      })
    })

    describe('fetchDeviceDetails', () => {
      it('应该成功获取设备详情', async () => {
        const testDevice = createMockDevice()
        const mockResponse = { success: true, data: testDevice }
        vi.mocked(deviceApi.getDevice).mockResolvedValue(mockResponse)

        const result = await store.fetchDeviceDetails(1)

        expect(result?.id).toBe(testDevice.id)
        expect(store.currentDevice?.id).toBe(testDevice.id)
        expect(deviceApi.getDevice).toHaveBeenCalledWith(1)
      })

      it('应该处理API失败响应', async () => {
        const mockResponse = { success: false, message: 'Device not found' }
        vi.mocked(deviceApi.getDevice).mockResolvedValue(mockResponse)

        const result = await store.fetchDeviceDetails(1)

        expect(result).toBeNull()
        expect(store.currentDevice).toBeNull()
      })

      it('应该处理网络错误', async () => {
        const error = new Error('Network error')
        vi.mocked(deviceApi.getDevice).mockRejectedValue(error)

        await expect(store.fetchDeviceDetails(1)).rejects.toThrow('Network error')
      })
    })

    describe('fetchDevicesWithTrusted', () => {
      it('应该调用fetchDevices并包含托管设备', async () => {
        const testDevice = createMockDevice()
        const query: DeviceQuery = { page: 1 }
        const mockResponse = {
          success: true,
          data: { devices: [testDevice], pagination: { page: 1, limit: 20, total: 1, pages: 1 } }
        }
        vi.mocked(deviceApi.getDevices).mockResolvedValue(mockResponse)

        await store.fetchDevicesWithTrusted(query)

        expect(deviceApi.getDevices).toHaveBeenCalledWith({ ...query, include_trusted: true })
      })
    })
  })

  describe('Actions - 设备操作', () => {
    describe('bindDevice', () => {
      it('应该成功绑定设备', async () => {
        const testDevice = createMockDevice()
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.bindDevice).mockResolvedValue(mockResponse)
        vi.mocked(deviceApi.getDevices).mockResolvedValue({
          success: true,
          data: { devices: [testDevice], pagination: { page: 1, limit: 20, total: 1, pages: 1 } }
        })

        const result = await store.bindDevice('TEST001')

        expect(result).toBe(true)
        expect(deviceApi.bindDevice).toHaveBeenCalledWith({ serial: 'TEST001' })
        expect(notyf.success).toHaveBeenCalledWith('Device bound successfully')
        expect(deviceApi.getDevices).toHaveBeenCalled() // 验证刷新列表
      })

      it('应该处理绑定失败', async () => {
        const mockResponse = { success: false, message: 'Device not found' }
        vi.mocked(deviceApi.bindDevice).mockResolvedValue(mockResponse)

        const result = await store.bindDevice('INVALID')

        expect(result).toBe(false)
        expect(notyf.success).not.toHaveBeenCalled()
      })

      it('应该处理网络错误', async () => {
        const error = new Error('Network error')
        vi.mocked(deviceApi.bindDevice).mockRejectedValue(error)

        await expect(store.bindDevice('TEST001')).rejects.toThrow('Network error')
      })
    })

    describe('unbindDevice', () => {
      it('应该成功解绑设备', async () => {
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.unbindDevice).mockResolvedValue(mockResponse)
        vi.mocked(deviceApi.getDevices).mockResolvedValue({
          success: true,
          data: { devices: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }
        })

        const result = await store.unbindDevice(1)

        expect(result).toBe(true)
        expect(deviceApi.unbindDevice).toHaveBeenCalledWith(1)
        expect(notyf.success).toHaveBeenCalledWith('Device unbound successfully')
        expect(deviceApi.getDevices).toHaveBeenCalled()
      })
    })

    describe('updateDeviceName', () => {
      let testDevice: Device

      beforeEach(() => {
        testDevice = createMockDevice()
        store.devices = [testDevice]
        store.currentDevice = testDevice
      })

      it('应该成功更新设备名称', async () => {
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.updateDevice).mockResolvedValue(mockResponse)

        const result = await store.updateDeviceName(1, 'New Name')

        expect(result).toBe(true)
        expect(deviceApi.updateDevice).toHaveBeenCalledWith(1, { name: 'New Name' })
        expect(notyf.success).toHaveBeenCalledWith('Device name updated successfully')
        expect(store.devices[0].name).toBe('New Name')
        expect(store.currentDevice!.name).toBe('New Name')
      })

      it('应该处理设备不存在的情况', async () => {
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.updateDevice).mockResolvedValue(mockResponse)

        const result = await store.updateDeviceName(999, 'New Name')

        expect(result).toBe(true)
        // 设备列表中的设备不会被更新，因为ID不匹配
        expect(store.devices[0].name).toBe('Test Device')
      })
    })

    describe('rebootDevice', () => {
      it('应该成功重启设备', async () => {
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.rebootDevice).mockResolvedValue(mockResponse)

        const result = await store.rebootDevice(1)

        expect(result).toBe(true)
        expect(deviceApi.rebootDevice).toHaveBeenCalledWith(1)
        expect(notyf.success).toHaveBeenCalledWith('Device reboot command sent successfully')
      })
    })

    describe('switchSIM', () => {
      it('应该成功切换SIM卡', async () => {
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.switchSIM).mockResolvedValue(mockResponse)

        const result = await store.switchSIM(1, 2)

        expect(result).toBe(true)
        expect(deviceApi.switchSIM).toHaveBeenCalledWith(1, 2)
        expect(notyf.success).toHaveBeenCalledWith('SIM switch to slot 2 command sent successfully')
      })
    })

    describe('collectLogs', () => {
      it('应该成功收集日志', async () => {
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.collectLogs).mockResolvedValue(mockResponse)

        const params = { types: ['system'], duration: 60 }
        const result = await store.collectLogs(1, params)

        expect(result).toBe(true)
        expect(deviceApi.collectLogs).toHaveBeenCalledWith(1, params)
        expect(notyf.success).toHaveBeenCalledWith('Log collection command sent successfully')
      })

      it('应该处理无参数的日志收集', async () => {
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.collectLogs).mockResolvedValue(mockResponse)

        const result = await store.collectLogs(1)

        expect(result).toBe(true)
        expect(deviceApi.collectLogs).toHaveBeenCalledWith(1, undefined)
      })
    })

    describe('batchOperation', () => {
      it('应该成功执行批量操作', async () => {
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.batchOperation).mockResolvedValue(mockResponse)

        const deviceIds = [1, 2, 3]
        const operation = 'reboot'
        const parameters = { force: true }

        const result = await store.batchOperation(deviceIds, operation, parameters)

        expect(result).toBe(true)
        expect(deviceApi.batchOperation).toHaveBeenCalledWith({
          device_ids: deviceIds,
          operation: { type: operation, params: parameters }
        })
        expect(notyf.success).toHaveBeenCalledWith('Batch reboot command sent successfully to 3 devices')
      })
    })
  })

  describe('Actions - 设备托管', () => {
    describe('trustDevice', () => {
      it('应该成功托管设备', async () => {
        const testDevice = createMockDevice()
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.trustDevice).mockResolvedValue(mockResponse)
        vi.mocked(deviceApi.getDevice).mockResolvedValue({ success: true, data: testDevice })

        const params: DeviceTrustParams = {
          trustee_id: 2,
          expires_at: '2024-12-31T23:59:59Z',
          notes: 'Test trust'
        }

        const result = await store.trustDevice(1, params)

        expect(result).toBe(true)
        expect(deviceApi.trustDevice).toHaveBeenCalledWith(1, params)
        expect(notyf.success).toHaveBeenCalledWith('Device trust granted successfully')
        expect(deviceApi.getDevice).toHaveBeenCalledWith(1)
      })
    })

    describe('untrustDevice', () => {
      it('应该成功取消托管', async () => {
        const testDevice = createMockDevice()
        const mockResponse = { success: true, data: {} }
        vi.mocked(deviceApi.untrustDevice).mockResolvedValue(mockResponse)
        vi.mocked(deviceApi.getDevice).mockResolvedValue({ success: true, data: testDevice })

        const result = await store.untrustDevice(1, 2)

        expect(result).toBe(true)
        expect(deviceApi.untrustDevice).toHaveBeenCalledWith(1, 2)
        expect(notyf.success).toHaveBeenCalledWith('Device trust revoked successfully')
        expect(deviceApi.getDevice).toHaveBeenCalledWith(1)
      })
    })

    describe('getDeviceTrustees', () => {
      it('应该成功获取设备托管列表', async () => {
        const mockTrustees = [
          { id: 1, trustee_id: 2, username: 'user2', status: 'active' }
        ]
        const mockResponse = { success: true, data: { trustees: mockTrustees } }
        vi.mocked(deviceApi.getDeviceTrustees).mockResolvedValue(mockResponse)

        const result = await store.getDeviceTrustees(1)

        expect(result).toEqual(mockTrustees)
        expect(deviceApi.getDeviceTrustees).toHaveBeenCalledWith(1)
      })

      it('应该处理获取失败', async () => {
        const mockResponse = { success: false, message: 'Failed' }
        vi.mocked(deviceApi.getDeviceTrustees).mockResolvedValue(mockResponse)

        const result = await store.getDeviceTrustees(1)

        expect(result).toEqual([])
      })
    })

    describe('updateDeviceTrust', () => {
      it('应该成功更新托管关系', async () => {
        const testDevice = createMockDevice()
        const mockResponse = { success: true, data: { id: 1 } }
        vi.mocked(deviceApi.updateDeviceTrust).mockResolvedValue(mockResponse)
        vi.mocked(deviceApi.getDevice).mockResolvedValue({ success: true, data: testDevice })

        const params = { expires_at: '2025-12-31T23:59:59Z' }
        const result = await store.updateDeviceTrust(1, 2, params)

        expect(result).toEqual({ id: 1 })
        expect(deviceApi.updateDeviceTrust).toHaveBeenCalledWith(1, 2, params)
        expect(notyf.success).toHaveBeenCalledWith('Device trust relationship updated successfully')
        expect(deviceApi.getDevice).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('辅助Actions', () => {
    describe('clearDevices', () => {
      it('应该清空所有设备数据', () => {
        // 先设置一些数据
        const testDevice = createMockDevice()
        store.devices = [testDevice]
        store.currentDevice = testDevice
        store.pagination = { page: 2, limit: 10, total: 10, pages: 1 }

        store.clearDevices()

        expect(store.devices).toEqual([])
        expect(store.currentDevice).toBeNull()
        expect(store.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        })
      })
    })

    describe('setCurrentDevice', () => {
      it('应该设置当前设备', () => {
        const testDevice = createMockDevice()
        store.setCurrentDevice(testDevice)
        expect(store.currentDevice?.id).toBe(testDevice.id)
      })

      it('应该允许设置为null', () => {
        const testDevice = createMockDevice()
        store.setCurrentDevice(testDevice)
        store.setCurrentDevice(null)
        expect(store.currentDevice).toBeNull()
      })
    })

    describe('updateDeviceInList', () => {
      let testDevice1: Device
      let testDevice2: Device

      beforeEach(() => {
        testDevice1 = createMockDevice()
        testDevice2 = createMockDevice2()
        store.devices = [testDevice1, testDevice2]
        store.currentDevice = testDevice1
      })

      it('应该更新设备列表中的设备', () => {
        const updates = { name: 'Updated Name', is_online: false }
        store.updateDeviceInList(1, updates)

        expect(store.devices[0].name).toBe('Updated Name')
        expect(store.devices[0].is_online).toBe(false)
        expect(store.devices[1].name).toBe('Test Device 2') // 其他设备不受影响
      })

      it('应该更新当前设备', () => {
        const updates = { name: 'Updated Current Device' }
        store.updateDeviceInList(1, updates)

        expect(store.currentDevice!.name).toBe('Updated Current Device')
      })

      it('应该处理设备不存在的情况', () => {
        const originalDeviceCount = store.devices.length
        store.updateDeviceInList(999, { name: 'Non-existent' })

        expect(store.devices).toHaveLength(originalDeviceCount)
      })

      it('应该处理部分更新', () => {
        const updates = { is_online: false } // 只更新部分字段
        store.updateDeviceInList(1, updates)

        expect(store.devices[0].is_online).toBe(false)
        expect(store.devices[0].name).toBe('Test Device') // 其他字段保持不变
      })
    })
  })

  describe('错误处理', () => {
    it('应该在所有异步操作中正确处理错误', async () => {
      const error = new Error('API Error')
      
      // 测试各个异步方法的错误处理
      const methods = [
        () => store.fetchDevices(),
        () => store.fetchDeviceDetails(1),
        () => store.bindDevice('TEST'),
        () => store.unbindDevice(1),
        () => store.updateDeviceName(1, 'Name'),
        () => store.rebootDevice(1),
        () => store.switchSIM(1, 1),
        () => store.collectLogs(1),
        () => store.batchOperation([1], 'reboot'),
        () => store.trustDevice(1, { trustee_id: 2 }),
        () => store.untrustDevice(1, 2),
        () => store.getDeviceTrustees(1),
        () => store.updateDeviceTrust(1, 2, {})
      ]

      // Mock所有API方法抛出错误
      Object.values(deviceApi).forEach(method => {
        vi.mocked(method).mockRejectedValue(error)
      })

      // 验证所有方法都正确抛出错误
      for (const method of methods) {
        await expect(method()).rejects.toThrow('API Error')
      }
    })
  })
})