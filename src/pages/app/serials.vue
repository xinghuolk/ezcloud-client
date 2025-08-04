<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { serialApi, modelApi } from '/@src/api'
import type { SerialNumber, GenerateSerialParams, DeviceModel } from '/@src/api/types'
import { Notyf } from 'notyf'
import { formatDateTime } from '/@src/utils/date-formatter'

definePage({
  meta: {
    requiresAuth: true,
    requiresAdmin: true
  }
})

const router = useRouter()
const notyf = new Notyf()

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
const selectedSerial = ref<SerialNumber | null>(null)

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

// Validation errors
const generateErrors = ref({
  model_id: '',
  count: '',
  mac_start: '',
  mac_count: '',
  mac_interval: '',
  mode: '',
  custom_start_serial: ''
})

// Computed
const filteredSerials = computed(() => {
  if (!currentBatch.value) return serials.value
  
  // 处理虚拟批次ID的特殊情况
  if (currentBatch.value === VIRTUAL_AUTO_REGISTERED_ID) {
    // 显示所有属于AUTO_REGISTERED_DEVICES的序列号
    const autoRegBatchIdSet = new Set(autoRegisteredBatchIds.value)
    return serials.value.filter(s => autoRegBatchIdSet.has(s.batch_id))
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
    
    return [virtualBatch, ...manualBatches]
  }
  
  return manualBatches
})

// 调试用计算属性
const debugModels = computed(() => {
  console.log('computed debugModels called, models.value:', models.value)
  return models.value
})

// Methods
const validateGenerateForm = () => {
  generateErrors.value = {
    model_id: '',
    count: '',
    mac_start: '',
    mac_count: '',
    mac_interval: '',
    mode: '',
    custom_start_serial: ''
  }
  
  let isValid = true

  if (!generateForm.model_id || generateForm.model_id === 0) {
    generateErrors.value.model_id = 'Please select a device model'
    isValid = false
  }

  if (!generateForm.mode) {
    generateErrors.value.mode = 'Please select generation mode'
    isValid = false
  }

  if (generateForm.mode === 'custom') {
    if (!generateForm.custom_start_serial) {
      generateErrors.value.custom_start_serial = 'Please enter custom start serial'
      isValid = false
    } else {
      const last6Digits = generateForm.custom_start_serial.slice(-6)
      if (!/^\d{6}$/.test(last6Digits)) {
        generateErrors.value.custom_start_serial = 'Custom serial number must end with 6 digits'
        isValid = false
      }
    }
  }

  if (!generateForm.count || generateForm.count < 1 || generateForm.count > 10000) {
    generateErrors.value.count = 'Count must be between 1 and 10000'
    isValid = false
  }

  if (!generateForm.mac_start.trim()) {
    generateErrors.value.mac_start = 'Please enter starting MAC address'
    isValid = false
  } else if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(generateForm.mac_start)) {
    generateErrors.value.mac_start = 'Invalid MAC address format'
    isValid = false
  }

  if (!generateForm.mac_count || generateForm.mac_count < 1) {
    generateErrors.value.mac_count = 'MAC count must be at least 1'
    isValid = false
  }

  if (!generateForm.mac_interval || generateForm.mac_interval < 1) {
    generateErrors.value.mac_interval = 'MAC interval must be at least 1'
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
      notyf.error(response.message || 'Failed to fetch serials')
    }
  } catch (error) {
    console.error('Error fetching serials:', error)
    notyf.error('Failed to fetch serials')
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
      notyf.error(response.message || 'Failed to fetch batches')
    }
  } catch (error) {
    console.error('Error fetching batches:', error)
    notyf.error('Failed to fetch batches')
  }
}

const fetchModels = async () => {
  try {
    const response = await modelApi.getAllModels()
    console.log('fetchModels response:', response)
    console.log('response type:', typeof response)
    console.log('response is array:', Array.isArray(response))
    
    // 强制初始化为数组
    if (!models.value) {
      models.value = []
    }
    
    // 兼容处理：如果响应有success字段，使用response.data；否则直接使用response
    if (response && typeof response === 'object') {
      if ('success' in response && response.success && response.data) {
        // 检查是否有models字段（分页响应）
        if (response.data.models && Array.isArray(response.data.models)) {
          models.value = response.data.models
          console.log('Set models from response.data.models:', models.value.length)
        } else if (Array.isArray(response.data)) {
          models.value = response.data
          console.log('Set models from response.data array:', models.value.length)
        } else {
          console.warn('No models found in response.data:', response.data)
          models.value = []
        }
      } else if (Array.isArray(response)) {
        // 直接返回数组的情况
        models.value = response
        console.log('Set models from response array:', models.value.length)
      } else {
        console.warn('Unexpected models response format:', response)
        models.value = []
      }
    } else {
      console.warn('Invalid response:', response)
      models.value = []
    }
    
    console.log('Final models.value:', models.value)
    console.log('Final models.value.length:', models.value?.length)
  } catch (error) {
    console.error('Error fetching models:', error)
    models.value = []
  }
}

const updateStats = () => {
  // 从批次数据计算统计信息
  if (batches.value.length > 0) {
    console.log('Batches data for stats calculation:', batches.value)
    
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
    
    console.log('Calculated stats:', {
      totalSerials: stats.totalSerials,
      unusedCount: stats.unusedCount,
      boundCount: stats.boundCount,
      activatedCount: stats.activatedCount
    })
  } else {
    stats.totalSerials = 0
    stats.unusedCount = 0
    stats.boundCount = 0
    stats.activatedCount = 0
  }
}

const handleGenerate = async () => {
  console.log('handleGenerate called')
  console.log('current models.value:', models.value)
  console.log('current models.value.length:', models.value?.length)
  
  if (!models.value || models.value.length === 0) {
    console.log('Models array is empty or undefined, fetching models...')
    await fetchModels()
  }
  console.log('Models after potential fetch:', models.value)
  console.log('Models length after fetch:', models.value?.length)
  resetGenerateForm()
  generateDialogVisible.value = true
}

const handleSubmitGenerate = async () => {
  if (!validateGenerateForm()) {
    return
  }

  generating.value = true
  try {
    const response = await serialApi.generateSerials(generateForm)
    if (response.success) {
      notyf.success(`Successfully generated ${generateForm.count} serial numbers`)
      generateDialogVisible.value = false
      resetGenerateForm()
      fetchSerials()
      fetchBatches()
    } else {
      notyf.error(response.message || 'Failed to generate serials')
    }
  } catch (error) {
    console.error('Error generating serials:', error)
    notyf.error('Failed to generate serials')
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
    // 对于虚拟批次，不设置searchForm.batch_id，让前端进行过滤
    // 或者我们可以设置为空，获取所有数据然后在前端过滤
    searchForm.batch_id = ''
  } else {
    searchForm.batch_id = currentBatch.value
  }
  
  handleImmediateSearch()
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

const handleExportBatch = async (batchId: string) => {
  try {
    const response = await serialApi.exportSerials(batchId)
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.download = `serials_${batchId}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    notyf.success('Serial numbers exported successfully')
  } catch (error) {
    console.error('Error exporting serials:', error)
    notyf.error('Failed to export serials')
  }
}

const handleDeleteBatch = async (batchId: string) => {
  if (!confirm('Are you sure you want to delete this batch? This will permanently delete all serial numbers in this batch and cannot be undone.')) {
    return
  }
  
  try {
    const response = await serialApi.deleteBatch(batchId)
    if (response.success) {
      notyf.success('Batch deleted successfully')
      if (currentBatch.value === batchId) {
        currentBatch.value = ''
      }
      fetchSerials()
      fetchBatches()
    } else {
      notyf.error(response.message || 'Failed to delete batch')
    }
  } catch (error) {
    console.error('Error deleting batch:', error)
    notyf.error('Failed to delete batch')
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
  generateErrors.value = {
    model_id: '',
    count: '',
    mac_start: '',
    mac_count: '',
    mac_interval: '',
    mode: '',
    custom_start_serial: ''
  }
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
    generateErrors.value.custom_start_serial = ''
  }
}

const validateCustomSerial = () => {
  if (generateForm.mode === 'custom' && generateForm.custom_start_serial) {
    const last6Digits = generateForm.custom_start_serial.slice(-6)
    if (!/^\d{6}$/.test(last6Digits)) {
      generateErrors.value.custom_start_serial = 'Custom serial number must end with 6 digits'
    } else {
      generateErrors.value.custom_start_serial = ''
    }
  }
}

// Watch for filter changes
watch(() => searchForm.batch_id, () => {
  handleDebouncedSearch()
})

watch(() => searchForm.status, () => {
  handleImmediateSearch()
})

watch(() => searchForm.model_id, () => {
  handleImmediateSearch()
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
  title: 'Serial Numbers - EzCloud'
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
                <VDropdown v-if="!batch.is_virtual" spaced right icon="lucide:more-horizontal">
                  <template #content>
                    <a 
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
                    <hr class="dropdown-divider">
                    <a 
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
            :columns="{
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
              device_model: {
                label: 'Device Model',
                searchable: true,
                sortable: true,
                show: currentBatch === VIRTUAL_AUTO_REGISTERED_ID
              },
              mac_info: { 
                label: 'MAC Info',
                grow: 'lg'
              },
              status: { 
                label: 'Status', 
                searchable: true,
                sortable: true,
                align: 'center'
              },
              created_at: { 
                label: 'Created At', 
                sortable: true
              },
              bound_at: { 
                label: 'Bound At', 
                sortable: true
              },
              actions: { 
                label: 'Actions',
                align: 'end'
              }
            }"
            :data="sortedFilteredSerials"
            :loading="loading"
          >
            <template #default="wrapperState">
              <VFlexTableToolbar>
                <template #right>
                  <VField>
                    <VControl>
                      <VSelect v-model="wrapperState.limit" class="is-rounded">
                        <VOption :value="10">10 条/页</VOption>
                        <VOption :value="20">20 条/页</VOption>
                        <VOption :value="50">50 条/页</VOption>
                        <VOption :value="100">100 条/页</VOption>
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
                      title="暂无序列号"
                      subtitle="请生成序列号或检查搜索条件"
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
                      <VTextEllipsis width="140px" class="model-name">
                        {{ (serial.deviceModel || serial.device_model)?.oemname }} 
                        {{ (serial.deviceModel || serial.device_model)?.stdname }}
                      </VTextEllipsis>
                      <small class="model-type">
                        {{ (serial.deviceModel || serial.device_model)?.devtype || 'Gateway' }}
                      </small>
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

                  <template v-if="column.key === 'bound_at'">
                    <VDateTimeSplit v-if="serial.bound_at" :date-string="serial.bound_at" />
                    <span v-else class="common-text-light">-</span>
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
          <VField>
            <VLabel>Device Model *</VLabel>
            <VControl>
              <VSelect 
                v-model="generateForm.model_id"
                :class="{ 'is-danger': generateErrors.model_id }"
                placeholder="Please select device model"
              >
                <VOption :value="0">Please select device model</VOption>
                <template v-if="debugModels && debugModels.length > 0">
                  <VOption 
                    v-for="model in debugModels" 
                    :key="model.id" 
                    :value="model.id"
                  >
                    {{ model.oemname }} {{ model.stdname }}
                  </VOption>
                </template>
              </VSelect>
              <!-- 调试信息 -->
              <div v-if="debugModels.length === 0" style="color: orange; font-size: 12px; margin-top: 4px;">
                Debug: No models available ({{ debugModels.length }} models)
              </div>
              <div v-else style="color: green; font-size: 12px; margin-top: 4px;">
                Debug: {{ debugModels.length }} models loaded
              </div>
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
                  Auto: EZ + ModelID(2位) + YYYYMM + 6位递增号<br>
                  Custom: 自定义起始序列号，最后6位递增
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
        <VButton @click="generateDialogVisible = false">Cancel</VButton>
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

      <template #action>
        <VButton @click="detailDialogVisible = false">Close</VButton>
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
    }

    &.is-virtual {
      border-left: 4px solid var(--info);
      background: linear-gradient(135deg, var(--fade-grey-light-6) 0%, var(--info-light) 100%);
      
      &.is-active {
        border-color: var(--info);
        background: linear-gradient(135deg, var(--info-light) 0%, var(--primary-light) 100%);
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
  
  .model-name {
    font-weight: 500;
    color: var(--dark-text);
    line-height: 1.2;
  }
  
  .model-type {
    color: var(--muted-grey);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
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

</style>