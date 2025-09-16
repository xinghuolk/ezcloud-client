import { ref, computed } from 'vue'
import { useDeviceStore } from '/@src/stores/devices'
import { useUserSession } from '/@src/stores/user-session'
import type { Device, DeviceQuery } from '/@src/api/types'
import { deviceApi } from '/@src/api'
import { notyf } from '/@src/api/request'

export const useDeviceManagement = () => {
  const deviceStore = useDeviceStore()
  const userSession = useUserSession()
  
  // 状态
  const loading = ref(false)
  const devices = computed(() => deviceStore.devices)
  const pagination = computed(() => deviceStore.pagination)
  
  // 统计数据
  const deviceCount = computed(() => deviceStore.deviceCount)
  const onlineCount = computed(() => deviceStore.onlineCount)
  const ownedCount = computed(() => {
    if (!devices.value) return 0
    return devices.value.filter(device => device.is_owner).length
  })
  const trustedCount = computed(() => {
    if (!devices.value) return 0
    return devices.value.filter(device => device.is_trusted).length
  })
  
  // 搜索防抖
  let searchTimeout: NodeJS.Timeout | null = null
  
  // 核心方法
  const fetchDevices = async (query?: DeviceQuery) => {
    loading.value = true
    try {
      await deviceStore.fetchDevices(query)
    } catch (error) {
      console.error('Failed to fetch devices:', error)
      notyf.error('Failed to load devices')
      throw error
    } finally {
      loading.value = false
    }
  }
  
  const bindDevice = async (serial: string) => {
    try {
      const success = await deviceStore.bindDevice(serial)
      if (success) {
        notyf.success('Device bound successfully')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to bind device:', error)
      notyf.error('Failed to bind device')
      return false
    }
  }
  
  const unbindDevice = async (deviceId: number) => {
    try {
      const success = await deviceStore.unbindDevice(deviceId)
      if (success) {
        notyf.success('Device unbound successfully')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to unbind device:', error)
      notyf.error('Failed to unbind device')
      return false
    }
  }
  
  const batchOperation = async (deviceIds: number[], operation: string, params?: any) => {
    try {
      await deviceStore.batchOperation(deviceIds, operation, params)
      notyf.success('Batch operation completed successfully')
      return true
    } catch (error) {
      console.error('Failed to perform batch operation:', error)
      notyf.error('Failed to perform batch operation')
      return false
    }
  }
  
  const rebootDevice = async (deviceId: number) => {
    try {
      const response = await deviceApi.rebootDevice(deviceId)
      if (response.success) {
        notyf.success('Reboot command sent successfully')
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to reboot device:', error)
      notyf.error('Failed to reboot device')
      return false
    }
  }
  
  const trustDevice = async (deviceId: number, trust: boolean) => {
    try {
      const response = await deviceApi.trustDevice(deviceId, trust)
      if (response.success) {
        notyf.success(`Device ${trust ? 'trusted' : 'untrusted'} successfully`)
        await fetchDevices() // Refresh list
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update device trust:', error)
      notyf.error('Failed to update device trust')
      return false
    }
  }
  
  // 搜索防抖处理
  const searchWithDebounce = (query: DeviceQuery, callback: () => void) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    searchTimeout = setTimeout(() => {
      callback()
    }, 500)
  }
  
  return {
    // 状态
    loading,
    devices,
    pagination,
    // 统计
    deviceCount,
    onlineCount,
    ownedCount,
    trustedCount,
    // 方法
    fetchDevices,
    bindDevice,
    unbindDevice,
    batchOperation,
    rebootDevice,
    trustDevice,
    searchWithDebounce
  }
}