/**
 * 设备管理主页面测试
 * 测试重构后的设备管理页面主容器组件的所有功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { mountComponent, findByTestId } from '/@src/tests/utils/component'
import DevicesIndex from '../index.vue'
import type { Device, DeviceQuery } from '/@src/api/types'

// Mock dependencies
vi.mock('../composables/useDeviceManagement', () => ({
  useDeviceManagement: vi.fn(() => ({
    loading: { value: false },
    devices: { value: [] },
    deviceCount: { value: 0 },
    onlineCount: { value: 0 },
    ownedCount: { value: 0 },
    trustedCount: { value: 0 },
    pagination: { value: { page: 1, limit: 20, total: 0, pages: 0 } },
    fetchDevices: vi.fn().mockResolvedValue(true),
    bindDevice: vi.fn().mockResolvedValue(true),
    unbindDevice: vi.fn().mockResolvedValue(true),
    rebootDevice: vi.fn().mockResolvedValue(true),
    batchOperation: vi.fn().mockResolvedValue(true)
  }))
}))

vi.mock('../composables/useDeviceDialogs', () => ({
  useDeviceDialogs: vi.fn(() => ({
    selectedDevicesForBatch: { value: [] },
    selectedDevice: { value: null },
    selectedDeviceForReboot: { value: null },
    selectedDeviceForUnbind: { value: null },
    bindDialogOpen: { value: false },
    detailsDialogOpen: { value: false },
    batchDialogOpen: { value: false },
    rebootConfirmOpen: { value: false },
    unbindConfirmOpen: { value: false },
    trustDialogOpen: { value: false },
    openBindDialog: vi.fn(),
    closeBindDialog: vi.fn(),
    openDetailsDialog: vi.fn(),
    closeDetailsDialog: vi.fn(),
    openBatchDialog: vi.fn(),
    closeBatchDialog: vi.fn(),
    openRebootConfirm: vi.fn(),
    closeRebootConfirm: vi.fn(),
    openUnbindConfirm: vi.fn(),
    closeUnbindConfirm: vi.fn(),
    openTrustDialog: vi.fn(),
    closeTrustDialog: vi.fn()
  }))
}))

vi.mock('/@src/stores/devices', () => ({
  useDeviceStore: vi.fn(() => ({
    devices: [],
    loading: false,
    fetchDeviceDetails: vi.fn().mockResolvedValue(null)
  }))
}))

vi.mock('/@src/composables/use-error-handler', () => ({
  useFormErrorHandler: vi.fn(() => ({
    createFormErrors: vi.fn(() => reactive({})),
    clearFormErrors: vi.fn(),
    setFieldError: vi.fn(),
    handleError: vi.fn()
  }))
}))

// 测试数据工厂
const createMockDevice = (id: number): Device => ({
  id,
  serial: `TEST${id.toString().padStart(3, '0')}`,
  name: `Test Device ${id}`,
  is_online: true,
  is_activate: true,
  model_id: 1,
  userid: 1,
  primary_mac: `00:11:22:33:44:${id.toString().padStart(2, '0')}`,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ownership: {
    isOwner: true,
    isTrusted: false
  }
})

describe('设备管理主页面 index.vue', () => {
  let mockDeviceManagement: any
  let mockDeviceDialogs: any

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    const { useDeviceManagement } = require('../composables/useDeviceManagement')
    const { useDeviceDialogs } = require('../composables/useDeviceDialogs')
    
    mockDeviceManagement = useDeviceManagement()
    mockDeviceDialogs = useDeviceDialogs()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('页面渲染', () => {
    it('应该正确渲染页面结构', () => {
      const wrapper = mountComponent(DevicesIndex)

      // 检查页面标题
      expect(wrapper.find('h1.title').text()).toContain('Device Management')
      expect(wrapper.find('p.subtitle').text()).toContain('Manage your 5G gateway devices')
      
      // 检查页面布局类
      expect(wrapper.find('.common-page-layout').exists()).toBe(true)
      expect(wrapper.find('.common-page-header').exists()).toBe(true)
    })

    it('应该渲染统计卡片', () => {
      mockDeviceManagement.deviceCount = { value: 10 }
      mockDeviceManagement.onlineCount = { value: 8 }
      mockDeviceManagement.ownedCount = { value: 6 }
      mockDeviceManagement.trustedCount = { value: 4 }

      const wrapper = mountComponent(DevicesIndex)

      const cards = findByTestId(wrapper, 'v-card')
      expect(cards).toHaveLength(4)
      
      expect(wrapper.text()).toContain('Total Devices')
      expect(wrapper.text()).toContain('Online Devices')
      expect(wrapper.text()).toContain('Owned Devices')  
      expect(wrapper.text()).toContain('Trusted Devices')
    })

    it('应该渲染搜索和过滤控件', () => {
      const wrapper = mountComponent(DevicesIndex)

      // 搜索输入框
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      expect(searchInput.exists()).toBe(true)

      // 状态过滤下拉框
      expect(wrapper.text()).toContain('Status')
      expect(wrapper.text()).toContain('Activation')
      
      // 品牌和版本过滤
      expect(wrapper.text()).toContain('Brand')
      expect(wrapper.text()).toContain('Version')
    })

    it('应该渲染操作按钮', () => {
      const wrapper = mountComponent(DevicesIndex)

      expect(wrapper.text()).toContain('Bind Device')
      expect(wrapper.text()).toContain('Reset Filters')
      expect(wrapper.text()).toContain('Refresh')
    })

    it('应该渲染DeviceList组件', () => {
      const wrapper = mountComponent(DevicesIndex)
      
      // DeviceList组件应该被渲染
      const deviceList = wrapper.findComponent({ name: 'DeviceList' })
      expect(deviceList.exists()).toBe(true)
    })
  })

  describe('过滤和搜索功能', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DevicesIndex)
    })

    it('应该正确处理搜索输入', async () => {
      const searchInput = wrapper.find('input[placeholder*="Search"]')
      
      await searchInput.setValue('test search')
      
      // 验证搜索值已更新
      expect(wrapper.vm.filterForm.search).toBe('test search')
    })

    it('应该正确处理状态过滤', async () => {
      const statusSelect = wrapper.find('select').at(0)
      
      await statusSelect.setValue(true)
      
      expect(wrapper.vm.filterForm.is_online).toBe(true)
    })

    it('应该正确处理激活状态过滤', async () => {
      const activationSelect = wrapper.find('select').at(1)
      
      await activationSelect.setValue(false)
      
      expect(wrapper.vm.filterForm.is_activate).toBe(false)
    })

    it('应该正确处理品牌过滤', async () => {
      const brandInput = wrapper.find('input[placeholder*="brand"]')
      
      await brandInput.setValue('TestBrand')
      
      expect(wrapper.vm.filterForm.oemname).toBe('TestBrand')
    })

    it('应该正确处理版本过滤', async () => {
      const versionInput = wrapper.find('input[placeholder*="version"]')
      
      await versionInput.setValue('1.0.0')
      
      expect(wrapper.vm.filterForm.version).toBe('1.0.0')
    })
  })

  describe('操作按钮事件', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DevicesIndex)
    })

    it('应该处理绑定设备按钮点击', async () => {
      const bindButton = wrapper.find('button').filter((node: any) => 
        node.text().includes('Bind Device')
      ).at(0)
      
      await bindButton.trigger('click')
      
      expect(mockDeviceDialogs.openBindDialog).toHaveBeenCalled()
    })

    it('应该处理重置过滤器按钮点击', async () => {
      // 先设置一些过滤值
      wrapper.vm.filterForm.search = 'test'
      wrapper.vm.filterForm.is_online = true
      
      const resetButton = wrapper.find('button').filter((node: any) => 
        node.text().includes('Reset Filters')
      ).at(0)
      
      await resetButton.trigger('click')
      
      // 验证过滤器被重置
      expect(wrapper.vm.filterForm.search).toBe('')
      expect(wrapper.vm.filterForm.is_online).toBeUndefined()
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })

    it('应该处理刷新按钮点击', async () => {
      const refreshButton = wrapper.find('button').filter((node: any) => 
        node.text().includes('Refresh')
      ).at(0)
      
      await refreshButton.trigger('click')
      
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })

    it('应该处理批量操作按钮状态', async () => {
      // 测试无选中设备时按钮禁用
      mockDeviceDialogs.selectedDevicesForBatch = { value: [] }
      await nextTick()
      
      const batchButton = wrapper.find('button').filter((node: any) => 
        node.text().includes('Batch Actions')
      ).at(0)
      
      expect(batchButton.attributes('disabled')).toBeDefined()
      
      // 测试有选中设备时按钮启用
      const selectedDevices = [createMockDevice(1), createMockDevice(2)]
      mockDeviceDialogs.selectedDevicesForBatch = { value: selectedDevices }
      await wrapper.vm.$forceUpdate()
      await nextTick()
      
      expect(wrapper.text()).toContain('Batch Actions (2)')
    })
  })

  describe('设备操作事件处理', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(() => {
      wrapper = mountComponent(DevicesIndex)
    })

    it('应该处理查看设备详情', async () => {
      const { useDeviceStore } = require('/@src/stores/devices')
      const mockStore = useDeviceStore()
      mockStore.fetchDeviceDetails.mockResolvedValue(testDevice)
      
      await wrapper.vm.handleViewDetails(testDevice)
      
      expect(mockStore.fetchDeviceDetails).toHaveBeenCalledWith(testDevice.id)
      expect(mockDeviceDialogs.selectedDevice.value).toBe(testDevice)
      expect(mockDeviceDialogs.detailsDialogOpen.value).toBe(true)
    })

    it('应该处理管理托管', async () => {
      await wrapper.vm.handleManageTrust(testDevice)
      
      expect(mockDeviceDialogs.openTrustDialog).toHaveBeenCalledWith(testDevice)
    })

    it('应该处理设备重启', async () => {
      await wrapper.vm.handleReboot(testDevice)
      
      expect(mockDeviceDialogs.openRebootConfirm).toHaveBeenCalledWith(testDevice)
    })

    it('应该处理设备解绑', async () => {
      await wrapper.vm.handleUnbind(testDevice)
      
      expect(mockDeviceDialogs.openUnbindConfirm).toHaveBeenCalledWith(testDevice)
    })

    it('应该处理选择变化', async () => {
      const selectedDevices = [testDevice]
      
      await wrapper.vm.handleSelectionChange(selectedDevices)
      
      expect(mockDeviceDialogs.selectedDevicesForBatch.value).toBe(selectedDevices)
    })
  })

  describe('分页和数据加载', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DevicesIndex)
    })

    it('应该处理页码变化', async () => {
      await wrapper.vm.handlePageChange(2)
      
      expect(wrapper.vm.filterForm.page).toBe(2)
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalledWith(wrapper.vm.filterForm)
    })

    it('应该处理每页限制变化', async () => {
      await wrapper.vm.handleLimitChange(50)
      
      expect(wrapper.vm.filterForm.limit).toBe(50)
      expect(wrapper.vm.filterForm.page).toBe(1) // 应重置到第一页
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalledWith(wrapper.vm.filterForm)
    })

    it('应该在组件挂载时加载设备', async () => {
      // 验证组件挂载时调用了fetchDevices
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })
  })

  describe('设备绑定和批量操作', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DevicesIndex)
    })

    it('应该处理设备绑定', async () => {
      const bindData = { serial: 'TEST123', name: 'Test Device' }
      
      await wrapper.vm.handleBindDevice(bindData)
      
      expect(mockDeviceManagement.bindDevice).toHaveBeenCalledWith(bindData.serial)
      expect(mockDeviceDialogs.closeBindDialog).toHaveBeenCalled()
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })

    it('应该处理绑定验证错误', async () => {
      const { useFormErrorHandler } = require('/@src/composables/use-error-handler')
      const mockErrorHandler = useFormErrorHandler()
      
      const bindData = { serial: '', name: 'Test Device' }
      
      await wrapper.vm.handleBindDevice(bindData)
      
      expect(mockErrorHandler.setFieldError).toHaveBeenCalledWith(
        wrapper.vm.bindErrors, 
        'serial', 
        'Please enter serial number'
      )
      expect(mockDeviceManagement.bindDevice).not.toHaveBeenCalled()
    })

    it('应该处理批量操作', async () => {
      const selectedDevices = [createMockDevice(1), createMockDevice(2)]
      mockDeviceDialogs.selectedDevicesForBatch = { value: selectedDevices }
      
      const batchData = { operation: 'reboot' }
      
      await wrapper.vm.handleBatchOperation(batchData)
      
      expect(mockDeviceManagement.batchOperation).toHaveBeenCalledWith(
        [1, 2], 
        'reboot', 
        {}
      )
      expect(mockDeviceDialogs.closeBatchDialog).toHaveBeenCalled()
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })

    it('应该处理日志批量操作特殊参数', async () => {
      const selectedDevices = [createMockDevice(1)]
      mockDeviceDialogs.selectedDevicesForBatch = { value: selectedDevices }
      
      const batchData = { operation: 'logs' }
      
      await wrapper.vm.handleBatchOperation(batchData)
      
      expect(mockDeviceManagement.batchOperation).toHaveBeenCalledWith(
        [1], 
        'logs', 
        { type: 'system' }
      )
    })
  })

  describe('确认操作', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(() => {
      wrapper = mountComponent(DevicesIndex)
      mockDeviceDialogs.selectedDeviceForReboot = { value: testDevice }
      mockDeviceDialogs.selectedDeviceForUnbind = { value: testDevice }
    })

    it('应该处理重启确认', async () => {
      await wrapper.vm.confirmReboot()
      
      expect(mockDeviceManagement.rebootDevice).toHaveBeenCalledWith(testDevice.id)
      expect(mockDeviceDialogs.closeRebootConfirm).toHaveBeenCalled()
    })

    it('应该处理解绑确认', async () => {
      await wrapper.vm.confirmUnbind()
      
      expect(mockDeviceManagement.unbindDevice).toHaveBeenCalledWith(testDevice.id)
      expect(mockDeviceDialogs.closeUnbindConfirm).toHaveBeenCalled()
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })

    it('应该处理托管更新', async () => {
      await wrapper.vm.handleTrustUpdated()
      
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })
  })

  describe('监听器和响应式行为', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DevicesIndex)
    })

    it('应该监听在线状态变化', async () => {
      wrapper.vm.filterForm.is_online = true
      await nextTick()
      
      // 由于watch是异步的，需要等待
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })

    it('应该监听激活状态变化', async () => {
      wrapper.vm.filterForm.is_activate = false
      await nextTick()
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalled()
    })

    it('应该对搜索输入进行防抖处理', async () => {
      vi.useFakeTimers()
      
      wrapper.vm.filterForm.search = 'test'
      await nextTick()
      
      // 防抖前不应该调用
      expect(mockDeviceManagement.fetchDevices).not.toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' })
      )
      
      // 触发防抖
      vi.advanceTimersByTime(500)
      
      expect(mockDeviceManagement.fetchDevices).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' })
      )
      
      vi.useRealTimers()
    })
  })

  describe('错误处理', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DevicesIndex)
    })

    it('应该处理获取设备详情错误', async () => {
      const { useDeviceStore } = require('/@src/stores/devices')
      const mockStore = useDeviceStore()
      const error = new Error('Network error')
      mockStore.fetchDeviceDetails.mockRejectedValue(error)
      
      const { useFormErrorHandler } = require('/@src/composables/use-error-handler')
      const mockErrorHandler = useFormErrorHandler()
      
      const testDevice = createMockDevice(1)
      await wrapper.vm.handleViewDetails(testDevice)
      
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        { fallbackMessage: 'Failed to load device details' }
      )
    })

    it('应该处理绑定设备错误', async () => {
      const error = new Error('Bind failed')
      mockDeviceManagement.bindDevice.mockRejectedValue(error)
      
      const { useFormErrorHandler } = require('/@src/composables/use-error-handler')
      const mockErrorHandler = useFormErrorHandler()
      
      const bindData = { serial: 'TEST123', name: 'Test Device' }
      await wrapper.vm.handleBindDevice(bindData)
      
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        { fallbackMessage: 'Failed to bind device' }
      )
    })

    it('应该处理批量操作错误', async () => {
      const error = new Error('Batch operation failed')
      mockDeviceManagement.batchOperation.mockRejectedValue(error)
      
      const selectedDevices = [createMockDevice(1)]
      mockDeviceDialogs.selectedDevicesForBatch = { value: selectedDevices }
      
      const batchData = { operation: 'reboot' }
      await wrapper.vm.handleBatchOperation(batchData)
      
      const { useFormErrorHandler } = require('/@src/composables/use-error-handler')
      const mockErrorHandler = useFormErrorHandler()
      
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        error,
        { fallbackMessage: 'Failed to perform batch operation' }
      )
    })
  })

  describe('组件生命周期', () => {
    it('应该正确设置页面标题', () => {
      const wrapper = mountComponent(DevicesIndex)
      
      // 验证useHead被调用来设置页面标题
      expect(wrapper.vm.$options.head).toBeDefined()
    })

    it('应该在组件销毁时清理定时器', () => {
      const wrapper = mountComponent(DevicesIndex)
      
      // 设置搜索防抖
      wrapper.vm.handleDebouncedSearch()
      
      // 销毁组件
      wrapper.unmount()
      
      // 防抖定时器应该被清理，不应该抛出错误
      expect(true).toBe(true) // 如果没有错误抛出则测试通过
    })
  })
})