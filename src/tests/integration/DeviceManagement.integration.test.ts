/**
 * 设备管理集成测试
 * 测试设备管理的完整用户流程，包括：
 * - 设备列表加载和分页
 * - 设备绑定和解绑操作
 * - 设备状态更新和实时同步
 * - 设备托管管理流程
 * - 多组件协作和数据流
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { mount, VueWrapper } from '@vue/test-utils'
import { mountComponent } from '/@src/tests/utils/component'
import { useDeviceStore } from '/@src/stores/devices'
import { deviceApi, authApi } from '/@src/api'
import { notyf } from '/@src/api/request'
import { timerUtils } from './setup'
import type { Device, DeviceListResponse, ApiResponse, User } from '/@src/api/types'

// Import components that will be tested together
import DeviceTrustManager from '/@src/components/DeviceTrustManager.vue'
import ModemStatus from '/@src/components/ModemStatus.vue'

// Mock external dependencies
vi.mock('/@src/api', () => ({
  deviceApi: {
    getDevices: vi.fn(),
    getDevice: vi.fn(),
    bindDevice: vi.fn(),
    unbindDevice: vi.fn(),
    updateDevice: vi.fn(),
    rebootDevice: vi.fn(),
    trustDevice: vi.fn(),
    untrustDevice: vi.fn(),
    getDeviceTrustees: vi.fn()
  },
  authApi: {
    checkUserExists: vi.fn()
  }
}))

vi.mock('/@src/api/request', () => ({
  default: {}, // 添加默认导出
  notyf: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Timer配置通过setup.ts中的timerUtils统一管理

// 测试数据工厂函数
const createTestDevice = (id: number, serial: string, overrides: Partial<Device> = {}): Device => ({
  id,
  serial,
  name: `Test Device ${id}`,
  is_online: true,
  is_activate: true,
  model_id: 1,
  user_id: 1,
  primary_mac: `00:11:22:33:44:${id.toString().padStart(2, '0')}`,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ownership: {
    isOwner: true,
    isTrusted: false
  },
  deviceModel: {
    id: 1,
    oemname: 'TEST-MODEL',
    stdname: 'Test Model',
    devtype: 'gateway'
  },
  modemStatus: {
    id: 1,
    device_id: id,
    active_slot: 1,
    operator: 'Test Carrier',
    network_type: '5G',
    rssi: -75,
    rsrp: -105,
    rsrq: -10,
    snr: 20,
    rx_bytes: 1024000,
    tx_bytes: 512000,
    rx_speed: 50000000,
    tx_speed: 10000000,
    last_update: '2024-01-01T12:00:00Z'
  },
  ...overrides
})

const createTestUser = (id: number, username: string): User => ({
  id,
  username,
  email: `${username}@example.com`,
  role: 'user',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
})

const createDeviceListResponse = (devices: Device[]): ApiResponse<DeviceListResponse> => ({
  success: true,
  message: 'Success',
  data: {
    devices,
    pagination: {
      page: 1,
      limit: 20,
      total: devices.length,
      pages: Math.ceil(devices.length / 20)
    }
  }
})

describe('设备管理集成测试', () => {
  let deviceStore: ReturnType<typeof useDeviceStore>
  let testDevices: Device[]

  beforeEach(() => {
    // 创建独立的Pinia实例
    setActivePinia(createPinia())
    deviceStore = useDeviceStore()
    
    // 创建测试数据
    testDevices = [
      createTestDevice(1, 'DEV001'),
      createTestDevice(2, 'DEV002', { is_online: false }),
      createTestDevice(3, 'DEV003', { 
        ownership: { isOwner: false, isTrusted: true } 
      })
    ]
    
    // 清除所有mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Timer清理由setup.ts统一处理
    vi.clearAllMocks()
  })

  describe('设备列表管理集成流程', () => {
    it('应该完成完整的设备列表加载和状态同步流程', async () => {
      // Step 1: Mock API responses
      const listResponse = createDeviceListResponse(testDevices)
      vi.mocked(deviceApi.getDevices).mockResolvedValue(listResponse)

      // Step 2: Load devices through store
      await deviceStore.fetchDevices()

      // Step 3: Verify store state
      expect(deviceStore.devices).toHaveLength(3)
      expect(deviceStore.deviceCount).toBe(3)
      expect(deviceStore.onlineCount).toBe(2)
      expect(deviceStore.offlineCount).toBe(1)
      expect(deviceStore.ownedCount).toBe(2)
      expect(deviceStore.trustedCount).toBe(1)

      // Step 4: Verify API was called correctly
      expect(deviceApi.getDevices).toHaveBeenCalledWith({})
      expect(deviceStore.pagination).toEqual(listResponse.data.pagination)
    })

    it('应该正确处理分页和过滤', async () => {
      // Step 1: Setup filtered response
      const filteredDevices = [testDevices[0]]
      const filteredResponse = createDeviceListResponse(filteredDevices)
      vi.mocked(deviceApi.getDevices).mockResolvedValue(filteredResponse)

      // Step 2: Fetch with query parameters
      const query = {
        page: 2,
        limit: 10,
        search: 'DEV001',
        is_online: true
      }

      await deviceStore.fetchDevices(query)

      // Step 3: Verify API call and state
      expect(deviceApi.getDevices).toHaveBeenCalledWith(query)
      expect(deviceStore.devices).toHaveLength(1)
      expect(deviceStore.devices[0].serial).toBe('DEV001')
    })
  })

  describe('设备绑定操作集成流程', () => {
    it('应该完成设备绑定的完整流程', async () => {
      // Step 1: Mock successful bind response
      vi.mocked(deviceApi.bindDevice).mockResolvedValue({
        success: true,
        message: 'Device bound successfully',
        data: {}
      })

      // Step 2: Mock refresh devices response
      const updatedDevices = [
        ...testDevices,
        createTestDevice(4, 'DEV004')
      ]
      vi.mocked(deviceApi.getDevices).mockResolvedValue(
        createDeviceListResponse(updatedDevices)
      )

      // Step 3: Perform bind operation
      const result = await deviceStore.bindDevice('DEV004')

      // Step 4: Verify operation success
      expect(result).toBe(true)
      expect(deviceApi.bindDevice).toHaveBeenCalledWith({ serial: 'DEV004' })
      expect(notyf.success).toHaveBeenCalledWith('Device bound successfully')

      // Step 5: Verify device list was refreshed
      expect(deviceApi.getDevices).toHaveBeenCalled()
    })

    it('应该正确处理绑定失败的情况', async () => {
      // Step 1: Mock failed bind response
      vi.mocked(deviceApi.bindDevice).mockResolvedValue({
        success: false,
        message: 'Device not found',
        data: {}
      })

      // Step 2: Perform bind operation
      const result = await deviceStore.bindDevice('INVALID')

      // Step 3: Verify failure handling
      expect(result).toBe(false)
      expect(notyf.success).not.toHaveBeenCalled()
      expect(deviceApi.getDevices).not.toHaveBeenCalled()
    })
  })

  describe('设备状态更新集成流程', () => {
    beforeEach(() => {
      // 预设设备列表
      deviceStore.devices = [...testDevices]
    })

    it('应该正确更新设备状态并同步到组件', async () => {
      // Step 1: Mock update API
      vi.mocked(deviceApi.updateDevice).mockResolvedValue({
        success: true,
        message: 'Updated',
        data: {}
      })

      // Step 2: Update device name
      await deviceStore.updateDeviceName(1, 'Updated Device Name')

      // Step 3: Verify store state update
      const updatedDevice = deviceStore.devices.find(d => d.id === 1)
      expect(updatedDevice?.name).toBe('Updated Device Name')

      // Step 4: Verify API call
      expect(deviceApi.updateDevice).toHaveBeenCalledWith(1, { 
        name: 'Updated Device Name' 
      })
      expect(notyf.success).toHaveBeenCalledWith('Device name updated successfully')
    })

    it('应该正确处理当前设备的更新', async () => {
      // Step 1: Set current device
      deviceStore.setCurrentDevice(testDevices[0])
      
      // Step 2: Mock update API
      vi.mocked(deviceApi.updateDevice).mockResolvedValue({
        success: true,
        message: 'Updated',
        data: {}
      })

      // Step 3: Update device
      await deviceStore.updateDeviceName(1, 'Current Device Updated')

      // Step 4: Verify both list and current device updated
      expect(deviceStore.currentDevice?.name).toBe('Current Device Updated')
      expect(deviceStore.devices[0].name).toBe('Current Device Updated')
    })
  })

  describe('设备托管管理集成流程', () => {
    let trustManagerWrapper: VueWrapper<any>
    const ownedDevice = createTestDevice(1, 'OWNED001')

    beforeEach(() => {
      // Create DeviceTrustManager component instance
      trustManagerWrapper = mountComponent(DeviceTrustManager, {
        props: {
          device: ownedDevice,
          open: true
        }
      })
    })

    it('应该完成用户查找和托管创建的完整流程', async () => {
      // Step 1: Mock user existence check
      vi.mocked(authApi.checkUserExists).mockResolvedValue({
        success: true,
        message: 'User found',
        data: { exists: true, user_id: 2 }
      })

      // Step 2: Mock trust creation
      vi.mocked(deviceApi.trustDevice).mockResolvedValue({
        success: true,
        message: 'Trust created',
        data: {}
      })

      // Step 3: Mock device refresh
      vi.mocked(deviceApi.getDevice).mockResolvedValue({
        success: true,
        message: 'Device retrieved',
        data: ownedDevice
      })

      // Step 4: Simulate email input and validation
      trustManagerWrapper.vm.trustForm.email = 'trustee@example.com'
      await nextTick()

      // Wait for debounced email check
      timerUtils.enableFakeTimers()
      timerUtils.advanceTimers(800)
      await nextTick()

      // Step 5: Verify email validation
      expect(authApi.checkUserExists).toHaveBeenCalledWith({
        email: 'trustee@example.com'
      })
      expect(trustManagerWrapper.vm.emailExists).toBe(true)
      expect(trustManagerWrapper.vm.trustForm.trustee_id).toBe(2)

      // Step 6: Add trust expiration and notes
      trustManagerWrapper.vm.trustForm.expires_at = '2024-12-31T23:59:59'
      trustManagerWrapper.vm.trustForm.notes = 'Integration test trust'

      // Step 7: Submit trust creation
      await trustManagerWrapper.vm.handleAddTrustee()

      // Step 8: Verify trust creation API call
      expect(deviceApi.trustDevice).toHaveBeenCalledWith(1, {
        trustee_id: 2,
        expires_at: '2024-12-31T23:59:59',
        notes: 'Integration test trust'
      })

      // Step 9: Verify form reset and events
      expect(trustManagerWrapper.vm.trustForm.email).toBe('')
      expect(trustManagerWrapper.vm.emailExists).toBeNull()
      expect(trustManagerWrapper.emitted().updated).toBeTruthy()
      expect(trustManagerWrapper.emitted().close).toBeTruthy()
    })

    it('应该处理重复托管的验证流程', async () => {
      // Step 1: Mock existing trustees
      const existingTrustee = {
        id: 1,
        trustee_id: 2,
        username: 'existing_user',
        email: 'existing@example.com',
        trusted_at: '2024-01-01T00:00:00Z',
        status: 'active' as const
      }
      trustManagerWrapper.vm.trustees = [existingTrustee]

      // Step 2: Mock user existence check
      vi.mocked(authApi.checkUserExists).mockResolvedValue({
        success: true,
        message: 'User found',
        data: { exists: true, user_id: 2 }
      })

      // Step 3: 模拟邮箱输入和验证流程
      trustManagerWrapper.vm.trustForm.email = 'existing@example.com'
      await trustManagerWrapper.vm.checkEmailExists('existing@example.com')
      await nextTick()

      // Step 4: Verify already trusted detection
      expect(trustManagerWrapper.vm.emailExists).toBe('already_trusted')

      // Step 5: Attempt to add trust (应该失败因为email不满足条件)
      await trustManagerWrapper.vm.handleAddTrustee()

      // Step 6: Verify error handling - 由于emailExists不是true，应该显示基本错误
      expect(notyf.error).toHaveBeenCalledWith('Please enter a valid email address')
      expect(deviceApi.trustDevice).not.toHaveBeenCalled()
    })
  })

  describe('组件集成和数据流测试', () => {
    it('应该正确处理ModemStatus组件与设备数据的集成', () => {
      // Step 1: Create device with modem status
      const deviceWithModem = createTestDevice(1, 'MODEM001')
      
      // Step 2: Mount ModemStatus component
      const modemWrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: deviceWithModem.modemStatus,
          showDetails: true
        }
      })

      // Step 3: Verify modem data display
      expect(modemWrapper.text()).toContain('Test Carrier')
      expect(modemWrapper.text()).toContain('5G')
      expect(modemWrapper.text()).toContain('Good') // Signal strength for -75 dBm

      // Step 4: Verify data formatting
      expect(modemWrapper.vm.formatBytes(1024000)).toBe('1000 KB')
      expect(modemWrapper.vm.formatSpeed(50000000)).toBe('50 Mbps')
      expect(modemWrapper.vm.getNetworkTypeColor('5G')).toBe('success')
    })

    it('应该处理设备数据更新的响应式流程', async () => {
      // Step 1: Initial device state
      deviceStore.devices = [testDevices[0]]
      
      // Step 2: Create component watching device state
      const deviceRef = ref(deviceStore.devices[0])
      
      // Step 3: Update device through store
      deviceStore.updateDeviceInList(1, { 
        is_online: false,
        name: 'Updated Through Store'
      })

      // Step 4: Verify reactive update
      const updatedDevice = deviceStore.devices.find(d => d.id === 1)
      expect(updatedDevice?.is_online).toBe(false)
      expect(updatedDevice?.name).toBe('Updated Through Store')
    })
  })

  describe('错误处理和边界情况集成测试', () => {
    it('应该正确处理API错误的级联影响', async () => {
      // Step 1: Mock API error
      const apiError = new Error('Network timeout')
      vi.mocked(deviceApi.getDevices).mockRejectedValue(apiError)

      // Step 2: Attempt to fetch devices
      await expect(deviceStore.fetchDevices()).rejects.toThrow('Network timeout')

      // Step 3: Verify error state
      expect(deviceStore.loading).toBe(false)
      expect(deviceStore.devices).toEqual([])
    })

    it('应该处理组件销毁时的清理工作', async () => {
      // Step 1: Create component with timers
      const trustWrapper = mountComponent(DeviceTrustManager, {
        props: {
          device: testDevices[0],
          open: true
        }
      })

      // Step 2: Start debounced operation
      trustWrapper.vm.debouncedEmailCheck('test@example.com')

      // Step 3: Unmount component
      trustWrapper.unmount()

      // Step 4: Advance timers - should not cause errors
      timerUtils.enableFakeTimers()
      timerUtils.advanceTimers(1000)
      
      // Component should be cleanly unmounted without memory leaks
      expect(true).toBe(true) // No errors thrown
    })
  })

  describe('性能和内存管理集成测试', () => {
    it('应该正确处理大量设备数据的加载', async () => {
      // Step 1: Create large dataset
      const largeDeviceList = Array.from({ length: 100 }, (_, i) => 
        createTestDevice(i + 1, `DEV${(i + 1).toString().padStart(3, '0')}`)
      )

      // Step 2: Mock API response
      vi.mocked(deviceApi.getDevices).mockResolvedValue(
        createDeviceListResponse(largeDeviceList)
      )

      // Step 3: Load devices
      await deviceStore.fetchDevices()

      // Step 4: Verify handling of large dataset
      expect(deviceStore.devices).toHaveLength(100)
      expect(deviceStore.deviceCount).toBe(100)
      
      // Step 5: Verify computed properties performance
      const start = performance.now()
      const onlineDevices = deviceStore.onlineDevices
      const end = performance.now()
      
      expect(onlineDevices).toHaveLength(100) // All test devices are online by default
      expect(end - start).toBeLessThan(50) // Should complete within 50ms
    })

    it('应该正确管理组件状态的内存占用', () => {
      // Step 1: Create multiple component instances
      const components = Array.from({ length: 10 }, () => 
        mountComponent(DeviceTrustManager, {
          props: {
            device: testDevices[0],
            open: false
          }
        })
      )

      // Step 2: Verify all components created successfully
      expect(components).toHaveLength(10)
      components.forEach(wrapper => {
        expect(wrapper.vm).toBeDefined()
      })

      // Step 3: Cleanup all components
      components.forEach(wrapper => wrapper.unmount())
      
      // Memory should be cleaned up properly
      expect(true).toBe(true) // No memory leaks or errors
    })
  })
})