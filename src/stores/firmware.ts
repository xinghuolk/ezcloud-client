import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  FirmwareVersion, 
  FirmwareQuery, 
  CreateFirmwareParams, 
  UpdateFirmwareParams,
  SetCompatibilityParams,
  DeviceModel,
  FirmwareTestDevice,
  FirmwareTestProgress,
  AddTestDevicesParams
} from '/@src/api/types'
import { firmwareApi } from '/@src/api'
import { notyf } from '/@src/api/request'
import { extractErrorMessage } from '/@src/utils/error-handler'

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
  
  // 测试相关状态
  const testDevices = ref<Map<number, FirmwareTestDevice[]>>(new Map())
  const testProgress = ref<Map<number, FirmwareTestProgress>>(new Map())
  const testLoading = ref(false)

  // Getters
  const firmwareCount = computed(() => firmwareList.value.length)
  const draftFirmware = computed(() => firmwareList.value.filter(f => f.status === 'DRAFT'))
  const testingFirmware = computed(() => firmwareList.value.filter(f => f.status === 'TESTING'))
  const publishedFirmware = computed(() => firmwareList.value.filter(f => f.status === 'PUBLISHED'))
  const archivedFirmware = computed(() => firmwareList.value.filter(f => f.status === 'ARCHIVED'))
  const draftCount = computed(() => draftFirmware.value.length)
  const testingCount = computed(() => testingFirmware.value.length)
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
        // axios拦截器已处理错误提示
      }
    } catch (error) {
      console.error('Failed to fetch firmware list:', error)
      throw error
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
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Failed to get firmware details:', error)
      throw error
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
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Firmware upload failed:', error)
      throw error
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
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Update firmware failed:', error)
      throw error
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
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Status update failed:', error)
      throw error
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
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      console.error('Delete firmware failed:', error)
      throw error
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
        // axios拦截器已处理错误提示
        return []
      }
    } catch (error) {
      console.error('Failed to get compatibility settings:', error)
      throw error
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
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      console.error('Save compatibility settings failed:', error)
      throw error
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

  const getFirmwareByStatus = (status: 'DRAFT' | 'TESTING' | 'PUBLISHED' | 'ARCHIVED') => {
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

  // 测试相关方法
  const fetchTestDevices = async (firmwareId: number) => {
    testLoading.value = true
    try {
      const response = await firmwareApi.getTestDevices(firmwareId)
      if (response.success) {
        testDevices.value.set(firmwareId, response.data)
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return []
      }
    } catch (error) {
      console.error('Failed to get test devices:', error)
      throw error
    } finally {
      testLoading.value = false
    }
  }

  const addTestDevices = async (firmwareId: number, params: AddTestDevicesParams) => {
    testLoading.value = true
    try {
      const response = await firmwareApi.addTestDevices(firmwareId, params)
      if (response.success) {
        notyf.success(`Added ${response.data.added} test devices`)
        // 刷新测试设备列表
        await fetchTestDevices(firmwareId)
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Failed to add test devices:', error)
      // 重新抛出错误以便组件可以正确处理
      throw error
    } finally {
      testLoading.value = false
    }
  }

  const deleteTestDevice = async (firmwareId: number, serial: string) => {
    testLoading.value = true
    try {
      const response = await firmwareApi.deleteTestDevice(firmwareId, serial)
      if (response.success) {
        notyf.success('Test device removed')
        // 刷新测试设备列表
        await fetchTestDevices(firmwareId)
        return true
      } else {
        // axios拦截器已处理错误提示
        return false
      }
    } catch (error) {
      console.error('Failed to remove test device:', error)
      throw error
    } finally {
      testLoading.value = false
    }
  }

  const fetchTestProgress = async (firmwareId: number) => {
    try {
      const response = await firmwareApi.getTestProgress(firmwareId)
      if (response.success) {
        testProgress.value.set(firmwareId, response.data)
        return response.data
      } else {
        return null
      }
    } catch (error) {
      console.error('Failed to get test progress:', error)
      throw error
    }
  }

  const startTesting = async (firmwareId: number) => {
    loading.value = true
    try {
      const response = await firmwareApi.startTesting(firmwareId)
      if (response.success) {
        notyf.success('Testing started')
        // 更新固件状态
        const index = firmwareList.value.findIndex(f => f.id === firmwareId)
        if (index !== -1) {
          firmwareList.value[index].status = 'TESTING'
        }
        if (currentFirmware.value?.id === firmwareId) {
          currentFirmware.value.status = 'TESTING'
        }
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Failed to start testing:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const finishTesting = async (firmwareId: number, force = false) => {
    loading.value = true
    try {
      const response = await firmwareApi.finishTesting(firmwareId, force)
      if (response.success) {
        notyf.success('Testing completed, firmware returned to draft status')
        // 更新固件状态
        const index = firmwareList.value.findIndex(f => f.id === firmwareId)
        if (index !== -1) {
          firmwareList.value[index].status = 'DRAFT'
        }
        if (currentFirmware.value?.id === firmwareId) {
          currentFirmware.value.status = 'DRAFT'
        }
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Failed to finish testing:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const publishDirectly = async (firmwareId: number) => {
    loading.value = true
    try {
      const response = await firmwareApi.publishDirectly(firmwareId)
      if (response.success) {
        notyf.success('Firmware published directly')
        // 更新固件状态
        const index = firmwareList.value.findIndex(f => f.id === firmwareId)
        if (index !== -1) {
          firmwareList.value[index].status = 'PUBLISHED'
        }
        if (currentFirmware.value?.id === firmwareId) {
          currentFirmware.value.status = 'PUBLISHED'
        }
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Failed to publish firmware:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 删除了WebSocket事件处理方法，改为使用轮询获取状态

  return {
    // State
    firmwareList,
    currentFirmware,
    loading,
    uploading,
    pagination,
    testDevices,
    testProgress,
    testLoading,
    
    // Getters
    firmwareCount,
    draftFirmware,
    testingFirmware,
    publishedFirmware,
    archivedFirmware,
    draftCount,
    testingCount,
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
    
    // Test Actions
    fetchTestDevices,
    addTestDevices,
    deleteTestDevice,
    fetchTestProgress,
    startTesting,
    finishTesting,
    publishDirectly,
    
    // Utilities
    findFirmwareById,
    getFirmwareByStatus,
    getLatestPublishedFirmware
  }
})