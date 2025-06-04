import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { modelApi, type DeviceModel, type ModelCreateParams, type ModelListParams } from '@/api/models'

export const useModelsStore = defineStore('models', () => {
  // 状态
  const models = ref<DeviceModel[]>([])
  const loading = ref(false)
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })
  const searchParams = ref<ModelListParams>({
    page: 1,
    limit: 10
  })

  // 计算属性
  const hasModels = computed(() => models.value.length > 0)
  const isEmpty = computed(() => !loading.value && models.value.length === 0)

  // 获取型号列表
  const fetchModels = async (params?: Partial<ModelListParams>) => {
    loading.value = true
    try {
      const finalParams = { ...searchParams.value, ...params }
      const response = await modelApi.getModels(finalParams)
      
      if (response.success) {
        models.value = response.data.models
        pagination.value = response.data.pagination
        searchParams.value = finalParams
      } else {
        ElMessage.error(response.message || '获取型号列表失败')
      }
    } catch (error) {
      console.error('获取型号列表失败:', error)
      ElMessage.error('获取型号列表失败')
    } finally {
      loading.value = false
    }
  }

  // 创建型号
  const createModel = async (data: ModelCreateParams): Promise<boolean> => {
    try {
      const response = await modelApi.createModel(data)
      if (response.success) {
        ElMessage.success('型号创建成功')
        // 刷新列表
        await fetchModels()
        return true
      } else {
        ElMessage.error(response.message || '创建型号失败')
        return false
      }
    } catch (error: any) {
      console.error('创建型号失败:', error)
      const message = error.response?.data?.message || '创建型号失败'
      ElMessage.error(message)
      return false
    }
  }

  // 更新型号
  const updateModel = async (id: number, data: ModelCreateParams): Promise<boolean> => {
    try {
      const response = await modelApi.updateModel(id, data)
      if (response.success) {
        ElMessage.success('型号更新成功')
        // 刷新列表
        await fetchModels()
        return true
      } else {
        ElMessage.error(response.message || '更新型号失败')
        return false
      }
    } catch (error: any) {
      console.error('更新型号失败:', error)
      const message = error.response?.data?.message || '更新型号失败'
      ElMessage.error(message)
      return false
    }
  }

  // 删除型号
  const deleteModel = async (id: number): Promise<boolean> => {
    try {
      const response = await modelApi.deleteModel(id)
      if (response.success) {
        ElMessage.success('型号删除成功')
        // 刷新列表
        await fetchModels()
        return true
      } else {
        ElMessage.error(response.message || '删除型号失败')
        return false
      }
    } catch (error: any) {
      console.error('删除型号失败:', error)
      const message = error.response?.data?.message || '删除型号失败'
      ElMessage.error(message)
      return false
    }
  }

  // 获取型号详情
  const getModel = async (id: number): Promise<DeviceModel | null> => {
    try {
      const response = await modelApi.getModel(id)
      if (response.success) {
        return response.data
      } else {
        ElMessage.error(response.message || '获取型号详情失败')
        return null
      }
    } catch (error) {
      console.error('获取型号详情失败:', error)
      ElMessage.error('获取型号详情失败')
      return null
    }
  }

  // 搜索和筛选
  const searchModels = async (params: Partial<ModelListParams>) => {
    await fetchModels({ ...params, page: 1 })
  }

  // 分页
  const changePageAndSize = async (page: number, limit?: number) => {
    await fetchModels({ 
      page, 
      limit: limit || searchParams.value.limit 
    })
  }

  // 重置搜索
  const resetSearch = async () => {
    searchParams.value = { page: 1, limit: 10 }
    await fetchModels()
  }

  // 刷新列表
  const refreshModels = async () => {
    await fetchModels()
  }

  return {
    // 状态
    models,
    loading,
    pagination,
    searchParams,
    
    // 计算属性
    hasModels,
    isEmpty,
    
    // 方法
    fetchModels,
    createModel,
    updateModel,
    deleteModel,
    getModel,
    searchModels,
    changePageAndSize,
    resetSearch,
    refreshModels
  }
}) 