import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  FirmwareVersion, 
  FirmwareQuery, 
  CreateFirmwareParams, 
  UpdateFirmwareParams,
  SetCompatibilityParams,
  DeviceModel 
} from '/@src/api/types'
import { Notyf } from 'notyf'
import { firmwareApi } from '/@src/api'
import { extractErrorMessage } from '/@src/utils/error-utils'

const notyf = new Notyf()

export const useFirmwareStore = defineStore('firmware', () => {
  // State
  const firmwareList = ref<FirmwareVersion[]>([])
  const currentFirmware = ref<FirmwareVersion | null>(null)
  const loading = ref(false)
  const uploading = ref(false)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Getters
  const firmwareCount = computed(() => firmwareList.value.length)
  const draftFirmware = computed(() => firmwareList.value.filter(f => f.status === 'DRAFT'))
  const publishedFirmware = computed(() => firmwareList.value.filter(f => f.status === 'PUBLISHED'))
  const archivedFirmware = computed(() => firmwareList.value.filter(f => f.status === 'ARCHIVED'))
  const draftCount = computed(() => draftFirmware.value.length)
  const publishedCount = computed(() => publishedFirmware.value.length)
  const archivedCount = computed(() => archivedFirmware.value.length)

  // 按版本号排序的固件列表
  const sortedFirmware = computed(() => {
    return [...firmwareList.value].sort((a, b) => {
      // 简单的版本号比较（假设格式为 x.y.z）
      const parseVersion = (version: string) => {
        return version.split('.').map(num => parseInt(num) || 0)
      }
      
      const versionA = parseVersion(a.version)
      const versionB = parseVersion(b.version)
      
      for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
        const numA = versionA[i] || 0
        const numB = versionB[i] || 0
        if (numA !== numB) {
          return numB - numA // 降序排列，最新版本在前
        }
      }
      return 0
    })
  })

  // Actions
  const fetchFirmwareList = async (query: FirmwareQuery = {}) => {
    loading.value = true
    try {
      const response = await firmwareApi.list(query)
      if (response.success) {
        firmwareList.value = response.data.firmware
        pagination.value = response.data.pagination
      } else {
        notyf.error(response.message || 'Failed to fetch firmware list')
      }
    } catch (error) {
      console.error('Failed to fetch firmware list:', error)
      notyf.error(extractErrorMessage(error, 'Failed to fetch firmware list'))
    } finally {
      loading.value = false
    }
  }

  const fetchFirmwareDetail = async (id: number) => {
    loading.value = true
    try {
      const response = await firmwareApi.get(id)
      if (response.success) {
        currentFirmware.value = response.data
        return response.data
      } else {
        notyf.error(response.message || 'Failed to get firmware details')
        return null
      }
    } catch (error) {
      console.error('Failed to get firmware details:', error)
      notyf.error(extractErrorMessage(error, 'Failed to get firmware details'))
      return null
    } finally {
      loading.value = false
    }
  }

  const uploadFirmware = async (file: File, params: CreateFirmwareParams) => {
    uploading.value = true
    try {
      const response = await firmwareApi.upload(file, params)
      if (response.success) {
        // 返回数据，让页面组件处理成功提示和列表刷新
        return response.data
      } else {
        notyf.error(response.message || 'Firmware upload failed')
        return null
      }
    } catch (error) {
      console.error('Firmware upload failed:', error)
      notyf.error(extractErrorMessage(error, 'Firmware upload failed'))
      return null
    } finally {
      uploading.value = false
    }
  }

  const updateFirmware = async (id: number, params: UpdateFirmwareParams) => {
    loading.value = true
    try {
      const response = await firmwareApi.update(id, params)
      if (response.success) {
        notyf.success('Firmware information updated')
        // 更新本地数据
        const index = firmwareList.value.findIndex(f => f.id === id)
        if (index !== -1) {
          firmwareList.value[index] = response.data
        }
        if (currentFirmware.value?.id === id) {
          currentFirmware.value = response.data
        }
        return response.data
      } else {
        notyf.error(response.message || 'Update failed')
        return null
      }
    } catch (error) {
      console.error('Update firmware failed:', error)
      notyf.error(extractErrorMessage(error, 'Update failed'))
      return null
    } finally {
      loading.value = false
    }
  }

  const updateFirmwareStatus = async (id: number, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    loading.value = true
    try {
      const response = await firmwareApi.updateStatus(id, status)
      if (response.success) {
        const statusText = status === 'PUBLISHED' ? 'Published' : status === 'ARCHIVED' ? 'Archived' : 'Draft'
        notyf.success(`Firmware status updated to ${statusText}`)
        // 更新本地数据
        const index = firmwareList.value.findIndex(f => f.id === id)
        if (index !== -1) {
          firmwareList.value[index] = response.data
        }
        if (currentFirmware.value?.id === id) {
          currentFirmware.value = response.data
        }
        return response.data
      } else {
        notyf.error(response.message || 'Status update failed')
        return null
      }
    } catch (error) {
      console.error('Status update failed:', error)
      notyf.error(extractErrorMessage(error, 'Status update failed'))
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteFirmware = async (id: number) => {
    loading.value = true
    try {
      const response = await firmwareApi.delete(id)
      if (response.success) {
        notyf.success('Firmware deleted')
        // 从本地列表中移除
        const index = firmwareList.value.findIndex(f => f.id === id)
        if (index !== -1) {
          firmwareList.value.splice(index, 1)
        }
        if (currentFirmware.value?.id === id) {
          currentFirmware.value = null
        }
        return true
      } else {
        notyf.error(response.message || 'Delete failed')
        return false
      }
    } catch (error) {
      console.error('Delete firmware failed:', error)
      notyf.error(extractErrorMessage(error, 'Delete failed'))
      return false
    } finally {
      loading.value = false
    }
  }

  const getCompatibility = async (id: number): Promise<DeviceModel[]> => {
    loading.value = true
    try {
      const response = await firmwareApi.getCompatibility(id)
      if (response.success) {
        return response.data
      } else {
        notyf.error(response.message || 'Failed to get compatibility settings')
        return []
      }
    } catch (error) {
      console.error('Failed to get compatibility settings:', error)
      notyf.error(extractErrorMessage(error, 'Failed to get compatibility settings'))
      return []
    } finally {
      loading.value = false
    }
  }

  const setCompatibility = async (id: number, params: SetCompatibilityParams) => {
    loading.value = true
    try {
      const response = await firmwareApi.setCompatibility(id, params)
      if (response.success) {
        notyf.success('Compatibility settings saved')
        // 刷新固件详情以获取最新的兼容性信息
        await fetchFirmwareDetail(id)
        return true
      } else {
        notyf.error(response.message || 'Save failed')
        return false
      }
    } catch (error) {
      console.error('Save compatibility settings failed:', error)
      notyf.error(extractErrorMessage(error, 'Save failed'))
      return false
    } finally {
      loading.value = false
    }
  }

  // 重置状态
  const resetState = () => {
    firmwareList.value = []
    currentFirmware.value = null
    loading.value = false
    uploading.value = false
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
  }

  // 工具函数
  const findFirmwareById = (id: number) => {
    return firmwareList.value.find(f => f.id === id) || null
  }

  const getFirmwareByStatus = (status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    return firmwareList.value.filter(f => f.status === status)
  }

  const getLatestPublishedFirmware = () => {
    const published = publishedFirmware.value
    if (published.length === 0) return null
    
    // 返回版本号最高的已发布固件
    return published.reduce((latest, current) => {
      const parseVersion = (version: string) => {
        return version.split('.').map(num => parseInt(num) || 0)
      }
      
      const latestVersion = parseVersion(latest.version)
      const currentVersion = parseVersion(current.version)
      
      for (let i = 0; i < Math.max(latestVersion.length, currentVersion.length); i++) {
        const latestNum = latestVersion[i] || 0
        const currentNum = currentVersion[i] || 0
        if (currentNum > latestNum) {
          return current
        } else if (latestNum > currentNum) {
          return latest
        }
      }
      return latest
    })
  }

  return {
    // State
    firmwareList,
    currentFirmware,
    loading,
    uploading,
    pagination,
    
    // Getters
    firmwareCount,
    draftFirmware,
    publishedFirmware,
    archivedFirmware,
    draftCount,
    publishedCount,
    archivedCount,
    sortedFirmware,
    
    // Actions
    fetchFirmwareList,
    fetchFirmwareDetail,
    uploadFirmware,
    updateFirmware,
    updateFirmwareStatus,
    deleteFirmware,
    getCompatibility,
    setCompatibility,
    resetState,
    
    // Utilities
    findFirmwareById,
    getFirmwareByStatus,
    getLatestPublishedFirmware
  }
})