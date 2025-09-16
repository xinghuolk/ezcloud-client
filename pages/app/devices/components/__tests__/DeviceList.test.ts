/**
 * DeviceList.vue 组件单元测试
 * 测试设备列表组件的所有功能，包括：
 * - 表格渲染和数据显示
 * - 状态和所有权标签
 * - 分页和选择功能
 * - 操作按钮和下拉菜单
 * - 加载和空状态
 * - 事件发射和用户交互
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { mountComponent, findByTestId } from '/@src/tests/utils/component'
import DeviceList from '../DeviceList.vue'
import type { Device } from '/@src/api/types'

// Mock dependencies
vi.mock('/@src/stores/user-session', () => ({
  useUserSession: vi.fn(() => ({
    user: { id: 1, username: 'testuser' },
    isLoggedIn: true
  }))
}))

vi.mock('/@src/components/RemoteAccessButton.vue', () => ({
  default: {
    name: 'RemoteAccessButton',
    template: '<button data-testid="remote-access-button" @click="$emit(\'status-change\', device, \'test-status\')">Remote Access</button>',
    props: ['device', 'show-status-indicators'],
    emits: ['status-change']
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
  version: '1.0.0',
  wanip: `192.168.1.${id}`,
  public_ip: `203.0.113.${id}`,
  last_seen: '2024-01-01T12:00:00Z',
  ownership: {
    isOwner: true,
    isTrusted: false
  },
  deviceModel: {
    id: 1,
    oemname: 'TestBrand',
    stdname: 'Test Model',
    devtype: 'gateway'
  },
  ...overrides
})

const createMockPagination = () => ({
  page: 1,
  limit: 20,
  total: 50
})

describe('DeviceList.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  describe('组件渲染', () => {
    it('应该正确渲染设备表格', () => {
      const devices = [createMockDevice(1), createMockDevice(2)]
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices,
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })

      // 检查VFlexTableWrapper是否存在
      expect(wrapper.findComponent({ name: 'VFlexTableWrapper' }).exists()).toBe(true)
      
      // 检查列配置
      const tableWrapper = wrapper.findComponent({ name: 'VFlexTableWrapper' })
      const columns = tableWrapper.props('columns')
      expect(columns).toHaveProperty('serial')
      expect(columns).toHaveProperty('name')
      expect(columns).toHaveProperty('model')
      expect(columns).toHaveProperty('status')
      expect(columns).toHaveProperty('actions')
    })

    it('应该显示加载状态', () => {
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [],
          loading: true,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })

      // 检查是否显示加载占位符
      const placeholders = wrapper.findAllComponents({ name: 'VPlaceload' })
      expect(placeholders.length).toBeGreaterThan(0)
    })

    it('应该显示空状态', () => {
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [],
          loading: false,
          pagination: { page: 1, limit: 20, total: 0 },
          filterLimit: 20
        }
      })

      // 检查空状态组件
      const placeholder = wrapper.findComponent({ name: 'VPlaceholderSection' })
      expect(placeholder.exists()).toBe(true)
      expect(placeholder.props('title')).toBe('No Devices')
    })

    it('应该渲染分页组件', () => {
      const devices = [createMockDevice(1)]
      const pagination = { page: 1, limit: 20, total: 50 }
      
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices,
          loading: false,
          pagination,
          filterLimit: 20
        }
      })

      const paginationComponent = wrapper.findComponent({ name: 'VFlexPagination' })
      expect(paginationComponent.exists()).toBe(true)
      expect(paginationComponent.props('totalItems')).toBe(50)
    })

    it('应该不渲染分页组件当总数为0时', () => {
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [],
          loading: false,
          pagination: { page: 1, limit: 20, total: 0 },
          filterLimit: 20
        }
      })

      const paginationComponent = wrapper.findComponent({ name: 'VFlexPagination' })
      expect(paginationComponent.exists()).toBe(false)
    })
  })

  describe('设备数据显示', () => {
    let devices: Device[]
    let wrapper: any

    beforeEach(() => {
      devices = [
        createMockDevice(1, {
          name: 'Primary Device',
          version: '2.1.0',
          is_online: true,
          is_activate: true,
          ownership: { isOwner: true, isTrusted: false }
        }),
        createMockDevice(2, {
          name: 'Secondary Device',
          version: undefined,
          is_online: false,
          is_activate: false,
          ownership: { isOwner: false, isTrusted: true }
        }),
        createMockDevice(3, {
          name: undefined,
          deviceModel: undefined,
          wanip: undefined,
          public_ip: undefined,
          last_seen: undefined,
          ownership: { isOwner: false, isTrusted: false }
        })
      ]

      wrapper = mountComponent(DeviceList, {
        props: {
          devices,
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })
    })

    it('应该正确显示设备序列号', () => {
      expect(wrapper.text()).toContain('DEV001')
      expect(wrapper.text()).toContain('DEV002')
      expect(wrapper.text()).toContain('DEV003')
    })

    it('应该正确显示设备名称', () => {
      expect(wrapper.text()).toContain('Primary Device')
      expect(wrapper.text()).toContain('Secondary Device')
      expect(wrapper.text()).toContain('Unnamed Device') // 默认名称
    })

    it('应该正确显示型号信息', () => {
      expect(wrapper.text()).toContain('TestBrand')
      // 第三个设备没有型号信息，应该显示 "-"
    })

    it('应该正确显示版本标签', () => {
      const versionTags = wrapper.findAllComponents({ name: 'VTag' })
      const versionTag = versionTags.find((tag: any) => 
        tag.text() === '2.1.0'
      )
      expect(versionTag).toBeTruthy()
      expect(versionTag?.props('color')).toBe('info')
    })

    it('应该正确显示网络信息', () => {
      expect(wrapper.text()).toContain('WAN: 192.168.1.1')
      expect(wrapper.text()).toContain('Public: 203.0.113.1')
      expect(wrapper.text()).toContain('00:11:22:33:44:01')
    })

    it('应该正确显示最后在线时间', () => {
      // 检查日期分割组件
      const dateSplits = wrapper.findAllComponents({ name: 'VDateTimeSplit' })
      expect(dateSplits.length).toBeGreaterThan(0)
      
      // 检查 "Never" 状态
      expect(wrapper.text()).toContain('Never')
    })
  })

  describe('状态和所有权标签', () => {
    let wrapper: any

    beforeEach(() => {
      const devices = [
        createMockDevice(1, {
          is_online: true,
          is_activate: true,
          ownership: { isOwner: true, isTrusted: false }
        }),
        createMockDevice(2, {
          is_online: true,
          is_activate: false,
          ownership: { isOwner: false, isTrusted: true }
        }),
        createMockDevice(3, {
          is_online: false,
          is_activate: false,
          ownership: { isOwner: false, isTrusted: false }
        })
      ]

      wrapper = mountComponent(DeviceList, {
        props: {
          devices,
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })
    })

    it('应该正确显示设备状态标签和颜色', () => {
      const statusTags = wrapper.findAllComponents({ name: 'VTag' })
      
      // 找到状态标签
      const activeTag = statusTags.find((tag: any) => tag.text() === 'Active')
      expect(activeTag).toBeTruthy()
      
      const onlineTag = statusTags.find((tag: any) => tag.text() === 'Online')  
      expect(onlineTag).toBeTruthy()
      
      const offlineTag = statusTags.find((tag: any) => tag.text() === 'Offline')
      expect(offlineTag).toBeTruthy()
    })

    it('应该正确显示所有权标签', () => {
      const ownershipTags = wrapper.findAllComponents({ name: 'VTag' })
      
      const ownedTag = ownershipTags.find((tag: any) => tag.text() === 'Owned')
      expect(ownedTag).toBeTruthy()
      
      const trustedTag = ownershipTags.find((tag: any) => tag.text() === 'Trusted')
      expect(trustedTag).toBeTruthy()
      
      const unboundTag = ownershipTags.find((tag: any) => tag.text() === 'Unbound')
      expect(unboundTag).toBeTruthy()
    })

    it('应该为所有权标签提供工具提示', () => {
      const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
      expect(tooltips.length).toBeGreaterThan(0)
    })
  })

  describe('辅助方法', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DeviceList, {
        props: {
          devices: [createMockDevice(1)],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })
    })

    describe('getStatusColor', () => {
      it('应该为活跃设备返回success', () => {
        expect(wrapper.vm.getStatusColor(true, true)).toBe('success')
      })

      it('应该为在线但未激活设备返回warning', () => {
        expect(wrapper.vm.getStatusColor(true, false)).toBe('warning')
      })

      it('应该为离线设备返回danger', () => {
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

    describe('getOwnershipType', () => {
      it('应该为拥有者返回owned类型', () => {
        const device = createMockDevice(1, {
          ownership: { isOwner: true, isTrusted: false }
        })
        const result = wrapper.vm.getOwnershipType(device)
        expect(result).toEqual({
          type: 'owned',
          text: 'Owned',
          color: 'primary'
        })
      })

      it('应该为受托者返回trusted类型', () => {
        const device = createMockDevice(1, {
          ownership: { isOwner: false, isTrusted: true }
        })
        const result = wrapper.vm.getOwnershipType(device)
        expect(result).toEqual({
          type: 'trusted',
          text: 'Trusted',
          color: 'info'
        })
      })

      it('应该为未绑定设备返回unbound类型', () => {
        const device = createMockDevice(1, {
          ownership: { isOwner: false, isTrusted: false }
        })
        const result = wrapper.vm.getOwnershipType(device)
        expect(result).toEqual({
          type: 'unbound',
          text: 'Unbound',
          color: 'warning'
        })
      })

      it('应该为未知状态返回unknown类型', () => {
        const device = createMockDevice(1, { ownership: undefined })
        const result = wrapper.vm.getOwnershipType(device)
        expect(result).toEqual({
          type: 'unknown',
          text: 'Unknown',
          color: 'light'
        })
      })
    })

    describe('getOwnershipTooltip', () => {
      it('应该为拥有者返回正确提示', () => {
        const device = createMockDevice(1, {
          ownership: { isOwner: true, isTrusted: false }
        })
        expect(wrapper.vm.getOwnershipTooltip(device)).toBe('You own this device')
      })

      it('应该为受托者返回正确提示', () => {
        const device = createMockDevice(1, {
          ownership: { 
            isOwner: false, 
            isTrusted: true,
            ownerInfo: { username: 'john_doe' }
          }
        })
        expect(wrapper.vm.getOwnershipTooltip(device))
          .toBe('This device is trusted to you by john_doe')
      })

      it('应该处理未知拥有者信息', () => {
        const device = createMockDevice(1, {
          ownership: { isOwner: false, isTrusted: true }
        })
        expect(wrapper.vm.getOwnershipTooltip(device))
          .toBe('This device is trusted to you by Unknown user')
      })
    })

    describe('canOperateDevice', () => {
      it('应该允许拥有者操作设备', () => {
        const device = createMockDevice(1, {
          ownership: { isOwner: true, isTrusted: false }
        })
        expect(wrapper.vm.canOperateDevice(device)).toBe(true)
      })

      it('应该允许受托者操作设备', () => {
        const device = createMockDevice(1, {
          ownership: { isOwner: false, isTrusted: true }
        })
        expect(wrapper.vm.canOperateDevice(device)).toBe(true)
      })

      it('应该不允许未绑定用户操作设备', () => {
        const device = createMockDevice(1, {
          ownership: { isOwner: false, isTrusted: false }
        })
        expect(wrapper.vm.canOperateDevice(device)).toBe(false)
      })
    })
  })

  describe('事件发射', () => {
    let wrapper: any
    const testDevice = createMockDevice(1)

    beforeEach(() => {
      wrapper = mountComponent(DeviceList, {
        props: {
          devices: [testDevice],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })
    })

    it('应该发射selection-change事件', async () => {
      const selectedDevices = [testDevice]
      
      await wrapper.vm.handleSelectionChange(selectedDevices)
      
      expect(wrapper.emitted('selection-change')).toBeTruthy()
      expect(wrapper.emitted('selection-change')[0]).toEqual([selectedDevices])
    })

    it('应该发射page-change事件', async () => {
      await wrapper.vm.handlePageChange(2)
      
      expect(wrapper.emitted('page-change')).toBeTruthy()
      expect(wrapper.emitted('page-change')[0]).toEqual([2])
    })

    it('应该发射limit-change事件', async () => {
      await wrapper.vm.handleLimitChange(50)
      
      expect(wrapper.emitted('limit-change')).toBeTruthy()
      expect(wrapper.emitted('limit-change')[0]).toEqual([50])
    })

    it('应该发射view-details事件', async () => {
      await wrapper.vm.handleViewDetails(testDevice)
      
      expect(wrapper.emitted('view-details')).toBeTruthy()
      expect(wrapper.emitted('view-details')[0]).toEqual([testDevice])
    })

    it('应该发射manage-trust事件', async () => {
      await wrapper.vm.handleManageTrust(testDevice)
      
      expect(wrapper.emitted('manage-trust')).toBeTruthy()
      expect(wrapper.emitted('manage-trust')[0]).toEqual([testDevice])
    })

    it('应该发射reboot事件', async () => {
      await wrapper.vm.handleReboot(testDevice)
      
      expect(wrapper.emitted('reboot')).toBeTruthy()
      expect(wrapper.emitted('reboot')[0]).toEqual([testDevice])
    })

    it('应该发射unbind事件', async () => {
      await wrapper.vm.handleUnbind(testDevice)
      
      expect(wrapper.emitted('unbind')).toBeTruthy()
      expect(wrapper.emitted('unbind')[0]).toEqual([testDevice])
    })

    it('应该发射remote-access-status-change事件', async () => {
      const status = { connected: true }
      
      await wrapper.vm.handleRemoteAccessStatusChange(testDevice, status)
      
      expect(wrapper.emitted('remote-access-status-change')).toBeTruthy()
      expect(wrapper.emitted('remote-access-status-change')[0]).toEqual([testDevice, status])
    })
  })

  describe('远程访问按钮', () => {
    it('应该为可操作设备显示远程访问按钮', () => {
      const device = createMockDevice(1, {
        ownership: { isOwner: true, isTrusted: false }
      })

      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [device],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })

      const remoteButton = findByTestId(wrapper, 'remote-access-button')
      expect(remoteButton.exists()).toBe(true)
    })

    it('应该为不可操作设备显示禁用按钮', () => {
      const device = createMockDevice(1, {
        ownership: { isOwner: false, isTrusted: false }
      })

      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [device],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })

      const disabledButton = wrapper.find('button[disabled]')
      expect(disabledButton.exists()).toBe(true)
      
      // 检查工具提示
      const tooltip = wrapper.findComponent({ name: 'VTooltip' })
      expect(tooltip.exists()).toBe(true)
    })

    it('应该处理远程访问状态变化', async () => {
      const device = createMockDevice(1, {
        ownership: { isOwner: true, isTrusted: false }
      })

      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [device],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })

      const remoteButton = findByTestId(wrapper, 'remote-access-button')
      await remoteButton.trigger('click')

      expect(wrapper.emitted('remote-access-status-change')).toBeTruthy()
      expect(wrapper.emitted('remote-access-status-change')[0]).toEqual([
        device, 
        'test-status'
      ])
    })
  })

  describe('操作菜单', () => {
    let wrapper: any
    let ownedDevice: Device
    let trustedDevice: Device
    let unboundDevice: Device

    beforeEach(() => {
      ownedDevice = createMockDevice(1, {
        is_online: true,
        ownership: { isOwner: true, isTrusted: false }
      })
      
      trustedDevice = createMockDevice(2, {
        is_online: true,
        ownership: { isOwner: false, isTrusted: true }
      })
      
      unboundDevice = createMockDevice(3, {
        is_online: false,
        ownership: { isOwner: false, isTrusted: false }
      })

      wrapper = mountComponent(DeviceList, {
        props: {
          devices: [ownedDevice, trustedDevice, unboundDevice],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })
    })

    it('应该为所有设备显示查看详情选项', () => {
      const dropdowns = wrapper.findAllComponents({ name: 'VDropdown' })
      expect(dropdowns.length).toBe(3) // 三个设备都应该有下拉菜单
      
      // 检查查看详情选项
      expect(wrapper.text()).toContain('View Details')
    })

    it('应该只为拥有者显示管理托管选项', () => {
      expect(wrapper.text()).toContain('Manage Trust')
      
      // 验证管理托管选项的数量（只有拥有者设备应该显示）
      const manageTrustCount = (wrapper.text().match(/Manage Trust/g) || []).length
      expect(manageTrustCount).toBe(1)
    })

    it('应该为在线且可操作设备显示重启选项', () => {
      expect(wrapper.text()).toContain('Reboot')
      
      // 检查重启选项的可用性
      const rebootLinks = wrapper.findAll('a').filter((link: any) =>
        link.text().includes('Reboot') && !link.text().includes('Offline')
      )
      expect(rebootLinks.length).toBeGreaterThan(0)
    })

    it('应该为离线设备显示禁用的重启选项', () => {
      expect(wrapper.text()).toContain('Reboot (Offline)')
      
      // 检查禁用的重启选项
      const disabledReboot = wrapper.find('a.is-disabled')
      expect(disabledReboot.exists()).toBe(true)
    })

    it('应该只为拥有者显示解绑选项', () => {
      expect(wrapper.text()).toContain('Unbind Device')
      
      // 验证解绑选项的数量（只有拥有者设备应该显示）
      const unbindCount = (wrapper.text().match(/Unbind Device/g) || []).length
      expect(unbindCount).toBe(1)
    })

    it('应该正确处理操作点击事件', async () => {
      // 模拟点击查看详情
      const viewDetailLinks = wrapper.findAll('a').filter((link: any) =>
        link.text().includes('View Details')
      )
      
      if (viewDetailLinks.length > 0) {
        await viewDetailLinks[0].trigger('click')
        expect(wrapper.emitted('view-details')).toBeTruthy()
      }
    })
  })

  describe('分页控制', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(DeviceList, {
        props: {
          devices: [createMockDevice(1)],
          loading: false,
          pagination: { page: 1, limit: 10, total: 100 },
          filterLimit: 10
        }
      })
    })

    it('应该渲染每页限制选择器', () => {
      const limitSelect = wrapper.findComponent({ name: 'VSelect' })
      expect(limitSelect.exists()).toBe(true)
      expect(limitSelect.props('modelValue')).toBe(10)
    })

    it('应该包含正确的每页选项', () => {
      const options = wrapper.findAllComponents({ name: 'VOption' })
      const optionValues = options.map((option: any) => option.props('value'))
      
      expect(optionValues).toContain(10)
      expect(optionValues).toContain(20)
      expect(optionValues).toContain(50)
      expect(optionValues).toContain(100)
    })

    it('应该处理每页限制变化', async () => {
      const limitSelect = wrapper.findComponent({ name: 'VSelect' })
      
      await limitSelect.vm.$emit('update:model-value', 50)
      
      expect(wrapper.emitted('limit-change')).toBeTruthy()
      expect(wrapper.emitted('limit-change')[0]).toEqual([50])
    })

    it('应该配置分页组件正确的props', () => {
      const pagination = wrapper.findComponent({ name: 'VFlexPagination' })
      
      expect(pagination.props('currentPage')).toBe(1)
      expect(pagination.props('itemPerPage')).toBe(10)
      expect(pagination.props('totalItems')).toBe(100)
      expect(pagination.props('maxLinksDisplayed')).toBe(7)
      expect(pagination.props('noRouter')).toBe(true)
    })

    it('应该处理分页变化', async () => {
      const pagination = wrapper.findComponent({ name: 'VFlexPagination' })
      
      await pagination.vm.$emit('update:current-page', 3)
      
      expect(wrapper.emitted('page-change')).toBeTruthy()
      expect(wrapper.emitted('page-change')[0]).toEqual([3])
    })
  })

  describe('Props 验证和默认值', () => {
    it('应该接受所有必需的props', () => {
      const devices = [createMockDevice(1)]
      const pagination = createMockPagination()
      
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices,
          loading: false,
          pagination,
          filterLimit: 20
        }
      })

      expect(wrapper.props('devices')).toEqual(devices)
      expect(wrapper.props('loading')).toBe(false)
      expect(wrapper.props('pagination')).toEqual(pagination)
      expect(wrapper.props('filterLimit')).toBe(20)
    })

    it('应该正确处理空设备数组', () => {
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [],
          loading: false,
          pagination: { page: 1, limit: 20, total: 0 },
          filterLimit: 20
        }
      })

      expect(wrapper.findComponent({ name: 'VPlaceholderSection' }).exists()).toBe(true)
    })

    it('应该正确处理缺失的可选数据', () => {
      const deviceWithMissingData = createMockDevice(1, {
        name: undefined,
        version: undefined,
        deviceModel: undefined,
        wanip: undefined,
        public_ip: undefined,
        last_seen: undefined
      })

      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [deviceWithMissingData],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })

      // 应该显示默认值和占位符
      expect(wrapper.text()).toContain('Unnamed Device')
      expect(wrapper.text()).toContain('Never')
    })
  })

  describe('响应式行为', () => {
    it('应该响应loading状态变化', async () => {
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [createMockDevice(1)],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })

      // 初始状态不应该显示加载
      expect(wrapper.findAllComponents({ name: 'VPlaceload' }).length).toBe(0)

      // 更改为加载状态
      await wrapper.setProps({ loading: true })

      // 应该显示加载占位符
      expect(wrapper.findAllComponents({ name: 'VPlaceload' }).length).toBeGreaterThan(0)
    })

    it('应该响应设备数据变化', async () => {
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [createMockDevice(1)],
          loading: false,
          pagination: createMockPagination(),
          filterLimit: 20
        }
      })

      expect(wrapper.text()).toContain('DEV001')

      // 更新设备数据
      const newDevices = [createMockDevice(2)]
      await wrapper.setProps({ devices: newDevices })

      expect(wrapper.text()).toContain('DEV002')
      expect(wrapper.text()).not.toContain('DEV001')
    })

    it('应该响应分页数据变化', async () => {
      const wrapper = mountComponent(DeviceList, {
        props: {
          devices: [createMockDevice(1)],
          loading: false,
          pagination: { page: 1, limit: 20, total: 50 },
          filterLimit: 20
        }
      })

      const pagination = wrapper.findComponent({ name: 'VFlexPagination' })
      expect(pagination.props('totalItems')).toBe(50)

      // 更新分页数据
      await wrapper.setProps({ 
        pagination: { page: 2, limit: 20, total: 100 }
      })

      expect(pagination.props('totalItems')).toBe(100)
    })
  })
})