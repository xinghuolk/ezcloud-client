<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { serialApi, modelApi } from '/@src/api'
import type { SerialNumber, GenerateSerialParams, DeviceModel } from '/@src/api/types'
import { Notyf } from 'notyf'

definePage({
  meta: {
    requiresAuth: true
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
  mac_interval: 1
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
  mac_interval: ''
})

// Computed
const filteredSerials = computed(() => {
  if (!currentBatch.value) return serials.value
  return serials.value.filter(s => s.batch_id === currentBatch.value)
})

// Methods
const validateGenerateForm = () => {
  generateErrors.value = {
    model_id: '',
    count: '',
    mac_start: '',
    mac_count: '',
    mac_interval: ''
  }
  
  let isValid = true

  if (!generateForm.model_id || generateForm.model_id === 0) {
    generateErrors.value.model_id = 'Please select a device model'
    isValid = false
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
    if (response.success) {
      models.value = response.data
    }
  } catch (error) {
    console.error('Error fetching models:', error)
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
  if (models.value.length === 0) {
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
  searchForm.batch_id = currentBatch.value
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
    mac_interval: 1
  })
  generateErrors.value = {
    model_id: '',
    count: '',
    mac_start: '',
    mac_count: '',
    mac_interval: ''
  }
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const onPageChange = (page: number) => {
  pagination.page = page
  fetchSerials()
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
        <h1 class="title is-3">Serial Number Management</h1>
        <div class="header-actions">
          <VButton 
            color="primary" 
            raised
            :loading="generating"
            @click="handleGenerate"
          >
            <iconify-icon icon="lucide:settings" class="mr-2" />
            Batch Generate
          </VButton>
          <VButton 
            @click="handleRefresh"
            :loading="loading"
          >
            <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
            Refresh
          </VButton>
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
              v-for="batch in batches"
              :key="batch.batch_id"
              class="batch-item"
              :class="{ 'is-active': currentBatch === batch.batch_id }"
              @click="selectBatch(batch.batch_id)"
            >
              <div class="batch-item-header">
                <span class="batch-id">{{ batch.batch_id }}</span>
                <VDropdown spaced right icon="lucide:more-horizontal">
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
                <div v-if="batch.deviceModel" class="model-info">
                  {{ batch.deviceModel.oemname }} {{ batch.deviceModel.stdname }}
                </div>
                <div class="batch-stats">
                  <VTag size="tiny" color="info">Total: {{ batch.total_count || batch.count || 0 }}</VTag>
                  <VTag size="tiny" color="success">Unused: {{ batch.unused_count || 0 }}</VTag>
                  <VTag size="tiny" color="warning">Bound: {{ batch.bound_count || 0 }}</VTag>
                </div>
                <div class="batch-date">{{ formatDateTime(batch.created_at) }}</div>
              </div>
            </div>

            <div v-if="batches.length === 0" class="empty-state">
              <p>No batches found</p>
            </div>
          </div>
        </VCard>
      </div>

      <!-- Serial Numbers Table -->
      <div class="column is-8">
        <VCard radius="smooth">
          <!-- Search & Filter -->
          <div class="common-filter-section mb-4">
            <div class="columns">
              <div class="column is-4">
                <VField>
                  <VLabel>Batch ID</VLabel>
                  <VControl>
                    <VInput
                      v-model="searchForm.batch_id"
                      placeholder="Filter by batch ID"
                      @keyup.enter="handleDebouncedSearch"
                    />
                  </VControl>
                </VField>
              </div>

              <div class="column is-3">
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

              <div class="column is-2">
                <VField>
                  <VLabel>&nbsp;</VLabel>
                  <VControl>
                    <div class="buttons">
                      <VButton @click="handleReset">Reset Filters</VButton>
                    </div>
                  </VControl>
                </VField>
              </div>
            </div>
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
            :data="filteredSerials"
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
                    <VTextEllipsis width="120px" class="date-text">
                      {{ formatDateTime(serial.created_at) }}
                    </VTextEllipsis>
                  </template>

                  <template v-if="column.key === 'bound_at'">
                    <VTextEllipsis width="120px" class="date-text">
                      {{ serial.bound_at ? formatDateTime(serial.bound_at) : '-' }}
                    </VTextEllipsis>
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
              >
                <VOption :value="0">Please select device model</VOption>
                <VOption 
                  v-for="model in models" 
                  :key="model.id" 
                  :value="model.id"
                >
                  {{ model.oemname }} {{ model.stdname }}
                </VOption>
              </VSelect>
              <p v-if="generateErrors.model_id" class="help is-danger">
                {{ generateErrors.model_id }}
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
              <span>{{ formatDateTime(selectedSerial.created_at) }}</span>
            </div>
            <div class="common-info-item">
              <label>Bound At</label>
              <span>{{ formatDateTime(selectedSerial.bound_at || '') }}</span>
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
</style>