import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Device, DeviceQuery, DeviceTrustParams, DeviceTrustUpdateParams, DeviceTrusted } from '/@src/api/types'
import { deviceApi } from '/@src/api'
import { notyf } from '/@src/api/request'

export const useDeviceStore = defineStore('devices', () => {
  // State
  const devices = ref<Device[]>([])
  const currentDevice = ref<Device | null>(null)
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  // Getters
  const deviceCount = computed(() => devices.value.length)
  const onlineDevices = computed(() => devices.value.filter(device => device.is_online))
  const offlineDevices = computed(() => devices.value.filter(device => !device.is_online))
  const activatedDevices = computed(() => devices.value.filter(device => device.is_activate))
  const onlineCount = computed(() => onlineDevices.value.length)
  const offlineCount = computed(() => offlineDevices.value.length)
  const activatedCount = computed(() => activatedDevices.value.length)
  
  // 托管设备相关的计算属性
  const ownedDevices = computed(() => devices.value.filter(device => device.ownership?.isOwner))
  const trustedDevices = computed(() => devices.value.filter(device => device.ownership?.isTrusted))
  const ownedCount = computed(() => ownedDevices.value.length)
  const trustedCount = computed(() => trustedDevices.value.length)

  // Actions
  const fetchDevices = async (query: DeviceQuery = {}) => {
    loading.value = true
    try {
      const response = await deviceApi.getDevices(query)
      if (response.success) {
        devices.value = response.data.devices
        pagination.value = response.data.pagination
      } else {
        // axios拦截器已处理错误提示
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    } finally {
      loading.value = false
    }
  }

  const fetchDeviceDetails = async (deviceId: number) => {
    try {
      const response = await deviceApi.getDevice(deviceId)
      
      if (response.success) {
        currentDevice.value = response.data
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      throw error
    }
  }

  const bindDevice = async (serial: string) => {
    try {
      const response = await deviceApi.bindDevice({ serial })
      if (response.success) {
        notyf.success('Device bound successfully')
        // Refresh device list
        await fetchDevices()
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const unbindDevice = async (deviceId: number) => {
    try {
      const response = await deviceApi.unbindDevice(deviceId)
      if (response.success) {
        notyf.success('Device unbound successfully')
        // Remove device from list or refresh list
        await fetchDevices()
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const updateDeviceName = async (deviceId: number, name: string) => {
    try {
      const response = await deviceApi.updateDevice(deviceId, { name })
      if (response.success) {
        notyf.success('Device name updated successfully')
        // Update local data
        const device = devices.value.find(d => d.id === deviceId)
        if (device) {
          device.name = name
        }
        if (currentDevice.value && currentDevice.value.id === deviceId) {
          currentDevice.value.name = name
        }
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const rebootDevice = async (deviceId: number) => {
    try {
      const response = await deviceApi.rebootDevice(deviceId)
      if (response.success) {
        notyf.success('Device reboot command sent successfully')
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const switchSIM = async (deviceId: number, slot: number) => {
    try {
      const response = await deviceApi.switchSIM(deviceId, slot)
      if (response.success) {
        notyf.success(`SIM switch to slot ${slot} command sent successfully`)
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const collectLogs = async (deviceId: number, params?: { types?: string[]; duration?: number }) => {
    try {
      const response = await deviceApi.collectLogs(deviceId, params)
      if (response.success) {
        notyf.success('Log collection command sent successfully')
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const batchOperation = async (deviceIds: number[], operation: string, parameters?: Record<string, any>) => {
    try {
      const response = await deviceApi.batchOperation({
        device_ids: deviceIds,
        operation: { type: operation as any, params: parameters }
      })
      if (response.success) {
        notyf.success(`Batch ${operation} command sent successfully to ${deviceIds.length} devices`)
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const clearDevices = () => {
    devices.value = []
    currentDevice.value = null
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    }
  }

  const setCurrentDevice = (device: Device | null) => {
    currentDevice.value = device
  }

  const updateDeviceInList = (deviceId: number, updates: Partial<Device>) => {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      Object.assign(device, updates)
    }
    if (currentDevice.value && currentDevice.value.id === deviceId) {
      Object.assign(currentDevice.value, updates)
    }
  }

  // 设备托管相关Actions
  const trustDevice = async (deviceId: number, params: DeviceTrustParams) => {
    try {
      const response = await deviceApi.trustDevice(deviceId, params)
      if (response.success) {
        notyf.success('Device trust granted successfully')
        // 可选择刷新设备列表或更新本地数据
        await fetchDeviceDetails(deviceId)
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const untrustDevice = async (deviceId: number, userId: number) => {
    try {
      const response = await deviceApi.untrustDevice(deviceId, userId)
      if (response.success) {
        notyf.success('Device trust revoked successfully')
        // 刷新设备详情
        await fetchDeviceDetails(deviceId)
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const getDeviceTrustees = async (deviceId: number) => {
    try {
      const response = await deviceApi.getDeviceTrustees(deviceId)
      if (response.success) {
        return response.data.trustees
      } else {
        // axios拦截器已处理错误提示
        return []
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  const updateDeviceTrust = async (deviceId: number, userId: number, params: DeviceTrustUpdateParams) => {
    try {
      const response = await deviceApi.updateDeviceTrust(deviceId, userId, params)
      if (response.success) {
        notyf.success('Device trust relationship updated successfully')
        // 刷新设备详情
        await fetchDeviceDetails(deviceId)
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      // Error already handled by axios interceptor
      throw error
    }
  }

  // 获取包含托管设备的设备列表
  const fetchDevicesWithTrusted = async (query: DeviceQuery = {}) => {
    return fetchDevices({ ...query, include_trusted: true })
  }

  return {
    // State
    devices,
    currentDevice,
    loading,
    pagination,
    
    // Getters
    deviceCount,
    onlineDevices,
    offlineDevices,
    activatedDevices,
    onlineCount,
    offlineCount,
    activatedCount,
    ownedDevices,
    trustedDevices,
    ownedCount,
    trustedCount,
    
    // Actions
    fetchDevices,
    fetchDeviceDetails,
    bindDevice,
    unbindDevice,
    updateDeviceName,
    rebootDevice,
    switchSIM,
    collectLogs,
    batchOperation,
    clearDevices,
    setCurrentDevice,
    updateDeviceInList,
    // 托管相关Actions
    trustDevice,
    untrustDevice,
    getDeviceTrustees,
    updateDeviceTrust,
    fetchDevicesWithTrusted
  }
})