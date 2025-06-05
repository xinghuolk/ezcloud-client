import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Device, DeviceQuery, PaginationResponse } from '@/api/types'
import { ElMessage } from 'element-plus'
import { deviceApi } from '@/api'

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

  // Actions
  const fetchDevices = async (query: DeviceQuery = {}) => {
    loading.value = true
    try {
      const response = await deviceApi.getDevices(query)
      if (response.success) {
        devices.value = response.data.devices
        pagination.value = response.data.pagination
      } else {
        ElMessage.error(response.message || 'Failed to fetch devices')
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error)
      ElMessage.error('Failed to fetch devices')
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
        ElMessage.error(response.message || 'Failed to fetch device details')
        return null
      }
    } catch (error) {
      console.error('Failed to fetch device details:', error)
      ElMessage.error('Failed to fetch device details')
      return null
    }
  }

  const bindDevice = async (serial: string) => {
    try {
      const response = await deviceApi.bindDevice({ serial })
      if (response.success) {
        ElMessage.success('Device bound successfully')
        // 刷新设备列表
        await fetchDevices()
        return true
      } else {
        ElMessage.error(response.message || 'Failed to bind device')
        return false
      }
    } catch (error) {
      console.error('Failed to bind device:', error)
      ElMessage.error('Failed to bind device')
      return false
    }
  }

  const unbindDevice = async (deviceId: number) => {
    try {
      const response = await deviceApi.unbindDevice(deviceId)
      if (response.success) {
        ElMessage.success('Device unbound successfully')
        // 从列表中移除设备或刷新列表
        await fetchDevices()
        return true
      } else {
        ElMessage.error(response.message || 'Failed to unbind device')
        return false
      }
    } catch (error) {
      console.error('Failed to unbind device:', error)
      ElMessage.error('Failed to unbind device')
      return false
    }
  }

  const updateDeviceName = async (deviceId: number, name: string) => {
    try {
      const response = await deviceApi.updateDevice(deviceId, { name })
      if (response.success) {
        ElMessage.success('Device name updated successfully')
        // 更新本地数据
        const device = devices.value.find(d => d.id === deviceId)
        if (device) {
          device.name = name
        }
        if (currentDevice.value && currentDevice.value.id === deviceId) {
          currentDevice.value.name = name
        }
        return true
      } else {
        ElMessage.error(response.message || 'Failed to update device name')
        return false
      }
    } catch (error) {
      console.error('Failed to update device name:', error)
      ElMessage.error('Failed to update device name')
      return false
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
    
    // Actions
    fetchDevices,
    fetchDeviceDetails,
    bindDevice,
    unbindDevice,
    updateDeviceName,
    clearDevices
  }
}) 