<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { serialApi, modelApi } from '/@src/api'
import type { SerialNumber, GenerateSerialParams, DeviceModel } from '/@src/api/types'
import { notyf } from '/@src/api/request'
import { formatDateTime } from '/@src/utils/date-formatter'
import { useFormErrorHandler } from '/@src/composables/use-error-handler'

definePage({
  meta: {
    requiresAuth: true,
    requiresAdmin: true
  }
})

const router = useRouter()

// Error handling
const { createFormErrors, clearFormErrors, setFieldError, handleError, showSuccess } = useFormErrorHandler()
const generateErrors = createFormErrors()

// State
const loading = ref(false)
const generating = ref(false)
const serials = ref<SerialNumber[]>([])
const batches = ref<any[]>([])
const models = ref<DeviceModel[]>([])
const currentBatch = ref('')

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Dialog controls
const generateDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const batchDetailDialogVisible = ref(false)
const deleteBatchConfirmOpen = ref(false)
const selectedSerial = ref<SerialNumber | null>(null)
const selectedBatch = ref<any>(null)
const selectedBatchForDelete = ref<string>('')

// Generate form
const generateForm = reactive<GenerateSerialParams>({
  model_id: 0,
  count: 10,
  mac_start: '',
  mac_count: 1,
  mac_interval: 1,
  mode: 'auto',
  custom_start_serial: ''
})

// Search form
const searchForm = reactive({
  batch_id: '',
  status: '',
  model_id: 0
})

// Pagination
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// Statistics
const stats = reactive({
  totalSerials: 0,
  unusedCount: 0,
  boundCount: 0,
  activatedCount: 0
})

// Validation errors (now handled by new architecture)

// 动态列配置
const tableColumns = computed(() => {
  const baseColumns: Record<string, any> = {
    serial: { 
      label: 'Serial Number', 
      searchable: true,
      sortable: true,
      bold: true,
      grow: true
    },
    batch_id: { 
      label: 'Batch ID', 
      searchable: true,
      sortable: true
    },
    mac_info: { 
      label: 'MAC Info',
      grow: 'lg' as const
    },
    status: { 
      label: 'Status', 
      searchable: true,
      sortable: true,
      align: 'center' as const
    },
    created_at: { 
      label: 'Created At', 
      sortable: true
    },
    actions: { 
      label: 'Actions',
      align: 'end' as const
    }
  }
  
  // 只有在虚拟批次中才显示设备型号列
  if (currentBatch.value === VIRTUAL_AUTO_REGISTERED_ID) {
    return {
      ...baseColumns,
      device_model: {
        label: 'Device Model',
        searchable: true,
        sortable: true
      }
    }
  }
  
  return baseColumns
})

// Computed
const filteredSerials = computed(() => {
  if (!currentBatch.value) return serials.value
  
  // 处理虚拟批次ID的特殊情况
  if (currentBatch.value === VIRTUAL_AUTO_REGISTERED_ID) {
    // 对于虚拟批次，我们显示所有 batch_id 为 AUTO_REGISTERED_DEVICES 的序列号
    return serials.value.filter(s => s.batch_id === AUTO_REGISTERED_BATCH_NAME)
  }
  
  // 处理普通批次
  return serials.value.filter(s => s.batch_id === currentBatch.value)
})

// 排序后的序列号列表 - 虚拟批次按设备型号分组
const sortedFilteredSerials = computed(() => {
  const filtered = filteredSerials.value
  
  // 如果是虚拟批次，按设备型号排序分组
  if (currentBatch.value === VIRTUAL_AUTO_REGISTERED_ID) {
    return [...filtered].sort((a, b) => {
      // 首先按设备型号排序
      const modelA = (a.deviceModel || a.device_model)
      const modelB = (b.deviceModel || b.device_model)
      
      if (modelA && modelB) {
        const modelCompare = `${modelA.oemname} ${modelA.stdname}`.localeCompare(`${modelB.oemname} ${modelB.stdname}`)
        if (modelCompare !== 0) return modelCompare
      } else if (modelA && !modelB) {
        return -1
      } else if (!modelA && modelB) {
        return 1
      }
      
      // 然后按序列号排序
      return a.serial.localeCompare(b.serial)
    })
  }
  
  // 普通批次按序列号排序
  return [...filtered].sort((a, b) => a.serial.localeCompare(b.serial))
})

// AUTO_REGISTERED_DEVICES批次合并逻辑
const AUTO_REGISTERED_BATCH_NAME = 'AUTO_REGISTERED_DEVICES'
const VIRTUAL_AUTO_REGISTERED_ID = 'VIRTUAL_AUTO_REGISTERED'

// 收集所有自动注册批次的真实ID
const autoRegisteredBatchIds = computed(() => {
  return batches.value
    .filter(batch => batch.batch_id === AUTO_REGISTERED_BATCH_NAME)
    .map(batch => batch.id || batch.batch_id) // 尝试获取真实的唯一ID，回退到batch_id
})

// 获取所有自动注册批次记录
const autoRegisteredBatches = computed(() => {
  return batches.value.filter(batch => batch.batch_id === AUTO_REGISTERED_BATCH_NAME)
})

// 生成序列号格式示例
const serialFormatExample = computed(() => {
  if (!generateForm.model_id || generateForm.model_id === 0) {
    return 'Please select a device model first'
  }
  
  const selectedModel = models.value.find(m => m.id === generateForm.model_id)
  if (!selectedModel || !selectedModel.serial_alias) {
    return 'Model not found or missing serial alias'
  }
  
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  
  if (generateForm.mode === 'auto') {
    return `Example: EZ${selectedModel.serial_alias}${year}${month}000001, EZ${selectedModel.serial_alias}${year}${month}000002, ...`
  } else {
    return 'Custom format will use your provided prefix'
  }
})

// 用于显示的批次列表 - 合并AUTO_REGISTERED_DEVICES
const displayBatches = computed(() => {
  // 过滤掉原始的自动注册批次
  const manualBatches = batches.value.filter(batch => batch.batch_id !== AUTO_REGISTERED_BATCH_NAME)
  
  // 如果存在自动注册批次，创建虚拟合并批次
  if (autoRegisteredBatches.value.length > 0) {
    // 计算所有自动注册批次的统计总和
    const autoRegisteredStats = autoRegisteredBatches.value
      .reduce((acc, batch) => ({
        total_count: acc.total_count + (parseInt(batch.total_count || batch.count || 0, 10)),
        unused_count: acc.unused_count + (parseInt(batch.unused_count || 0, 10)),
        bound_count: acc.bound_count + (parseInt(batch.bound_count || 0, 10)),
        activated_count: acc.activated_count + (parseInt(batch.activated_count || 0, 10))
      }), { total_count: 0, unused_count: 0, bound_count: 0, activated_count: 0 })
    
    // 创建虚拟批次对象
    const virtualBatch = {
      batch_id: VIRTUAL_AUTO_REGISTERED_ID,
      id: VIRTUAL_AUTO_REGISTERED_ID, // 确保有id字段
      name: 'Auto-Registered Devices',
      display_name: `Auto-Registered Devices (${autoRegisteredBatches.value.length} Models)`,
      is_virtual: true,
      model_count: autoRegisteredBatches.value.length,
      ...autoRegisteredStats,
      created_at: autoRegisteredBatches.value[0]?.created_at || new Date().toISOString()
    }
    
    const result = [virtualBatch, ...manualBatches]
    return result
  } else {
    return manualBatches
  }
})


// Methods
const validateGenerateForm = () => {
  clearFormErrors(generateErrors)
  
  let isValid = true

  if (!generateForm.model_id || generateForm.model_id === 0) {
    setFieldError(generateErrors, 'model_id', 'Please select a device model')
    isValid = false
  }

  if (!generateForm.mode) {
    setFieldError(generateErrors, 'mode', 'Please select generation mode')
    isValid = false
  }

  if (generateForm.mode === 'custom') {
    if (!generateForm.custom_start_serial) {
      setFieldError(generateErrors, 'custom_start_serial', 'Please enter custom start serial')
      isValid = false
    } else {
      const last6Digits = generateForm.custom_start_serial.slice(-6)
      if (!/^\d{6}$/.test(last6Digits)) {
        setFieldError(generateErrors, 'custom_start_serial', 'Custom serial number must end with 6 digits')
        isValid = false
      }
    }
  }

  if (!generateForm.count || generateForm.count < 1 || generateForm.count > 10000) {
    setFieldError(generateErrors, 'count', 'Count must be between 1 and 10000')
    isValid = false
  }

  if (!generateForm.mac_start.trim()) {
    setFieldError(generateErrors, 'mac_start', 'Please enter starting MAC address')
    isValid = false
  } else if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(generateForm.mac_start)) {
    setFieldError(generateErrors, 'mac_start', 'Invalid MAC address format')
    isValid = false
  }

  if (!generateForm.mac_count || generateForm.mac_count < 1) {
    setFieldError(generateErrors, 'mac_count', 'MAC count must be at least 1')
    isValid = false
  }

  if (!generateForm.mac_interval || generateForm.mac_interval < 1) {
    setFieldError(generateErrors, 'mac_interval', 'MAC interval must be at least 1')
    isValid = false
  }

  return isValid
}

const fetchSerials = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      batch_id: searchForm.batch_id || undefined,
      status: searchForm.status || undefined,
      model_id: searchForm.model_id || undefined
    }

    const response = await serialApi.getSerials(params)
    if (response.success) {
      serials.value = response.data.serials || []
      if (response.data.pagination) {
        pagination.total = response.data.pagination.total
      }
      // 如果没有batches数据，则基于serials数据更新统计
      if (batches.value.length === 0) {
        updateStats()
      }
    } else {
      handleError(new Error(response.message || 'Failed to fetch serials'))
    }
  } catch (error) {
    console.error('Error fetching serials:', error)
    handleError(error, { fallbackMessage: 'Failed to fetch serials' })
  } finally {
    loading.value = false
  }
}

const fetchBatches = async () => {
  try {
    const response = await serialApi.getBatches()
    if (response.success) {
      // 根据实际API响应格式处理
      const data = response.data as any
      if (data.batches && Array.isArray(data.batches)) {
        batches.value = data.batches
      } else if (Array.isArray(data)) {
        batches.value = data
      } else {
        console.warn('Unexpected batches response format:', data)
        batches.value = []
      }
      updateStats()
    } else {
      handleError(new Error(response.message || 'Failed to fetch batches'))
    }
  } catch (error) {
    console.error('Error fetching batches:', error)
    handleError(error, { fallbackMessage: 'Failed to fetch batches' })
  }
}

const fetchModels = async () => {
  try {
    const response = await modelApi.getAllModels()
    
    // 强制初始化为数组
    if (!models.value) {
      models.value = []
    }
    
    // 兼容处理：如果响应有success字段，使用response.data；否则直接使用response
    if (response && typeof response === 'object') {
      if ('success' in response && response.success && response.data) {
        // 类型断言以支持分页响应
        const data = response.data as any
        // 检查是否有models字段（分页响应）
        if (data.models && Array.isArray(data.models)) {
          models.value = data.models
        } else if (Array.isArray(data)) {
          models.value = data
        } else {
          console.warn('No models found in response.data:', response.data)
          models.value = []
        }
      } else if (Array.isArray(response)) {
        // 直接返回数组的情况
        models.value = response
      } else {
        console.warn('Unexpected models response format:', response)
        models.value = []
      }
    } else {
      console.warn('Invalid response:', response)
      models.value = []
    }
    
  } catch (error) {
    console.error('Error fetching models:', error)
    models.value = []
  }
}

const updateStats = () => {
  // 从批次数据计算统计信息
  if (batches.value.length > 0) {
    
    // 确保数值转换为整数，避免字符串拼接
    stats.totalSerials = batches.value.reduce((sum, batch) => {
      const count = parseInt(batch.total_count || batch.count || 0, 10)
      return sum + count
    }, 0)
    
    stats.unusedCount = batches.value.reduce((sum, batch) => {
      const count = parseInt(batch.unused_count || 0, 10)
      return sum + count
    }, 0)
    
    stats.boundCount = batches.value.reduce((sum, batch) => {
      const count = parseInt(batch.bound_count || 0, 10)
      return sum + count
    }, 0)
    
    stats.activatedCount = batches.value.reduce((sum, batch) => {
      const count = parseInt(batch.activated_count || 0, 10)
      return sum + count
    }, 0)
    
  } else {
    stats.totalSerials = 0
    stats.unusedCount = 0
    stats.boundCount = 0
    stats.activatedCount = 0
  }
}

// Error handling helpers
const processValidationErrors = (validationErrors: any[], errorData: any) => {
  validationErrors.forEach((err: any) => {
    if (err.path) {
      setFieldError(generateErrors, err.path, err.msg)
    } else {
      setFieldError(generateErrors, 'general', err.msg || errorData?.message)
    }
  })
  
  // Show the first error as notification
  const firstError = validationErrors[0]
  if (firstError?.msg) {
    notyf.error(firstError.msg)
  }
}

const processErrorResponse = (error: any) => {
  const errorData = error.response?.data
  const validationErrors = errorData?.data // Validation errors come in data field
  
  if (validationErrors && Array.isArray(validationErrors)) {
    processValidationErrors(validationErrors, errorData)
  } else if (errorData?.message) {
    setFieldError(generateErrors, 'general', errorData.message)
    notyf.error(errorData.message)
  } else {
    const errorMessage = error.message || 'Failed to generate serials'
    setFieldError(generateErrors, 'general', errorMessage)
    notyf.error(errorMessage)
  }
}

const handleGenerate = async () => {
  if (!models.value || models.value.length === 0) {
    await fetchModels()
  }
  resetGenerateForm()
  generateDialogVisible.value = true
}

const handleSubmitGenerate = async () => {
  if (!validateGenerateForm()) {
    return
  }

  generating.value = true
  clearFormErrors(generateErrors)
  
  try {
    const response = await serialApi.generateSerials(generateForm)
    if (response.success) {
      showSuccess(`Successfully generated ${generateForm.count} serial numbers`)
      generateDialogVisible.value = false
      resetGenerateForm()
      fetchSerials()
      fetchBatches()
    } else {
      // Handle non-success response
      const errorMessage = response.message || 'Failed to generate serials'
      setFieldError(generateErrors, 'general', errorMessage)
      notyf.error(errorMessage)
    }
  } catch (error: any) {
    console.error('Error generating serials:', error)
    processErrorResponse(error)
  } finally {
    generating.value = false
  }
}

const handleRefresh = () => {
  fetchSerials()
  fetchBatches()
}

const selectBatch = (batchId: string) => {
  currentBatch.value = currentBatch.value === batchId ? '' : batchId
  
  // 处理虚拟批次ID的特殊情况
  if (currentBatch.value === VIRTUAL_AUTO_REGISTERED_ID) {
    // 对于虚拟批次，我们设置searchForm.batch_id为通用标识符
    searchForm.batch_id = AUTO_REGISTERED_BATCH_NAME
  } else {
    searchForm.batch_id = currentBatch.value
  }
  
  // 移除 handleImmediateSearch() 调用，让 watch 自动处理搜索
  // 避免重复请求：selectBatch 修改 searchForm.batch_id -> watch 触发搜索
}

// Debounced search for text inputs
const handleDebouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    pagination.page = 1
    fetchSerials()
  }, 500)
}

// Immediate search for dropdowns
const handleImmediateSearch = () => {
  pagination.page = 1
  fetchSerials()
}

const handleReset = () => {
  Object.assign(searchForm, {
    batch_id: '',
    status: '',
    model_id: 0
  })
  currentBatch.value = ''
  pagination.page = 1
  fetchSerials()
}

const handleViewDetails = (serial: SerialNumber) => {
  selectedSerial.value = serial
  detailDialogVisible.value = true
}

const handleViewBatchDetails = (batch: any) => {
  selectedBatch.value = batch
  batchDetailDialogVisible.value = true
}

const handleExportBatch = async (batchId: string) => {
  try {
    const result = await serialApi.exportSerials(batchId)
    
    // result包含blob和filename
    const url = window.URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    
    // 使用后端提供的文件名
    link.download = result.filename
    
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    showSuccess('Serial numbers exported successfully')
  } catch (error) {
    console.error('Error exporting serials:', error)
    handleError(error, { fallbackMessage: 'Failed to export serials' })
  }
}

const handleDeleteBatch = (batchId: string) => {
  selectedBatchForDelete.value = batchId
  deleteBatchConfirmOpen.value = true
}

const confirmDeleteBatch = async () => {
  if (!selectedBatchForDelete.value) return
  
  try {
    const response = await serialApi.deleteBatch(selectedBatchForDelete.value)
    if (response.success) {
      showSuccess('Batch deleted successfully')
      if (currentBatch.value === selectedBatchForDelete.value) {
        currentBatch.value = ''
      }
      fetchSerials()
      fetchBatches()
    } else {
      handleError(new Error(response.message || 'Failed to delete batch'))
    }
  } catch (error) {
    console.error('Error deleting batch:', error)
    handleError(error, { fallbackMessage: 'Failed to delete batch' })
  } finally {
    deleteBatchConfirmOpen.value = false
    selectedBatchForDelete.value = ''
  }
}

const resetGenerateForm = () => {
  Object.assign(generateForm, {
    model_id: 0,
    count: 10,
    mac_start: '',
    mac_count: 1,
    mac_interval: 1,
    mode: 'auto',
    custom_start_serial: ''
  })
  clearFormErrors(generateErrors)
}

// 使用统一的日期格式化工具
// const formatDateTime = formatDateTime  // 已导入

const onPageChange = (page: number) => {
  pagination.page = page
  fetchSerials()
}

const onModeChange = (mode: string) => {
  if (mode === 'auto') {
    generateForm.custom_start_serial = ''
    setFieldError(generateErrors, 'custom_start_serial', '')
  }
}

const validateCustomSerial = () => {
  if (generateForm.mode === 'custom' && generateForm.custom_start_serial) {
    const last6Digits = generateForm.custom_start_serial.slice(-6)
    if (!/^\d{6}$/.test(last6Digits)) {
      setFieldError(generateErrors, 'custom_start_serial', 'Custom serial number must end with 6 digits')
    } else {
      setFieldError(generateErrors, 'custom_start_serial', '')
    }
  }
}

// Watch for filter changes - 批次ID使用立即搜索，避免延迟
watch(() => searchForm.batch_id, () => {
  handleImmediateSearch()
})

watch(() => searchForm.status, () => {
  handleImmediateSearch()
})

watch(() => searchForm.model_id, () => {
  handleImmediateSearch()
})

// Watch for pagination limit changes
watch(() => pagination.limit, () => {
  pagination.page = 1
  fetchSerials()
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchBatches(),
    fetchModels()
  ])
  // 获取完batches后再获取serials
  await fetchSerials()
})

useHead({
  title: 'Serial Numbers - Ezen Cloud'
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">Serial Number Management</h1>
          <p class="subtitle is-6">Manage device serial numbers and MAC address allocation</p>
        </div>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="columns is-multiline mb-6">
      <div class="column is-3">
        <VCard radius="smooth" class="common-stats-card">
          <div class="stats-content">
            <div class="stats-icon is-info">
              <iconify-icon icon="lucide:grid-3x3" class="rem-30" />
            </div>
            <div class="stats-info">
              <span class="stats-number">{{ stats.totalSerials }}</span>
              <p>Total Serials</p>
            </div>
          </div>
        </VCard>
      </div>

      <div class="column is-3">
        <VCard radius="smooth" class="common-stats-card">
          <div class="stats-content">
            <div class="stats-icon is-success">
              <iconify-icon icon="lucide:package" class="rem-30" />
            </div>
            <div class="stats-info">
              <span class="stats-number">{{ stats.unusedCount }}</span>
              <p>Unused</p>
            </div>
          </div>
        </VCard>
      </div>

      <div class="column is-3">
        <VCard radius="smooth" class="common-stats-card">
          <div class="stats-content">
            <div class="stats-icon is-warning">
              <iconify-icon icon="lucide:link" class="rem-30" />
            </div>
            <div class="stats-info">
              <span class="stats-number">{{ stats.boundCount }}</span>
              <p>Bound</p>
            </div>
          </div>
        </VCard>
      </div>

      <div class="column is-3">
        <VCard radius="smooth" class="common-stats-card">
          <div class="stats-content">
            <div class="stats-icon is-primary">
              <iconify-icon icon="lucide:check-circle" class="rem-30" />
            </div>
            <div class="stats-info">
              <span class="stats-number">{{ stats.activatedCount }}</span>
              <p>Activated</p>
            </div>
          </div>
        </VCard>
      </div>
    </div>

    <div class="columns">
      <!-- Batch List -->
      <div class="column is-4">
        <VCard radius="smooth">
          <div class="batch-header">
            <h3 class="title is-6">Batch List</h3>
            <VButton size="medium" @click="fetchBatches">
              <iconify-icon icon="lucide:refresh-cw" />
            </VButton>
          </div>

          <div class="batch-list" :class="{ 'is-loading': loading }">
            <div
              v-for="batch in displayBatches"
              :key="batch.batch_id"
              class="batch-item"
              :class="{ 'is-active': currentBatch === batch.batch_id, 'is-virtual': batch.is_virtual }"
              @click="selectBatch(batch.batch_id)"
            >
              <div class="batch-item-header">
                <span class="batch-id" :class="{ 'is-virtual': batch.is_virtual }">
                  {{ batch.is_virtual ? batch.display_name : batch.batch_id }}
                </span>
                <VDropdown spaced right icon="lucide:more-horizontal">
                  <template #content>
                    <a 
                      class="dropdown-item is-media"
                      @click="handleViewBatchDetails(batch)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:eye" />
                      </div>
                      <div class="meta">
                        <span>View Details</span>
                      </div>
                    </a>
                    <hr v-if="!batch.is_virtual" class="dropdown-divider">
                    <a 
                      v-if="!batch.is_virtual"
                      class="dropdown-item is-media"
                      @click="handleExportBatch(batch.batch_id)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:download" />
                      </div>
                      <div class="meta">
                        <span>Export Excel</span>
                      </div>
                    </a>
                    <hr v-if="!batch.is_virtual" class="dropdown-divider">
                    <a 
                      v-if="!batch.is_virtual"
                      class="dropdown-item is-media has-text-danger"
                      @click="handleDeleteBatch(batch.batch_id)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:trash-2" />
                      </div>
                      <div class="meta">
                        <span>Delete Batch</span>
                      </div>
                    </a>
                  </template>
                </VDropdown>
              </div>

              <div class="batch-info">
                <div v-if="batch.is_virtual" class="model-info virtual-info">
                  <iconify-icon icon="lucide:layers" class="mr-1" />
                  Combined from {{ batch.model_count }} device models
                </div>
                <div v-else-if="batch.deviceModel" class="model-info">
                  {{ batch.deviceModel.oemname }} {{ batch.deviceModel.stdname }}
                </div>
                <div class="batch-stats">
                  <VTag size="tiny" color="info">Total: {{ batch.total_count || batch.count || 0 }}</VTag>
                  <VTag size="tiny" color="success">Unused: {{ batch.unused_count || 0 }}</VTag>
                  <VTag size="tiny" color="warning">Bound: {{ batch.bound_count || 0 }}</VTag>
                  <VTag v-if="batch.activated_count" size="tiny" color="primary">Activated: {{ batch.activated_count }}</VTag>
                </div>
                <div class="batch-date">
                  <VDateTimeSplit :date-string="batch.created_at" variant="batch" size="small" />
                </div>
              </div>
            </div>

            <div v-if="displayBatches.length === 0" class="empty-state">
              <p>No batches found</p>
            </div>
          </div>
        </VCard>
      </div>

      <!-- Serial Numbers Table -->
      <div class="column is-8">
        <VCard radius="smooth">
          <!-- Filter Section -->
          <div class="card-content">
            <div class="columns">
              <div class="column is-3">
                <VField>
                  <VLabel>Search Batch ID</VLabel>
                  <VControl>
                    <VInput
                      v-model="searchForm.batch_id"
                      placeholder="Filter by batch ID"
                      icon="lucide:search"
                    />
                  </VControl>
                </VField>
              </div>

              <div class="column is-2">
                <VField>
                  <VLabel>Status</VLabel>
                  <VControl>
                    <VSelect v-model="searchForm.status">
                      <VOption value="">All Status</VOption>
                      <VOption value="unused">Unused</VOption>
                      <VOption value="bound">Bound</VOption>
                      <VOption value="activated">Activated</VOption>
                    </VSelect>
                  </VControl>
                </VField>
              </div>

              <div class="column is-3">
                <VField>
                  <VLabel>Model</VLabel>
                  <VControl>
                    <VSelect v-model="searchForm.model_id">
                      <VOption :value="0">All Models</VOption>
                      <VOption 
                        v-for="model in models" 
                        :key="model.id" 
                        :value="model.id"
                      >
                        {{ model.oemname }} {{ model.stdname }}
                      </VOption>
                    </VSelect>
                  </VControl>
                </VField>
              </div>

              <div class="column is-4">
                <VField>
                  <VLabel>&nbsp;</VLabel>
                  <VControl>
                    <div class="field is-grouped">
                      <div class="control">
                        <VButton @click="handleReset">
                          Reset Filters
                        </VButton>
                      </div>
                      <div class="control">
                        <VButton @click="handleRefresh" :loading="loading">
                          Refresh
                        </VButton>
                      </div>
                      <div class="control">
                        <VButton 
                          color="primary" 
                          :loading="generating"
                          @click="handleGenerate"
                        >
                          Batch Generate
                        </VButton>
                      </div>
                    </div>
                  </VControl>
                </VField>
              </div>
            </div>
          </div>

          <!-- Virtual Batch Info Banner -->
          <div v-if="currentBatch === VIRTUAL_AUTO_REGISTERED_ID" class="virtual-batch-info mb-4">
            <VMessage color="info" class="virtual-batch-message">
              <iconify-icon icon="lucide:layers" class="mr-2" />
              Viewing auto-registered devices from {{ autoRegisteredBatches.length }} models, grouped by device model
            </VMessage>
          </div>

          <!-- Serials Table -->
          <VFlexTableWrapper
            :columns="tableColumns"
            :data="sortedFilteredSerials"
            :loading="loading"
            :limit="pagination.limit"
          >
            <template #default="wrapperState">
              <VFlexTableToolbar>
                <template #right>
                  <VField>
                    <VControl>
                      <VSelect v-model="pagination.limit" class="is-rounded">
                        <VOption :value="10">10 per page</VOption>
                        <VOption :value="20">20 per page</VOption>
                        <VOption :value="50">50 per page</VOption>
                        <VOption :value="100">100 per page</VOption>
                      </VSelect>
                    </VControl>
                  </VField>
                </template>
              </VFlexTableToolbar>

              <VFlexTable rounded>
                <!-- 加载状态 -->
                <template #body>
                  <div v-if="loading" class="flex-list-inner">
                    <div v-for="key in 5" :key="key" class="flex-table-item">
                      <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                      <VFlexTableCell><VPlaceload width="100px" /></VFlexTableCell>
                      <VFlexTableCell :column="{ grow: 'lg' }"><VPlaceload /></VFlexTableCell>
                      <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                      <VFlexTableCell><VPlaceload width="120px" /></VFlexTableCell>
                      <VFlexTableCell><VPlaceload width="120px" /></VFlexTableCell>
                      <VFlexTableCell :column="{ align: 'end' }"><VPlaceload width="60px" /></VFlexTableCell>
                    </div>
                  </div>
                  
                  <!-- 空状态 -->
                  <div v-else-if="wrapperState.data?.length === 0" class="flex-list-inner">
                    <VPlaceholderSection
                      title="No serial numbers"
                      subtitle="Please generate serial numbers or check search criteria"
                      class="my-6"
                    />
                  </div>
                </template>
                <template #body-cell="{ row: serial, column }">
                  <template v-if="column.key === 'serial'">
                    <VTextEllipsis width="180px" class="serial-number">
                      {{ serial.serial }}
                    </VTextEllipsis>
                  </template>

                  <template v-if="column.key === 'batch_id'">
                    <VTextEllipsis width="120px" class="batch-id">
                      {{ serial.batch_id }}
                    </VTextEllipsis>
                  </template>

                  <template v-if="column.key === 'device_model'">
                    <div v-if="serial.deviceModel || serial.device_model" class="device-model-info">
                      <div class="model-oemname">
                        <VTextEllipsis width="140px" class="model-name">
                          {{ (serial.deviceModel || serial.device_model)?.oemname }}
                        </VTextEllipsis>
                      </div>
                      <div class="model-stdname">
                        <VTextEllipsis width="140px" class="model-std">
                          {{ (serial.deviceModel || serial.device_model)?.stdname }}
                        </VTextEllipsis>
                      </div>
                      <div v-if="(serial.deviceModel || serial.device_model)?.serial_alias" class="model-alias mt-1">
                        <VTag color="primary" size="tiny">{{ (serial.deviceModel || serial.device_model)?.serial_alias }}</VTag>
                      </div>
                    </div>
                    <span v-else class="common-text-light">
                      <small>Unknown Model</small>
                    </span>
                  </template>

                  <template v-if="column.key === 'mac_info'">
                    <div class="mac-info">
                      <div class="mb-1">
                        <VTextEllipsis width="160px">
                          <small class="has-text-weight-semibold">Start:</small> {{ serial.mac_start }}
                        </VTextEllipsis>
                      </div>
                      <div>
                        <VTextEllipsis width="160px" class="common-text-light">
                          <small>Count: {{ serial.mac_count }}, Interval: {{ serial.mac_interval }}</small>
                        </VTextEllipsis>
                      </div>
                    </div>
                  </template>

                  <template v-if="column.key === 'status'">
                    <VTag 
                      :color="serial.status === 'unused' ? 'success' : 
                              serial.status === 'bound' ? 'warning' : 'primary'"
                      rounded
                    >
                      {{ serial.status }}
                    </VTag>
                  </template>

                  <template v-if="column.key === 'created_at'">
                    <VDateTimeSplit :date-string="serial.created_at" />
                  </template>


                  <template v-if="column.key === 'actions'">
                    <VButton 
                      outlined
                      @click="handleViewDetails(serial)"
                    >
                      <iconify-icon icon="lucide:eye" />
                    </VButton>
                  </template>
                </template>
              </VFlexTable>
            </template>
          </VFlexTableWrapper>

          <!-- Pagination -->
          <VFlexPagination
            v-if="pagination.total > 0"
            v-model:current-page="pagination.page"
            :item-per-page="pagination.limit"
            :total-items="pagination.total"
            :max-links-displayed="5"
            @update:current-page="onPageChange"
          />
        </VCard>
      </div>
    </div>

    <!-- Generate Serial Modal -->
    <VModal
      :open="generateDialogVisible"
      title="Batch Generate Serial Numbers"
      size="medium"
      actions="right"
      @close="generateDialogVisible = false"
    >
      <template #content>
        <form @submit.prevent="handleSubmitGenerate">
          <!-- General error display -->
          <VMessage v-if="generateErrors.general" color="danger" class="mb-4">
            {{ generateErrors.general }}
          </VMessage>
          
          <VField>
            <VLabel>Device Model *</VLabel>
            <VControl>
              <VSelect 
                v-model="generateForm.model_id"
                :class="{ 'is-danger': generateErrors.model_id }"
                placeholder="Please select device model"
              >
                <VOption :value="0">Please select device model</VOption>
                <template v-if="models && models.length > 0">
                  <VOption 
                    v-for="model in models" 
                    :key="model.id" 
                    :value="model.id"
                  >
                    {{ model.oemname }} {{ model.stdname }} [{{ model.serial_alias }}]
                  </VOption>
                </template>
              </VSelect>
              <p v-if="generateErrors.model_id" class="help is-danger">
                {{ generateErrors.model_id }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>Generate Mode *</VLabel>
            <VControl>
              <div class="radio-group">
                <VRadio 
                  v-model="generateForm.mode" 
                  value="auto"
                  name="generate_mode"
                  color="primary"
                  @change="onModeChange"
                >
                  Auto Generate
                </VRadio>
                <VRadio 
                  v-model="generateForm.mode" 
                  value="custom"
                  name="generate_mode"
                  color="primary"
                  @change="onModeChange"
                >
                  Custom Start Serial
                </VRadio>
              </div>
              <div class="help-text">
                <small class="has-text-info">
                  Auto: EZ + Serial Alias(3 chars) + YYMM + 6-digit increment<br>
                  Custom: Custom starting serial number, last 6 digits increment
                </small>
              </div>
              <div v-if="generateForm.model_id && generateForm.mode === 'auto'" class="mt-2">
                <small class="has-text-primary has-text-weight-semibold">
                  {{ serialFormatExample }}
                </small>
              </div>
              <p v-if="generateErrors.mode" class="help is-danger">
                {{ generateErrors.mode }}
              </p>
            </VControl>
          </VField>

          <VField v-if="generateForm.mode === 'custom'">
            <VLabel>Custom Start Serial *</VLabel>
            <VControl>
              <VInput
                v-model="generateForm.custom_start_serial"
                placeholder="Enter custom start serial (must end with 6 digits)"
                :class="{ 'is-danger': generateErrors.custom_start_serial }"
                @blur="validateCustomSerial"
              />
              <div class="help-text">
                <small class="has-text-info">Format: Any prefix + 6 digits (e.g., ABC123456789)</small>
              </div>
              <p v-if="generateErrors.custom_start_serial" class="help is-danger">
                {{ generateErrors.custom_start_serial }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>Generate Count *</VLabel>
            <VControl>
              <VInput
                v-model.number="generateForm.count"
                type="number"
                placeholder="Number of serials to generate"
                :class="{ 'is-danger': generateErrors.count }"
              />
              <p v-if="generateErrors.count" class="help is-danger">
                {{ generateErrors.count }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>Starting MAC Address *</VLabel>
            <VControl>
              <VInput
                v-model="generateForm.mac_start"
                placeholder="e.g., 00:11:22:33:44:55"
                :class="{ 'is-danger': generateErrors.mac_start }"
              />
              <p v-if="generateErrors.mac_start" class="help is-danger">
                {{ generateErrors.mac_start }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>MAC Count per Serial *</VLabel>
            <VControl>
              <VInput
                v-model.number="generateForm.mac_count"
                type="number"
                placeholder="Number of MAC addresses per serial"
                :class="{ 'is-danger': generateErrors.mac_count }"
              />
              <p v-if="generateErrors.mac_count" class="help is-danger">
                {{ generateErrors.mac_count }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>MAC Interval *</VLabel>
            <VControl>
              <VInput
                v-model.number="generateForm.mac_interval"
                type="number"
                placeholder="Interval between MAC addresses"
                :class="{ 'is-danger': generateErrors.mac_interval }"
              />
              <p v-if="generateErrors.mac_interval" class="help is-danger">
                {{ generateErrors.mac_interval }}
              </p>
            </VControl>
          </VField>
        </form>
      </template>

      <template #action>
        <VButton 
          color="primary" 
          :loading="generating"
          @click="handleSubmitGenerate"
        >
          Generate
        </VButton>
      </template>
    </VModal>

    <!-- Serial Details Modal -->
    <VModal
      :open="detailDialogVisible"
      title="Serial Number Details"
      size="medium"
      actions="right"
      cancel-label="Close"
      @close="detailDialogVisible = false"
    >
      <template #content>
        <div v-if="selectedSerial" class="serial-details">
          <div class="common-info-grid">
            <div class="common-info-item">
              <label>Serial Number</label>
              <span>{{ selectedSerial.serial }}</span>
            </div>
            <div class="common-info-item">
              <label>Batch ID</label>
              <span>{{ selectedSerial.batch_id }}</span>
            </div>
            <div class="common-info-item">
              <label>MAC Start</label>
              <span>{{ selectedSerial.mac_start }}</span>
            </div>
            <div class="common-info-item">
              <label>MAC Count</label>
              <span>{{ selectedSerial.mac_count }}</span>
            </div>
            <div class="common-info-item">
              <label>MAC Interval</label>
              <span>{{ selectedSerial.mac_interval }}</span>
            </div>
            <div class="common-info-item">
              <label>Status</label>
              <VTag 
                :color="selectedSerial.status === 'unused' ? 'success' : 
                        selectedSerial.status === 'bound' ? 'warning' : 'primary'"
              >
                {{ selectedSerial.status }}
              </VTag>
            </div>
            <div class="common-info-item">
              <label>Created At</label>
              <VDateTimeSplit :date-string="selectedSerial.created_at" />
            </div>
            <div class="common-info-item">
              <label>Bound At</label>
              <VDateTimeSplit v-if="selectedSerial.bound_at" :date-string="selectedSerial.bound_at" />
              <span v-else class="common-text-light">-</span>
            </div>
          </div>
        </div>
      </template>
    </VModal>

    <!-- Batch Details Modal -->
    <VModal
      :open="batchDetailDialogVisible"
      :title="selectedBatch?.is_virtual ? 'Virtual Batch Details' : 'Batch Details'"
      size="medium"
      actions="right"
      cancel-label="Close"
      @close="batchDetailDialogVisible = false"
    >
      <template #content>
        <div v-if="selectedBatch" class="batch-details">
          <!-- Virtual Batch Details -->
          <div v-if="selectedBatch.is_virtual" class="virtual-batch-details">
            <div class="common-info-grid">
              <div class="common-info-item">
                <label>Batch Type</label>
                <VTag color="info" rounded>
                  <iconify-icon icon="lucide:layers" class="mr-1" />
                  Virtual Combined Batch
                </VTag>
              </div>
              <div class="common-info-item">
                <label>Display Name</label>
                <span>{{ selectedBatch.display_name }}</span>
              </div>
              <div class="common-info-item">
                <label>Combined Models</label>
                <span>{{ selectedBatch.model_count }} device models</span>
              </div>
              <div class="common-info-item">
                <label>Total Serials</label>
                <span>{{ selectedBatch.total_count || 0 }}</span>
              </div>
              <div class="common-info-item">
                <label>Unused Count</label>
                <VTag color="success">{{ selectedBatch.unused_count || 0 }}</VTag>
              </div>
              <div class="common-info-item">
                <label>Bound Count</label>
                <VTag color="warning">{{ selectedBatch.bound_count || 0 }}</VTag>
              </div>
              <div class="common-info-item">
                <label>Activated Count</label>
                <VTag color="primary">{{ selectedBatch.activated_count || 0 }}</VTag>
              </div>
              <div class="common-info-item">
                <label>First Created</label>
                <VDateTimeSplit :date-string="selectedBatch.created_at" />
              </div>
            </div>
            
            <div class="virtual-batch-info mt-4">
              <h5 class="title is-6">Virtual Batch Information</h5>
              <VMessage color="info">
                <iconify-icon icon="lucide:info" class="mr-2" />
                This is a combined view of all auto-registered device serials grouped by device models. 
                It aggregates statistics from {{ selectedBatch.model_count }} different device models 
                that have been automatically registered in the system.
              </VMessage>
            </div>
          </div>

          <!-- Regular Batch Details -->
          <div v-else class="regular-batch-details">
            <div class="common-info-grid">
              <div class="common-info-item">
                <label>Batch ID</label>
                <span class="batch-id">{{ selectedBatch.batch_id }}</span>
              </div>
              <div v-if="selectedBatch.deviceModel" class="common-info-item">
                <label>Device Model</label>
                <div class="device-model-detail">
                  <div class="model-name">{{ selectedBatch.deviceModel.oemname }} {{ selectedBatch.deviceModel.stdname }}</div>
                  <div class="model-type">{{ selectedBatch.deviceModel.devtype }}</div>
                  <div v-if="selectedBatch.deviceModel.serial_alias" class="model-alias">
                    <VTag color="primary" size="tiny">Alias: {{ selectedBatch.deviceModel.serial_alias }}</VTag>
                  </div>
                </div>
              </div>
              <div v-if="selectedBatch.deviceModel?.vendor" class="common-info-item">
                <label>Vendor</label>
                <span>{{ selectedBatch.deviceModel.vendor.name }}</span>
              </div>
              <div class="common-info-item">
                <label>Total Serials</label>
                <span>{{ selectedBatch.total_count || selectedBatch.count || 0 }}</span>
              </div>
              <div class="common-info-item">
                <label>Unused Count</label>
                <VTag color="success">{{ selectedBatch.unused_count || 0 }}</VTag>
              </div>
              <div class="common-info-item">
                <label>Bound Count</label>
                <VTag color="warning">{{ selectedBatch.bound_count || 0 }}</VTag>
              </div>
              <div class="common-info-item">
                <label>Activated Count</label>
                <VTag color="primary">{{ selectedBatch.activated_count || 0 }}</VTag>
              </div>
              <div class="common-info-item">
                <label>Created At</label>
                <VDateTimeSplit :date-string="selectedBatch.created_at" />
              </div>
            </div>

            <!-- Batch Actions -->
            <div v-if="!selectedBatch.is_virtual" class="batch-actions mt-4">
              <h5 class="title is-6">Batch Actions</h5>
              <div class="field is-grouped">
                <div class="control">
                  <VButton 
                    color="info"
                    @click="handleExportBatch(selectedBatch.batch_id); batchDetailDialogVisible = false"
                  >
                    <iconify-icon icon="lucide:download" class="mr-1" />
                    Export Excel
                  </VButton>
                </div>
                <div class="control">
                  <VButton 
                    color="danger"
                    outlined
                    @click="handleDeleteBatch(selectedBatch.batch_id); batchDetailDialogVisible = false"
                  >
                    <iconify-icon icon="lucide:trash-2" class="mr-1" />
                    Delete Batch
                  </VButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </VModal>

    <!-- Delete Batch Confirmation Dialog -->
    <VModal 
      :open="deleteBatchConfirmOpen"
      title="Confirm Delete Batch"
      size="small"
      actions="center"
      @close="deleteBatchConfirmOpen = false"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:trash-2" 
            class="has-text-danger"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Delete Batch</h3>
          <p class="subtitle is-6">
            Are you sure you want to delete this batch?
          </p>
          <p class="has-text-grey">
            This will permanently delete all serial numbers in this batch and cannot be undone.
          </p>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="danger"
          @click="confirmDeleteBatch"
        >
          Delete Batch
        </VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
:deep(.field.is-grouped) {
  flex-wrap: wrap;
  gap: 0.5rem;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  .title {
    margin: 0;
  }
}

.batch-list {
  max-height: 500px;
  overflow-y: auto;

  .batch-item {
    padding: 1rem;
    border: 1px solid var(--fade-grey-light-3);
    border-radius: var(--radius);
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: var(--primary);
      background: var(--fade-grey-light-6);
    }

    &.is-active {
      border-color: var(--primary);
      background: var(--primary-light);
      box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.15);
      border-left: 4px solid var(--primary);
      transform: translateY(-1px);
      
      .batch-id {
        color: var(--primary);
        font-weight: 700;
      }
      
      .batch-info .model-info {
        color: var(--primary-dark);
        font-weight: 600;
      }
    }

    &.is-virtual {
      border-left: 4px solid var(--info);
      background: linear-gradient(135deg, var(--fade-grey-light-6) 0%, var(--info-light) 100%);
      
      &.is-active {
        border-color: var(--info);
        background: linear-gradient(135deg, var(--info-light) 0%, var(--primary-light) 100%);
        box-shadow: 0 4px 12px rgba(var(--info-rgb), 0.2);
        border-left: 4px solid var(--info);
        transform: translateY(-1px);
        
        .batch-id.is-virtual {
          color: var(--info);
          font-weight: 700;
          
          &::before {
            content: '🔗';
            margin-right: 0.5rem;
            font-size: 1rem;
            animation: pulse 2s infinite;
          }
        }
        
        .virtual-info {
          color: var(--info-dark);
          font-weight: 600;
        }
      }
      
      .batch-id.is-virtual {
        color: var(--info);
        font-weight: 600;
        display: flex;
        align-items: center;
        
        &::before {
          content: '🔗';
          margin-right: 0.5rem;
          font-size: 0.9rem;
        }
      }
      
      .virtual-info {
        color: var(--info);
        font-weight: 500;
        display: flex;
        align-items: center;
        font-size: 0.8rem;
      }
    }

    .batch-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;

      .batch-id {
        font-weight: 600;
        color: var(--dark-text);
        font-family: var(--font-family-monospace);
      }
    }

    .batch-info {
      .model-info {
        color: var(--muted-grey);
        margin-bottom: 0.5rem;
        font-weight: 500;
        font-size: 0.85rem;
      }

      .batch-stats {
        margin-bottom: 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
      }

      .batch-count {
        font-size: 0.9rem;
        color: var(--muted-grey);
        margin-bottom: 0.25rem;
      }

      .batch-date {
        font-size: 0.85rem;
        color: var(--light-text);
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--muted-grey);
  }
}

.serial-number {
  font-family: var(--font-family-monospace);
  font-weight: 600;
  color: var(--primary);
}

.batch-id {
  font-family: var(--font-family-monospace);
  font-weight: 500;
  color: var(--dark-text);
}

.mac-info {
  font-size: 0.85rem;
  line-height: 1.3;
  color: var(--muted-grey);
}

.date-text {
  font-size: 0.85rem;
  color: var(--muted-grey);
}

.device-model-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  .model-oemname {
    .model-name {
      font-weight: 600;
      color: var(--primary);
      line-height: 1.2;
    }
  }
  
  .model-stdname {
    .model-std {
      font-weight: 500;
      color: var(--dark-text);
      line-height: 1.2;
      font-size: 0.9rem;
    }
  }
}

.virtual-batch-info {
  .virtual-batch-message {
    :deep(.message-body) {
      display: flex;
      align-items: center;
      font-weight: 500;
      
      iconify-icon {
        color: var(--info);
      }
    }
  }
}

.rem-30 {
  font-size: 1.875rem;
}

.is-dark {
  .batch-item {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);

    &.is-active {
      background: var(--dark-sidebar-light-12);
    }
  }
}

@media only screen and (max-width: 767px) {
  .columns {
    display: block;

    .column {
      width: 100%;
      margin-bottom: 1rem;
    }
  }
}

.radio-group {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.help-text {
  margin-top: 0.5rem;
  
  small {
    display: block;
    line-height: 1.4;
  }
}

// 脉冲动画，用于选中的虚拟批次图标
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

// 批次详情样式
.batch-details {
  .device-model-detail {
    .model-name {
      font-weight: 600;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }
    
    .model-type {
      font-size: 0.85rem;
      color: var(--muted-grey);
      text-transform: uppercase;
      font-weight: 500;
    }
  }
  
  .virtual-batch-info {
    .title {
      color: var(--info);
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
      
      &::before {
        content: '🔗';
        margin-right: 0.5rem;
      }
    }
    
    :deep(.message-body) {
      line-height: 1.6;
    }
  }
  
  .batch-actions {
    .title {
      margin-bottom: 1rem;
      color: var(--dark-text);
    }
  }
}

</style>