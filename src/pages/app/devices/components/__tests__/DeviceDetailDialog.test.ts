/**
 * DeviceDetailDialog.vue 组件单元测试
 * 测试设备详情对话框组件的所有功能，包括：
 * - 模态框显示和关闭
 * - 标签页切换和数据加载
 * - 基本信息显示
 * - WiFi状态数据展示
 * - Modem状态数据展示
 * - 异步数据加载和错误处理
 * - 工具函数和数据转换
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { mountComponent, findByTestId } from '/@src/tests/utils/component'
import DeviceDetailDialog from '../DeviceDetailDialog.vue'
import type { Device } from '/@src/api/types'

// Mock dependencies
vi.mock('/@src/api', () => ({
  deviceApi: {
    getDeviceWiFiStatus: vi.fn(),
    getDeviceModemStatus: vi.fn()
  }
}))

vi.mock('/@src/utils/date-formatter', () => ({
  formatDateTime: vi.fn((date) => `Formatted: ${date}`)
}))

// 测试数据工厂
const createMockDevice = (id: number, overrides: Partial<Device> = {}): Device => ({
  id,
  serial: `DEV${id.toString().padStart(3, '0')}`,
  name: `Test Device ${id}`,
  is_online: true,
  is_activate: true,
  model_id: 1,
  userid: 1,
  primary_mac: `00:11:22:33:44:${id.toString().padStart(2, '0')}`,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  version: '2.1.0',
  wanip: `192.168.1.${id}`,
  public_ip: `203.0.113.${id}`,
  last_seen: '2024-01-01T12:00:00Z',
  firsttime: '2024-01-01T08:00:00Z',
  deviceModel: {
    id: 1,
    oemname: 'TestBrand',
    stdname: 'Test Model',
    devtype: 'gateway'
  },
  ...overrides
})

const createMockWiFiData = () => ({
  ap_enabled: true,
  radios: [
    {
      name: 'radio_2.4G',
      band: '2.4G',
      enabled: true,
      channel: 6,
      txpower: 20,
      connected_clients: 5,
      ssids: [
        {
          ssid: 'TestNetwork_2G',
          ssid_index: 0,
          enabled: true,
          encryption: 'WPA2-PSK',
          status: 'up',
          connected_clients: 3
        },
        {
          ssid: 'TestGuest_2G',
          ssid_index: 1,
          enabled: true,
          encryption: 'Open',
          status: 'up',
          connected_clients: 2
        }
      ]
    },
    {
      name: 'radio_5G',
      band: '5G',
      enabled: true,
      channel: 36,
      txpower: 25,
      connected_clients: 8,
      ssids: [
        {
          ssid: 'TestNetwork_5G',
          ssid_index: 0,
          enabled: true,
          encryption: 'WPA3-SAE',
          status: 'up',
          connected_clients: 8
        }
      ]
    }
  ]
})

const createMockModemData = () => ({
  sim_status: 'ready',
  active_sim: 1,
  iccid: '89860012345678901234',
  imsi: '460001234567890',
  phone_number: '+8613812345678',
  operator: 'CHINA MOBILE',
  network_type: '5G-NR',
  status: 'Connected',
  rssi: -75,
  rsrp: -105,
  rsrq: -10,
  snr: 20,
  ip_address: '10.0.0.100',
  data_uploaded: 1048576,
  data_downloaded: 5242880,
  connection_time: 3600,
  last_updated: '2024-01-01T12:00:00Z',
  imei: '123456789012345',
  apn_name: 'cmnet'
})

describe('DeviceDetailDialog.vue', () => {
  let pinia: ReturnType<typeof createPinia>
  let mockDeviceApi: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    
    const { deviceApi } = require('/@src/api')
    mockDeviceApi = deviceApi
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('组件渲染和基本功能', () => {
    it('应该在open为true时显示模态框', () => {
      const device = createMockDevice(1)
      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device
        }
      })

      const modal = wrapper.findComponent({ name: 'VModal' })
      expect(modal.exists()).toBe(true)
      expect(modal.props('open')).toBe(true)
      expect(modal.props('title')).toBe('Device Details')
      expect(modal.props('size')).toBe('large')
    })

    it('应该在open为false时不显示模态框内容', () => {
      const device = createMockDevice(1)
      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: false,
          device
        }
      })

      const modal = wrapper.findComponent({ name: 'VModal' })
      expect(modal.props('open')).toBe(false)
    })

    it('应该正确处理没有设备数据的情况', () => {
      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: null
        }
      })

      const modal = wrapper.findComponent({ name: 'VModal' })
      expect(modal.exists()).toBe(true)
      
      // 没有设备时不应该显示标签页
      const tabs = wrapper.findComponent({ name: 'VTabs' })
      expect(tabs.exists()).toBe(false)
    })

    it('应该发射close事件', async () => {
      const device = createMockDevice(1)
      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device
        }
      })

      const modal = wrapper.findComponent({ name: 'VModal' })
      await modal.vm.$emit('close')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('标签页功能', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(() => {
      wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: testDevice
        }
      })
    })

    it('应该渲染三个标签页', () => {
      const tabs = wrapper.findComponent({ name: 'VTabs' })
      expect(tabs.exists()).toBe(true)
      
      const tabsProps = tabs.props('tabs')
      expect(tabsProps).toHaveLength(3)
      expect(tabsProps[0].label).toBe('Basic Info')
      expect(tabsProps[1].label).toBe('WiFi Status')
      expect(tabsProps[2].label).toBe('Modem Status')
    })

    it('应该默认选中基本信息标签', () => {
      const tabs = wrapper.findComponent({ name: 'VTabs' })
      expect(tabs.props('selected')).toBe('basic')
      expect(wrapper.vm.activeTab).toBe('basic')
    })

    it('应该处理标签切换', async () => {
      const tabs = wrapper.findComponent({ name: 'VTabs' })
      
      await tabs.vm.$emit('update:selected', 'wifi')
      
      expect(wrapper.vm.activeTab).toBe('wifi')
    })

    it('应该在切换到WiFi标签时加载数据', async () => {
      mockDeviceApi.getDeviceWiFiStatus.mockResolvedValue({
        success: true,
        data: createMockWiFiData()
      })

      wrapper.vm.activeTab = 'wifi'
      await nextTick()

      expect(mockDeviceApi.getDeviceWiFiStatus).toHaveBeenCalledWith(testDevice.id)
    })

    it('应该在切换到Modem标签时加载数据', async () => {
      mockDeviceApi.getDeviceModemStatus.mockResolvedValue({
        success: true,
        data: createMockModemData()
      })

      wrapper.vm.activeTab = 'modem'
      await nextTick()

      expect(mockDeviceApi.getDeviceModemStatus).toHaveBeenCalledWith(testDevice.id)
    })
  })

  describe('基本信息显示', () => {
    it('应该正确显示设备基本信息', () => {
      const device = createMockDevice(1, {
        name: 'Custom Device Name',
        version: '3.0.1',
        wanip: '192.168.100.50',
        public_ip: '203.0.113.100'
      })

      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device
        }
      })

      const text = wrapper.text()
      expect(text).toContain('DEV001')
      expect(text).toContain('Custom Device Name')
      expect(text).toContain('TestBrand')
      expect(text).toContain('00:11:22:33:44:01')
      expect(text).toContain('192.168.100.50')
      expect(text).toContain('203.0.113.100')
      expect(text).toContain('3.0.1')
    })

    it('应该处理缺失的设备信息', () => {
      const device = createMockDevice(1, {
        name: undefined,
        version: undefined,
        wanip: undefined,
        public_ip: undefined,
        deviceModel: undefined,
        firsttime: undefined,
        last_seen: undefined
      })

      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device
        }
      })

      const text = wrapper.text()
      expect(text).toContain('Unnamed Device')
      expect(text).toContain('Unknown')
      expect(text).toContain('Not Available')
      expect(text).toContain('Never')
    })

    it('应该正确显示设备状态标签', () => {
      const activeDevice = createMockDevice(1, {
        is_online: true,
        is_activate: true
      })

      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: activeDevice
        }
      })

      expect(wrapper.text()).toContain('Active')
      
      const statusTag = wrapper.findComponent({ name: 'VTag' })
      expect(statusTag.exists()).toBe(true)
    })

    it('应该正确显示日期时间组件', () => {
      const device = createMockDevice(1)
      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device
        }
      })

      const dateTimeComponents = wrapper.findAllComponents({ name: 'VDateTimeSplit' })
      expect(dateTimeComponents.length).toBeGreaterThan(0)
    })
  })

  describe('WiFi状态显示', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(async () => {
      mockDeviceApi.getDeviceWiFiStatus.mockResolvedValue({
        success: true,
        data: createMockWiFiData()
      })

      wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: testDevice
        }
      })

      // 切换到WiFi标签并等待数据加载
      wrapper.vm.activeTab = 'wifi'
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('应该显示WiFi概览信息', async () => {
      // 等待数据加载完成
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$forceUpdate()

      expect(wrapper.vm.wifiData).toBeTruthy()
      expect(wrapper.text()).toContain('WiFi Access Point Status')
      expect(wrapper.text()).toContain('AP Enabled')
    })

    it('应该显示WiFi统计信息', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$forceUpdate()

      const text = wrapper.text()
      expect(text).toContain('Total Radios')
      expect(text).toContain('Active Radios')
      expect(text).toContain('Connected Clients')
      expect(text).toContain('Supported Bands')
    })

    it('应该显示无线电配置详情', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$forceUpdate()

      const text = wrapper.text()
      expect(text).toContain('2.4G Radio')
      expect(text).toContain('5G Radio')
      expect(text).toContain('Channel')
      expect(text).toContain('TX Power')
    })

    it('应该显示SSID信息', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$forceUpdate()

      const text = wrapper.text()
      expect(text).toContain('TestNetwork_2G')
      expect(text).toContain('TestGuest_2G')
      expect(text).toContain('TestNetwork_5G')
      expect(text).toContain('WPA2-PSK')
      expect(text).toContain('WPA3-SAE')
    })

    it('应该显示加载状态', () => {
      wrapper.vm.loadingWifi = true
      wrapper.vm.$forceUpdate()

      const loader = wrapper.findComponent({ name: 'VLoader' })
      expect(loader.exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading WiFi status...')
    })

    it('应该处理WiFi数据加载错误', async () => {
      mockDeviceApi.getDeviceWiFiStatus.mockRejectedValue(new Error('Network error'))
      
      wrapper.vm.activeTab = 'wifi'
      await nextTick()
      
      // 等待错误处理
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(wrapper.vm.wifiData).toBeNull()
    })

    it('应该提供重试按钮当数据不可用时', async () => {
      wrapper.vm.wifiData = null
      wrapper.vm.loadingWifi = false
      await wrapper.vm.$forceUpdate()

      expect(wrapper.text()).toContain('WiFi Status Unavailable')
      
      const retryButton = wrapper.find('button').filter((btn: any) =>
        btn.text().includes('Retry')
      ).at(0)
      
      expect(retryButton.exists()).toBe(true)
    })
  })

  describe('Modem状态显示', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(async () => {
      mockDeviceApi.getDeviceModemStatus.mockResolvedValue({
        success: true,
        data: createMockModemData()
      })

      wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: testDevice
        }
      })

      // 切换到Modem标签并等待数据加载
      wrapper.vm.activeTab = 'modem'
      await nextTick()
      await wrapper.vm.$nextTick()
    })

    it('应该显示SIM卡信息', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$forceUpdate()

      const text = wrapper.text()
      expect(text).toContain('SIM Card Information')
      expect(text).toContain('SIM 1')
      expect(text).toContain('89860012345678901234')
      expect(text).toContain('460001234567890')
    })

    it('应该显示网络信息', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$forceUpdate()

      const text = wrapper.text()
      expect(text).toContain('Network Information')
      expect(text).toContain('+8613812345678')
      expect(text).toContain('China Mobile')
      expect(text).toContain('5G-NR')
    })

    it('应该显示信号质量指标', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      await wrapper.vm.$forceUpdate()

      const text = wrapper.text()
      expect(text).toContain('Signal Quality Metrics')
      expect(text).toContain('RSRQ')
      expect(text).toContain('RSRP')
      expect(text).toContain('SNR')
      expect(text).toContain('RSSI')
    })

    it('应该正确处理数据映射', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(wrapper.vm.modemData).toBeTruthy()
      expect(wrapper.vm.modemData.sim_status).toBe('ready')
      expect(wrapper.vm.modemData.active_sim).toBe(1)
      expect(wrapper.vm.modemData.operator).toBe('CHINA MOBILE')
    })

    it('应该显示加载状态', () => {
      wrapper.vm.loadingModem = true
      wrapper.vm.$forceUpdate()

      const loader = wrapper.findComponent({ name: 'VLoader' })
      expect(loader.exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading Modem status...')
    })

    it('应该处理Modem数据加载错误', async () => {
      mockDeviceApi.getDeviceModemStatus.mockRejectedValue(new Error('Network error'))
      
      wrapper.vm.activeTab = 'modem'
      await nextTick()
      
      // 等待错误处理
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(wrapper.vm.modemData).toBeNull()
    })

    it('应该提供重试按钮当数据不可用时', async () => {
      wrapper.vm.modemData = null
      wrapper.vm.loadingModem = false
      await wrapper.vm.$forceUpdate()

      expect(wrapper.text()).toContain('Modem Status Unavailable')
      
      const retryButton = wrapper.find('button').filter((btn: any) =>
        btn.text().includes('Retry')
      ).at(0)
      
      expect(retryButton.exists()).toBe(true)
    })
  })

  describe('工具函数', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: createMockDevice(1)
        }
      })
    })

    describe('getStatusColor', () => {
      it('应该为不同状态返回正确颜色', () => {
        expect(wrapper.vm.getStatusColor(true, true)).toBe('success')
        expect(wrapper.vm.getStatusColor(true, false)).toBe('warning')
        expect(wrapper.vm.getStatusColor(false, true)).toBe('danger')
        expect(wrapper.vm.getStatusColor(false, false)).toBe('danger')
      })
    })

    describe('getStatusText', () => {
      it('应该为不同状态返回正确文本', () => {
        expect(wrapper.vm.getStatusText(true, true)).toBe('Active')
        expect(wrapper.vm.getStatusText(true, false)).toBe('Online')
        expect(wrapper.vm.getStatusText(false, true)).toBe('Offline')
        expect(wrapper.vm.getStatusText(false, false)).toBe('Offline')
      })
    })

    describe('getSignalQualityClass', () => {
      it('应该为RSSI返回正确的信号等级', () => {
        expect(wrapper.vm.getSignalQualityClass(-65, 'rssi')).toBe('signal-excellent')
        expect(wrapper.vm.getSignalQualityClass(-75, 'rssi')).toBe('signal-good')
        expect(wrapper.vm.getSignalQualityClass(-90, 'rssi')).toBe('signal-fair')
        expect(wrapper.vm.getSignalQualityClass(-110, 'rssi')).toBe('signal-poor')
        expect(wrapper.vm.getSignalQualityClass(null, 'rssi')).toBe('signal-unknown')
      })

      it('应该为RSRP返回正确的信号等级', () => {
        expect(wrapper.vm.getSignalQualityClass(-75, 'rsrp')).toBe('signal-excellent')
        expect(wrapper.vm.getSignalQualityClass(-85, 'rsrp')).toBe('signal-good')
        expect(wrapper.vm.getSignalQualityClass(-100, 'rsrp')).toBe('signal-fair')
        expect(wrapper.vm.getSignalQualityClass(-120, 'rsrp')).toBe('signal-poor')
      })

      it('应该为RSRQ返回正确的信号等级', () => {
        expect(wrapper.vm.getSignalQualityClass(-8, 'rsrq')).toBe('signal-excellent')
        expect(wrapper.vm.getSignalQualityClass(-12, 'rsrq')).toBe('signal-good')
        expect(wrapper.vm.getSignalQualityClass(-18, 'rsrq')).toBe('signal-fair')
        expect(wrapper.vm.getSignalQualityClass(-25, 'rsrq')).toBe('signal-poor')
      })

      it('应该为SNR返回正确的信号等级', () => {
        expect(wrapper.vm.getSignalQualityClass(25, 'snr')).toBe('signal-excellent')
        expect(wrapper.vm.getSignalQualityClass(15, 'snr')).toBe('signal-good')
        expect(wrapper.vm.getSignalQualityClass(5, 'snr')).toBe('signal-fair')
        expect(wrapper.vm.getSignalQualityClass(-5, 'snr')).toBe('signal-poor')
      })

      it('应该为未知类型返回unknown', () => {
        expect(wrapper.vm.getSignalQualityClass(-75, 'unknown')).toBe('signal-unknown')
      })
    })

    describe('getOperatorName', () => {
      it('应该正确转换运营商名称', () => {
        expect(wrapper.vm.getOperatorName('CT')).toBe('China Telecom')
        expect(wrapper.vm.getOperatorName('CM')).toBe('China Mobile')
        expect(wrapper.vm.getOperatorName('CU')).toBe('China Unicom')
        expect(wrapper.vm.getOperatorName('CHINA MOBILE')).toBe('China Mobile')
        expect(wrapper.vm.getOperatorName('china telecom')).toBe('China Telecom')
      })

      it('应该返回原始名称当无法匹配时', () => {
        expect(wrapper.vm.getOperatorName('Custom Operator')).toBe('Custom Operator')
      })

      it('应该处理空值', () => {
        expect(wrapper.vm.getOperatorName('')).toBe('Unknown')
        expect(wrapper.vm.getOperatorName(null)).toBe('Unknown')
        expect(wrapper.vm.getOperatorName(undefined)).toBe('Unknown')
      })
    })
  })

  describe('监听器和响应式行为', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(() => {
      mockDeviceApi.getDeviceWiFiStatus.mockResolvedValue({
        success: true,
        data: createMockWiFiData()
      })
      
      mockDeviceApi.getDeviceModemStatus.mockResolvedValue({
        success: true,
        data: createMockModemData()
      })

      wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: testDevice
        }
      })
    })

    it('应该在对话框打开时重置数据和标签', async () => {
      // 先设置一些状态
      wrapper.vm.activeTab = 'wifi'
      wrapper.vm.wifiData = { test: 'data' }
      wrapper.vm.modemData = { test: 'data' }

      // 关闭再打开对话框
      await wrapper.setProps({ open: false })
      await wrapper.setProps({ open: true })

      expect(wrapper.vm.activeTab).toBe('basic')
      expect(wrapper.vm.wifiData).toBeNull()
      expect(wrapper.vm.modemData).toBeNull()
    })

    it('应该在标签变化时加载相应数据', async () => {
      // 切换到WiFi标签
      wrapper.vm.activeTab = 'wifi'
      await nextTick()

      expect(mockDeviceApi.getDeviceWiFiStatus).toHaveBeenCalledWith(testDevice.id)

      // 切换到Modem标签
      wrapper.vm.activeTab = 'modem'
      await nextTick()

      expect(mockDeviceApi.getDeviceModemStatus).toHaveBeenCalledWith(testDevice.id)

      // 切换回基本信息标签不应该触发API调用
      vi.clearAllMocks()
      wrapper.vm.activeTab = 'basic'
      await nextTick()

      expect(mockDeviceApi.getDeviceWiFiStatus).not.toHaveBeenCalled()
      expect(mockDeviceApi.getDeviceModemStatus).not.toHaveBeenCalled()
    })

    it('应该在没有设备时跳过数据加载', async () => {
      await wrapper.setProps({ device: null })
      
      wrapper.vm.activeTab = 'wifi'
      await nextTick()

      // 不应该调用API
      expect(mockDeviceApi.getDeviceWiFiStatus).not.toHaveBeenCalled()
    })
  })

  describe('重试功能', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(() => {
      wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: testDevice
        }
      })
    })

    it('应该处理WiFi数据重新加载', async () => {
      // 模拟初始失败
      mockDeviceApi.getDeviceWiFiStatus
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce({
          success: true,
          data: createMockWiFiData()
        })

      // 切换到WiFi标签（初始加载失败）
      wrapper.vm.activeTab = 'wifi'
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.wifiData).toBeNull()

      // 手动调用重试
      await wrapper.vm.loadWiFiData()

      expect(wrapper.vm.wifiData).toBeTruthy()
      expect(mockDeviceApi.getDeviceWiFiStatus).toHaveBeenCalledTimes(2)
    })

    it('应该处理Modem数据重新加载', async () => {
      // 模拟初始失败
      mockDeviceApi.getDeviceModemStatus
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce({
          success: true,
          data: createMockModemData()
        })

      // 切换到Modem标签（初始加载失败）
      wrapper.vm.activeTab = 'modem'
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.modemData).toBeNull()

      // 手动调用重试
      await wrapper.vm.loadModemData()

      expect(wrapper.vm.modemData).toBeTruthy()
      expect(mockDeviceApi.getDeviceModemStatus).toHaveBeenCalledTimes(2)
    })
  })

  describe('边界情况和错误处理', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(() => {
      wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: testDevice
        }
      })
    })

    it('应该处理空的WiFi数据响应', async () => {
      mockDeviceApi.getDeviceWiFiStatus.mockResolvedValue({
        success: true,
        data: null
      })

      wrapper.vm.activeTab = 'wifi'
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.wifiData).toBeNull()
    })

    it('应该处理不完整的WiFi数据结构', async () => {
      mockDeviceApi.getDeviceWiFiStatus.mockResolvedValue({
        success: true,
        data: { radios: undefined }
      })

      wrapper.vm.activeTab = 'wifi'
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.wifiData).toEqual({
        radios: [],
        ap_enabled: false
      })
    })

    it('应该处理API成功但success为false的情况', async () => {
      mockDeviceApi.getDeviceWiFiStatus.mockResolvedValue({
        success: false,
        message: 'Device not found'
      })

      wrapper.vm.activeTab = 'wifi'
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(wrapper.vm.wifiData).toBeNull()
    })

    it('应该在组件卸载时清理状态', () => {
      wrapper.unmount()
      
      // 组件应该能够正常卸载而不抛出错误
      expect(true).toBe(true)
    })
  })

  describe('Props验证和响应式更新', () => {
    it('应该响应设备数据变化', async () => {
      const device1 = createMockDevice(1)
      const device2 = createMockDevice(2)

      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device: device1
        }
      })

      expect(wrapper.text()).toContain('DEV001')

      // 更换设备数据
      await wrapper.setProps({ device: device2 })

      expect(wrapper.text()).toContain('DEV002')
    })

    it('应该响应open状态变化', async () => {
      const device = createMockDevice(1)
      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: false,
          device
        }
      })

      const modal = wrapper.findComponent({ name: 'VModal' })
      expect(modal.props('open')).toBe(false)

      // 打开对话框
      await wrapper.setProps({ open: true })

      expect(modal.props('open')).toBe(true)
    })

    it('应该正确处理设备为null的更新', async () => {
      const device = createMockDevice(1)
      const wrapper = mountComponent(DeviceDetailDialog, {
        props: {
          open: true,
          device
        }
      })

      expect(wrapper.findComponent({ name: 'VTabs' }).exists()).toBe(true)

      // 设置设备为null
      await wrapper.setProps({ device: null })

      expect(wrapper.findComponent({ name: 'VTabs' }).exists()).toBe(false)
    })
  })
})