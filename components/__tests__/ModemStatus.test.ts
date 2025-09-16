/**
 * ModemStatus.vue 组件单元测试
 * 测试调制解调器状态显示组件的所有功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModemStatus from '../ModemStatus.vue'
import { mountComponent, findByTestId } from '/@src/tests/utils/component'
import type { ModemStatus as ModemStatusType } from '/@src/api/types'

// 测试数据
const mockModemStatus: ModemStatusType = {
  id: 1,
  device_id: 1,
  active_slot: 1,
  operator: 'China Mobile',
  network_type: '5G',
  rssi: -75,
  rsrp: -105,
  rsrq: -10,
  snr: 20,
  iccid: '898600123456789012',
  imsi: '460001234567890',
  phone_number: '+8613812345678',
  apn_name: 'cmnet',
  rx_bytes: 1024000,
  tx_bytes: 512000,
  rx_speed: 50000000,
  tx_speed: 10000000,
  last_update: '2024-01-01T12:00:00Z'
}

describe('ModemStatus.vue', () => {
  describe('组件渲染', () => {
    it('应该在没有数据时显示无数据状态', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: { modemStatus: undefined }
      })

      expect(wrapper.find('.no-data').exists()).toBe(true)
      expect(wrapper.text()).toContain('No modem data')
      expect(findByTestId(wrapper, 'iconify-icon').exists()).toBe(true)
    })

    it('应该在summary模式下显示简要信息', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: false
        }
      })

      expect(wrapper.find('.modem-summary').exists()).toBe(true)
      expect(wrapper.find('.modem-details').exists()).toBe(false)
      expect(wrapper.text()).toContain('China Mobile')
      expect(wrapper.text()).toContain('5G')
      expect(wrapper.text()).toContain('-75 dBm')
    })

    it('应该在details模式下显示详细信息', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: true
        }
      })

      expect(wrapper.find('.modem-details').exists()).toBe(true)
      expect(wrapper.find('.modem-summary').exists()).toBe(false)
      expect(findByTestId(wrapper, 'v-card').exists()).toBe(true)
    })

    it('应该正确显示所有详细信息部分', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: true
        }
      })

      // 检查各个信息部分
      expect(wrapper.text()).toContain('Network Information')
      expect(wrapper.text()).toContain('Signal Quality')
      expect(wrapper.text()).toContain('SIM Information')
      expect(wrapper.text()).toContain('Data Usage')
      expect(wrapper.text()).toContain('Last updated')
    })
  })

  describe('方法测试', () => {
    let wrapper: any

    beforeEach(() => {
      wrapper = mountComponent(ModemStatus, {
        props: { modemStatus: mockModemStatus }
      })
    })

    describe('getSignalStrength', () => {
      it('应该为未知RSSI返回Unknown', () => {
        const result = wrapper.vm.getSignalStrength(undefined)
        expect(result).toEqual({ level: 'Unknown', color: 'light' })
      })

      it('应该为强信号返回Excellent', () => {
        const result = wrapper.vm.getSignalStrength(-65)
        expect(result).toEqual({ level: 'Excellent', color: 'success' })
      })

      it('应该为良好信号返回Good', () => {
        const result = wrapper.vm.getSignalStrength(-80)
        expect(result).toEqual({ level: 'Good', color: 'primary' })
      })

      it('应该为一般信号返回Fair', () => {
        const result = wrapper.vm.getSignalStrength(-95)
        expect(result).toEqual({ level: 'Fair', color: 'warning' })
      })

      it('应该为弱信号返回Poor', () => {
        const result = wrapper.vm.getSignalStrength(-110)
        expect(result).toEqual({ level: 'Poor', color: 'danger' })
      })

      it('应该正确处理边界值', () => {
        expect(wrapper.vm.getSignalStrength(-70)).toEqual({ level: 'Excellent', color: 'success' })
        expect(wrapper.vm.getSignalStrength(-85)).toEqual({ level: 'Good', color: 'primary' })
        expect(wrapper.vm.getSignalStrength(-100)).toEqual({ level: 'Fair', color: 'warning' })
      })
    })

    describe('formatBytes', () => {
      it('应该正确格式化字节数', () => {
        expect(wrapper.vm.formatBytes(0)).toBe('0 B')
        expect(wrapper.vm.formatBytes(1024)).toBe('1 KB')
        expect(wrapper.vm.formatBytes(1048576)).toBe('1 MB')
        expect(wrapper.vm.formatBytes(1073741824)).toBe('1 GB')
      })

      it('应该正确处理小数', () => {
        expect(wrapper.vm.formatBytes(1536)).toBe('1.5 KB')
        expect(wrapper.vm.formatBytes(1572864)).toBe('1.5 MB')
      })

      it('应该处理大数值', () => {
        expect(wrapper.vm.formatBytes(1099511627776)).toBe('1 TB')
      })
    })

    describe('formatSpeed', () => {
      it('应该正确格式化速度', () => {
        expect(wrapper.vm.formatSpeed(0)).toBe('0 bps')
        expect(wrapper.vm.formatSpeed(1000)).toBe('1 Kbps')
        expect(wrapper.vm.formatSpeed(1000000)).toBe('1 Mbps')
        expect(wrapper.vm.formatSpeed(1000000000)).toBe('1 Gbps')
      })

      it('应该正确处理小数', () => {
        expect(wrapper.vm.formatSpeed(1500)).toBe('1.5 Kbps')
        expect(wrapper.vm.formatSpeed(2500000)).toBe('2.5 Mbps')
      })
    })

    describe('getNetworkTypeColor', () => {
      it('应该为未知网络类型返回light', () => {
        expect(wrapper.vm.getNetworkTypeColor(undefined)).toBe('light')
        expect(wrapper.vm.getNetworkTypeColor('')).toBe('light')
      })

      it('应该为5G网络返回success', () => {
        expect(wrapper.vm.getNetworkTypeColor('5G')).toBe('success')
        expect(wrapper.vm.getNetworkTypeColor('NR')).toBe('success')
        expect(wrapper.vm.getNetworkTypeColor('nr')).toBe('success')
      })

      it('应该为4G网络返回primary', () => {
        expect(wrapper.vm.getNetworkTypeColor('4G')).toBe('primary')
        expect(wrapper.vm.getNetworkTypeColor('LTE')).toBe('primary')
        expect(wrapper.vm.getNetworkTypeColor('lte')).toBe('primary')
      })

      it('应该为3G网络返回warning', () => {
        expect(wrapper.vm.getNetworkTypeColor('3G')).toBe('warning')
        expect(wrapper.vm.getNetworkTypeColor('WCDMA')).toBe('warning')
        expect(wrapper.vm.getNetworkTypeColor('UMTS')).toBe('warning')
      })

      it('应该为2G网络返回danger', () => {
        expect(wrapper.vm.getNetworkTypeColor('2G')).toBe('danger')
        expect(wrapper.vm.getNetworkTypeColor('GSM')).toBe('danger')
      })

      it('应该为未知网络类型返回info', () => {
        expect(wrapper.vm.getNetworkTypeColor('UNKNOWN')).toBe('info')
        expect(wrapper.vm.getNetworkTypeColor('OTHER')).toBe('info')
      })

      it('应该正确处理大小写', () => {
        expect(wrapper.vm.getNetworkTypeColor('5g')).toBe('success')
        expect(wrapper.vm.getNetworkTypeColor('4g')).toBe('primary')
        expect(wrapper.vm.getNetworkTypeColor('3g')).toBe('warning')
        expect(wrapper.vm.getNetworkTypeColor('2g')).toBe('danger')
      })
    })
  })

  describe('条件渲染测试', () => {
    it('应该只在有运营商信息时显示运营商', () => {
      const statusWithoutOperator = { ...mockModemStatus, operator: undefined }
      const wrapper = mountComponent(ModemStatus, {
        props: { modemStatus: statusWithoutOperator }
      })

      expect(wrapper.find('.operator').exists()).toBe(false)
    })

    it('应该只在有RSSI时显示信号信息', () => {
      const statusWithoutRssi = { ...mockModemStatus, rssi: undefined }
      const wrapper = mountComponent(ModemStatus, {
        props: { modemStatus: statusWithoutRssi }
      })

      expect(wrapper.find('.signal-info').exists()).toBe(false)
    })

    it('应该在详细模式下正确显示活动SIM卡槽', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: true
        }
      })

      expect(wrapper.text()).toContain('Slot 1')
    })

    it('应该只在有信号数据时显示信号质量部分', () => {
      const statusWithoutSignal = {
        ...mockModemStatus,
        rssi: undefined,
        rsrp: undefined,
        rsrq: undefined,
        snr: undefined
      }
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: statusWithoutSignal,
          showDetails: true
        }
      })

      expect(wrapper.text()).not.toContain('Signal Quality')
    })

    it('应该只在有SIM信息时显示SIM信息部分', () => {
      const statusWithoutSIM = {
        ...mockModemStatus,
        iccid: undefined,
        imsi: undefined,
        phone_number: undefined
      }
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: statusWithoutSIM,
          showDetails: true
        }
      })

      expect(wrapper.text()).not.toContain('SIM Information')
    })
  })

  describe('数据显示测试', () => {
    it('应该正确格式化和显示数据使用量', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: true
        }
      })

      expect(wrapper.text()).toContain('1000 KB') // rx_bytes formatted
      expect(wrapper.text()).toContain('500 KB')  // tx_bytes formatted
      expect(wrapper.text()).toContain('50 Mbps') // rx_speed formatted
      expect(wrapper.text()).toContain('10 Mbps') // tx_speed formatted
    })

    it('应该正确显示信号强度标签', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: true
        }
      })

      // RSSI -75 应该显示为 Good
      expect(wrapper.text()).toContain('Good')
    })

    it('应该正确显示网络类型标签颜色', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: true
        }
      })

      // 验证 getNetworkTypeColor 方法返回正确的颜色
      expect(wrapper.vm.getNetworkTypeColor('5G')).toBe('success')
      
      // 验证页面确实包含网络类型标签
      expect(wrapper.text()).toContain('5G')
    })

    it('应该正确显示时间戳', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: true
        }
      })

      expect(wrapper.text()).toContain('Last updated')
      // 检查日期格式化
      const expectedDate = new Date('2024-01-01T12:00:00Z').toLocaleString()
      expect(wrapper.text()).toContain(expectedDate)
    })
  })

  describe('边缘情况测试', () => {
    it('应该处理零值数据', () => {
      const zeroDataStatus = {
        ...mockModemStatus,
        rx_bytes: 0,
        tx_bytes: 0,
        rx_speed: 0,
        tx_speed: 0,
        rssi: 0
      }
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: zeroDataStatus,
          showDetails: true
        }
      })

      expect(wrapper.text()).toContain('0 B')
      expect(wrapper.text()).toContain('0 bps')
    })

    it('应该处理缺失字段', () => {
      const minimalStatus = {
        id: 1,
        device_id: 1,
        active_slot: 1,
        rx_bytes: 0,
        tx_bytes: 0,
        rx_speed: 0,
        tx_speed: 0,
        last_update: '2024-01-01T12:00:00Z'
      }
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: minimalStatus,
          showDetails: true
        }
      })

      // 组件应该正常渲染，只显示可用的信息
      expect(wrapper.find('.modem-details').exists()).toBe(true)
      expect(wrapper.text()).toContain('Data Usage')
    })

    it('应该处理极值', () => {
      const extremeStatus = {
        ...mockModemStatus,
        rssi: -120, // 非常弱的信号
        rx_bytes: 999999999999, // 很大的字节数
        rx_speed: 999999999999  // 很高的速度
      }
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: extremeStatus,
          showDetails: true
        }
      })

      // 应该正确处理极值而不崩溃
      expect(wrapper.find('.modem-details').exists()).toBe(true)
    })
  })

  describe('Props 验证', () => {
    it('应该接受正确的 props 类型', () => {
      const wrapper = mountComponent(ModemStatus, {
        props: {
          modemStatus: mockModemStatus,
          showDetails: true
        }
      })

      expect(wrapper.props('modemStatus')).toEqual(mockModemStatus)
      expect(wrapper.props('showDetails')).toBe(true)
    })

    it('应该使用默认 props 值', () => {
      const wrapper = mountComponent(ModemStatus)

      expect(wrapper.props('modemStatus')).toBeUndefined()
      expect(wrapper.props('showDetails')).toBe(false)
    })
  })
})