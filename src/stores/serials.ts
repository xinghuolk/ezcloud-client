import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { serialsApi, type SerialNumber, type BatchInfo, type SerialGenerateRequest } from '@/api/serials'
import { ElMessage, ElMessageBox } from 'element-plus'

export const useSerialsStore = defineStore('serials', () => {
  // 状态数据
  const serials = ref<SerialNumber[]>([])
  const batches = ref<BatchInfo[]>([])
  const currentBatch = ref<string>('')
  const loading = ref(false)
  const generating = ref(false)
  
  // 分页信息
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const batchPagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // 筛选条件
  const filters = ref({
    batch_id: '',
    model_id: undefined as number | undefined,
    status: '',
    search: ''
  })

  // 计算属性
  const totalSerials = computed(() => serials.value.length)
  const unusedCount = computed(() => serials.value.filter(s => s.status === 'unused').length)
  const boundCount = computed(() => serials.value.filter(s => s.status === 'bound').length)
  const activatedCount = computed(() => serials.value.filter(s => s.status === 'activated').length)

  // 获取序列号列表
  const fetchSerials = async (params?: {
    page?: number
    limit?: number
    batch_id?: string
    model_id?: number
    status?: string
    search?: string
  }) => {
    try {
      loading.value = true
      
      const queryParams = {
        page: params?.page || pagination.value.page,
        limit: params?.limit || pagination.value.limit,
        batch_id: params?.batch_id || filters.value.batch_id,
        model_id: params?.model_id || filters.value.model_id,
        status: params?.status || filters.value.status,
        search: params?.search || filters.value.search
      }

      // 清理空值参数
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key as keyof typeof queryParams] === '' || 
            queryParams[key as keyof typeof queryParams] === undefined) {
          delete queryParams[key as keyof typeof queryParams]
        }
      })

      const response = await serialsApi.getList(queryParams)
      
      if (response.success) {
        serials.value = response.data.serials
        pagination.value = response.data.pagination
      }
    } catch (error) {
      console.error('获取序列号列表失败:', error)
      ElMessage.error('获取序列号列表失败')
    } finally {
      loading.value = false
    }
  }

  // 获取批次列表
  const fetchBatches = async (params?: { page?: number; limit?: number }) => {
    try {
      loading.value = true
      
      const queryParams = {
        page: params?.page || batchPagination.value.page,
        limit: params?.limit || batchPagination.value.limit
      }

      const response = await serialsApi.getBatches(queryParams)
      
      if (response.success) {
        batches.value = response.data.batches
        batchPagination.value = response.data.pagination
      }
    } catch (error) {
      console.error('获取批次列表失败:', error)
      ElMessage.error('获取批次列表失败')
    } finally {
      loading.value = false
    }
  }

  // 获取批次详情
  const fetchBatchDetail = async (batchId: string, params?: { page?: number; limit?: number }) => {
    try {
      loading.value = true
      currentBatch.value = batchId
      
      const queryParams = {
        page: params?.page || 1,
        limit: params?.limit || 50
      }

      const response = await serialsApi.getBatchDetail(batchId, queryParams)
      
      if (response.success) {
        serials.value = response.data.serials
        pagination.value = response.data.pagination
      }
    } catch (error) {
      console.error('获取批次详情失败:', error)
      ElMessage.error('获取批次详情失败')
    } finally {
      loading.value = false
    }
  }

  // 批量生成序列号
  const generateSerials = async (data: SerialGenerateRequest) => {
    try {
      generating.value = true
      
      // 先检查MAC地址冲突
      const conflictCheck = await serialsApi.checkConflicts({
        mac_start: data.mac_start,
        count: data.count,
        mac_count: data.mac_count || 4,
        mac_interval: data.mac_interval || 1
      })

      if (conflictCheck.data.hasConflict) {
        const conflicts = conflictCheck.data.conflicts
        const conflictMessage = conflicts.map(c => 
          `序列号 ${c.serial}: ${c.overlap_start} ~ ${c.overlap_end}`
        ).join('\n')
        
        await ElMessageBox.confirm(
          `检测到MAC地址冲突：\n${conflictMessage}\n\n是否仍要继续生成？`,
          'MAC地址冲突警告',
          {
            type: 'warning',
            confirmButtonText: '继续生成',
            cancelButtonText: '取消'
          }
        )
      }

      const response = await serialsApi.generate(data)
      
      if (response.success) {
        ElMessage.success(`成功生成 ${response.data.count} 个序列号，批次ID: ${response.data.batch_id}`)
        
        // 刷新批次列表
        await fetchBatches()
        
        return response.data
      }
    } catch (error: any) {
      if (error === 'cancel') {
        return // 用户取消操作
      }
      
      console.error('生成序列号失败:', error)
      
      if (error.response?.data?.message) {
        ElMessage.error(error.response.data.message)
      } else {
        ElMessage.error('生成序列号失败')
      }
      throw error
    } finally {
      generating.value = false
    }
  }

  // 删除批次
  const deleteBatch = async (batchId: string) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除这个批次吗？只能删除所有序列号都未使用的批次。',
        '删除批次确认',
        {
          type: 'warning',
          confirmButtonText: '确定删除',
          cancelButtonText: '取消'
        }
      )

      const response = await serialsApi.deleteBatch(batchId)
      
      if (response.success) {
        ElMessage.success(`成功删除批次，共删除 ${response.data.deleted_count} 个序列号`)
        
        // 刷新批次列表
        await fetchBatches()
        
        // 如果当前正在查看被删除的批次，清空序列号列表
        if (currentBatch.value === batchId) {
          serials.value = []
          currentBatch.value = ''
        }
      }
    } catch (error: any) {
      if (error === 'cancel') {
        return // 用户取消操作
      }
      
      console.error('删除批次失败:', error)
      
      if (error.response?.data?.message) {
        ElMessage.error(error.response.data.message)
      } else {
        ElMessage.error('删除批次失败')
      }
    }
  }

  // 导出Excel
  const exportExcel = async (params: {
    batch_id?: string
    model_id?: number
    status?: string
  } = {}) => {
    try {
      loading.value = true
      
      const blob = await serialsApi.exportExcel(params)
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '')
      let filename = `serials_${timestamp}.xlsx`
      
      if (params.batch_id) {
        filename = `batch_${params.batch_id}_${timestamp}.xlsx`
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // 清理
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('Excel文件导出成功')
    } catch (error) {
      console.error('导出Excel失败:', error)
      ElMessage.error('导出Excel失败')
    } finally {
      loading.value = false
    }
  }

  // 更新筛选条件
  const updateFilters = (newFilters: Partial<typeof filters.value>) => {
    Object.assign(filters.value, newFilters)
    pagination.value.page = 1 // 重置到第一页
  }

  // 清空筛选条件
  const clearFilters = () => {
    filters.value = {
      batch_id: '',
      model_id: undefined,
      status: '',
      search: ''
    }
    pagination.value.page = 1
  }

  // 重置状态
  const reset = () => {
    serials.value = []
    batches.value = []
    currentBatch.value = ''
    pagination.value = { page: 1, limit: 20, total: 0, totalPages: 0 }
    batchPagination.value = { page: 1, limit: 20, total: 0, totalPages: 0 }
    clearFilters()
  }

  // 导出序列号（为了保持API一致性，重命名exportExcel为exportSerials）
  const exportSerials = async (params: {
    batch_id?: string
    model_id?: number
    status?: string
  } = {}) => {
    return await exportExcel(params)
  }

  // 搜索序列号（封装带筛选条件的fetchSerials）
  const searchSerials = async (searchFilters: {
    search?: string
    status?: string
    model_id?: number
  }) => {
    updateFilters(searchFilters)
    await fetchSerials({
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    })
  }

  // 重置筛选条件并刷新数据
  const resetFilters = async () => {
    clearFilters()
    await fetchSerials({
      page: pagination.value.page,
      limit: pagination.value.limit
    })
  }

  // 改变页码和页面大小
  const changePageAndSize = async (page: number, size?: number) => {
    pagination.value.page = page
    if (size) {
      pagination.value.limit = size
    }
    await fetchSerials({
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...filters.value
    })
  }

  // 改变批次页码
  const changeBatchPage = async (page: number) => {
    batchPagination.value.page = page
    await fetchBatches({
      page: batchPagination.value.page,
      limit: batchPagination.value.limit
    })
  }

  return {
    // 状态
    serials,
    batches,
    currentBatch,
    loading,
    generating,
    pagination,
    batchPagination,
    filters,
    
    // 计算属性
    totalSerials,
    unusedCount,
    boundCount,
    activatedCount,
    
    // 方法
    fetchSerials,
    fetchBatches,
    fetchBatchDetail,
    generateSerials,
    deleteBatch,
    exportExcel,
    exportSerials, // 添加新方法
    searchSerials, // 添加新方法
    resetFilters, // 添加新方法
    changePageAndSize, // 添加新方法
    changeBatchPage, // 添加新方法
    updateFilters,
    clearFilters,
    reset
  }
}) 