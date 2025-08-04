<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useVendorStore } from '/@src/stores/vendors'
import { modelApi } from '/@src/api'
import type { DeviceModel, CreateDeviceModelParams } from '/@src/api/types'
import type { VTagColor } from '/@src/components/base/VTag.vue'
import { Notyf } from 'notyf'
import { formatDateTime } from '/@src/utils/date-formatter'

definePage({
  meta: {
    requiresAuth: true,
    requiresAdmin: true
  }
})

const vendorStore = useVendorStore()
const notyf = new Notyf()

// Device types
const DEVICE_TYPES = [
  { value: 'router', label: 'Router' },
  { value: 'gateway', label: 'Gateway' },
  { value: 'switch', label: 'Switch' },
  { value: 'modem', label: 'Modem' },
  { value: 'camera', label: 'Camera' },
  { value: 'sensor', label: 'Sensor' },
  { value: 'controller', label: 'Controller' }
]

// State
const loading = ref(false)
const submitting = ref(false)
const models = ref<DeviceModel[]>([])
const currentModel = ref<DeviceModel | null>(null)

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Dialog controls
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const editingId = ref<number | null>(null)

// Search form
const searchForm = reactive({
  search: '',
  oemname: '',
  devtype: '',
  is_active: undefined as boolean | undefined
})

// Model form
const form = reactive<CreateDeviceModelParams>({
  vendor_id: 0,
  oemname: '',
  stdname: '',
  devtype: '',
  description: ''
})

// Pagination
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})

// Validation errors
const errors = ref({
  vendor_id: '',
  oemname: '',
  stdname: '',
  devtype: ''
})

// Computed
const dialogTitle = computed(() => editingId.value ? 'Edit Model' : 'Add Model')

// Methods
const getDeviceTypeLabel = (type: string) => {
  const deviceType = DEVICE_TYPES.find(t => t.value === type)
  return deviceType ? deviceType.label : type
}

const getDeviceTypeColor = (type: string): VTagColor => {
  const colorMap: Record<string, VTagColor> = {
    'router': 'primary',
    'gateway': 'success',
    'switch': 'warning',
    'modem': 'info',
    'camera': 'danger',
    'sensor': 'primary',
    'controller': 'warning'
  }
  return colorMap[type] || 'secondary'
}

const validateForm = () => {
  errors.value = {
    vendor_id: '',
    oemname: '',
    stdname: '',
    devtype: ''
  }
  
  let isValid = true

  if (!form.vendor_id || form.vendor_id === 0) {
    errors.value.vendor_id = 'Please select a vendor'
    isValid = false
  }

  if (!form.oemname.trim()) {
    errors.value.oemname = 'Please enter OEM name'
    isValid = false
  } else if (form.oemname.length > 100) {
    errors.value.oemname = 'OEM name cannot exceed 100 characters'
    isValid = false
  }

  if (!form.stdname.trim()) {
    errors.value.stdname = 'Please enter standard model name'
    isValid = false
  } else if (form.stdname.length > 100) {
    errors.value.stdname = 'Standard model name cannot exceed 100 characters'
    isValid = false
  }

  if (!form.devtype) {
    errors.value.devtype = 'Please select device type'
    isValid = false
  }

  return isValid
}

const fetchModels = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchForm.search || undefined,
      oemname: searchForm.oemname || undefined,
      devtype: searchForm.devtype || undefined
    }

    const response = await modelApi.getModels(params)
    if (response.success) {
      models.value = response.data.models || []
      if (response.data.pagination) {
        pagination.total = response.data.pagination.total
        pagination.pages = response.data.pagination.totalPages
      }
    } else {
      notyf.error(response.message || 'Failed to fetch models')
    }
  } catch (error) {
    console.error('Error fetching models:', error)
    notyf.error('Failed to fetch models')
  } finally {
    loading.value = false
  }
}

const handleAdd = async () => {
  if (vendorStore.vendors.length === 0) {
    await vendorStore.fetchVendors()
  }
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = async (model: DeviceModel) => {
  if (vendorStore.vendors.length === 0) {
    await vendorStore.fetchVendors()
  }
  
  editingId.value = model.id
  Object.assign(form, {
    vendor_id: model.vendor_id,
    oemname: model.oemname,
    stdname: model.stdname,
    devtype: model.devtype,
    description: model.description || ''
  })
  dialogVisible.value = true
}

const handleView = (model: DeviceModel) => {
  currentModel.value = model
  detailDialogVisible.value = true
}

const handleDelete = async (model: DeviceModel) => {
  if (!confirm(`Are you sure you want to delete model "${model.stdname}" by ${model.oemname}? This action cannot be undone.`)) {
    return
  }
  
  try {
    const response = await modelApi.deleteModel(model.id)
    if (response.success) {
      notyf.success('Model deleted successfully')
      fetchModels()
    } else {
      notyf.error(response.message || 'Failed to delete model')
    }
  } catch (error) {
    console.error('Error deleting model:', error)
    notyf.error('Failed to delete model')
  }
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const response = editingId.value
      ? await modelApi.updateModel(editingId.value, form)
      : await modelApi.createModel(form)
    
    if (response.success) {
      notyf.success(editingId.value ? 'Model updated successfully' : 'Model created successfully')
      dialogVisible.value = false
      resetForm()
      fetchModels()
    } else {
      notyf.error(response.message || 'Operation failed')
    }
  } catch (error) {
    console.error('Error submitting form:', error)
    notyf.error('Operation failed')
  } finally {
    submitting.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchModels()
}

// Debounced search for text inputs
const handleDebouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    pagination.page = 1
    fetchModels()
  }, 500)
}

// Immediate search for dropdowns
const handleImmediateSearch = () => {
  pagination.page = 1
  fetchModels()
}

const handleReset = () => {
  Object.assign(searchForm, {
    search: '',
    oemname: '',
    devtype: '',
    is_active: undefined
  })
  pagination.page = 1
  fetchModels()
}

const onPageChange = (page: number) => {
  pagination.page = page
  fetchModels()
}


const resetForm = () => {
  Object.assign(form, {
    vendor_id: 0,
    oemname: '',
    stdname: '',
    devtype: '',
    description: ''
  })
  errors.value = {
    vendor_id: '',
    oemname: '',
    stdname: '',
    devtype: ''
  }
}

// 使用统一的日期格式化工具
// const formatDateTime = formatDateTime  // 已导入

const onVendorChange = (vendorId: number) => {
  const selectedVendor = vendorStore.vendors.find(v => v.id === vendorId)
  if (selectedVendor) {
    form.oemname = selectedVendor.name
  }
}

// Watch for filter changes
watch(() => searchForm.search, () => {
  handleDebouncedSearch()
})

watch(() => searchForm.oemname, () => {
  handleDebouncedSearch()
})

watch(() => searchForm.devtype, () => {
  handleImmediateSearch()
})

watch(() => searchForm.is_active, () => {
  handleImmediateSearch()
})

// Watch for pagination limit changes
watch(() => pagination.limit, () => {
  pagination.page = 1
  fetchModels()
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchModels(),
    vendorStore.fetchVendors()
  ])
})

useHead({
  title: 'Device Models - EzCloud'
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">Device Model Management</h1>
          <p class="subtitle is-6">Manage device models and specifications</p>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <VCard>
      <!-- Filter Section -->
      <div class="card-content">
        <div class="columns is-multiline">
          <div class="column is-3">
            <VField>
              <VLabel>Search Models</VLabel>
              <VControl>
                <VInput
                  v-model="searchForm.search"
                  placeholder="Search model name, vendor, description"
                  icon="lucide:search"
                />
              </VControl>
            </VField>
          </div>

          <div class="column is-2">
            <VField>
              <VLabel>OEM Name</VLabel>
              <VControl>
                <VInput
                  v-model="searchForm.oemname"
                  placeholder="OEM Name"
                />
              </VControl>
            </VField>
          </div>

          <div class="column is-2">
            <VField>
              <VLabel>Device Type</VLabel>
              <VControl>
                <VSelect v-model="searchForm.devtype">
                  <VOption value="">All Types</VOption>
                  <VOption v-for="type in DEVICE_TYPES" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>

          <div class="column is-2">
            <VField>
              <VLabel>Status</VLabel>
              <VControl>
                <VSelect v-model="searchForm.is_active">
                  <VOption value="">All Status</VOption>
                  <VOption :value="true">Active</VOption>
                  <VOption :value="false">Inactive</VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>

          <div class="column is-3">
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
                    <VButton color="primary" @click="handleAdd">
                      Add Model
                    </VButton>
                  </div>
                </div>
              </VControl>
            </VField>
          </div>
        </div>
      </div>

      <!-- Models Table -->
      <VFlexTableWrapper
        :columns="{
          id: { 
            label: 'ID',
            sortable: true,
            bold: true
          },
          vendor: { 
            label: 'Vendor',
            searchable: true,
            sortable: true,
            grow: true
          },
          oemname: { 
            label: 'OEM Name',
            searchable: true,
            sortable: true,
            bold: true,
            grow: true
          },
          stdname: { 
            label: 'Standard Model',
            searchable: true,
            sortable: true,
            grow: true
          },
          devtype: { 
            label: 'Device Type',
            searchable: true,
            sortable: true,
          },
          description: { 
            label: 'Description',
            searchable: true,
            grow: 'lg'
          },
          serial_count: { 
            label: 'Serial Count',
            sortable: true,
          },
          is_active: { 
            label: 'Status',
            searchable: true,
            sortable: true,
          },
          created_at: { 
            label: 'Created At',
            sortable: true
          },
          actions: { 
            label: 'Actions',
          }
        }"
        :data="models"
      >
        <template #default="wrapperState">
          <VFlexTableToolbar>
            <template #right>
              <VField>
                <VControl>
                  <VSelect v-model="pagination.limit" class="is-rounded">
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
                  <VFlexTableCell><VPlaceload width="60px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: 'lg' }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="60px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="100px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ align: 'end' }"><VPlaceload width="40px" /></VFlexTableCell>
                </div>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="wrapperState.data?.length === 0" class="flex-list-inner">
                <VPlaceholderSection
                  title="暂无设备型号"
                  subtitle="请添加设备型号或检查搜索条件"
                  class="my-6"
                />
              </div>
            </template>

            <template #body-cell="{ row: model, column }">
              <template v-if="column.key === 'id'">
                <span class="model-id">{{ model.id }}</span>
              </template>

              <template v-if="column.key === 'vendor'">
                <div v-if="model.vendor">
                  <VTag color="info" rounded>
                    <VTextEllipsis width="100px">{{ model.vendor.name }}</VTextEllipsis>
                  </VTag>
                </div>
                <span v-else>-</span>
              </template>

              <template v-if="column.key === 'oemname'">
                <VTextEllipsis width="120px" class="model-oemname">
                  {{ model.oemname }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'stdname'">
                <VTextEllipsis width="120px" class="model-stdname">
                  {{ model.stdname }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'devtype'">
                <VTag :color="getDeviceTypeColor(model.devtype)" rounded>
                  {{ getDeviceTypeLabel(model.devtype) }}
                </VTag>
              </template>

              <template v-if="column.key === 'description'">
                <VTextEllipsis width="200px" class="common-text-light">
                  {{ model.description || 'No description' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'serial_count'">
                <span class="serial-count has-text-weight-semibold">{{ model.serial_count || 0 }}</span>
              </template>

              <template v-if="column.key === 'is_active'">
                <VTag :color="model.is_active ? 'success' : 'danger'" rounded>
                  {{ model.is_active ? 'Active' : 'Inactive' }}
                </VTag>
              </template>

              <template v-if="column.key === 'created_at'">
                <VDateTimeSplit :date-string="model.created_at" />
              </template>

              <template v-if="column.key === 'actions'">
                <VDropdown spaced right icon="lucide:more-horizontal">
                  <template #content>
                    <a class="dropdown-item is-media" @click="handleView(model)">
                      <div class="icon">
                        <iconify-icon icon="lucide:eye" />
                      </div>
                      <div class="meta">
                        <span>View Details</span>
                      </div>
                    </a>
                    <a class="dropdown-item is-media" @click="handleEdit(model)">
                      <div class="icon">
                        <iconify-icon icon="lucide:edit" />
                      </div>
                      <div class="meta">
                        <span>Edit Model</span>
                      </div>
                    </a>
                    <hr class="dropdown-divider">
                    <a class="dropdown-item is-media has-text-danger" @click="handleDelete(model)">
                      <div class="icon">
                        <iconify-icon icon="lucide:trash-2" />
                      </div>
                      <div class="meta">
                        <span>Delete Model</span>
                      </div>
                    </a>
                  </template>
                </VDropdown>
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

    <!-- Add/Edit Model Modal -->
    <VModal
      :open="dialogVisible"
      :title="dialogTitle"
      size="medium"
      actions="right"
      cancelLabel="Cancel"
      @close="dialogVisible = false"
    >
      <template #content>
        <form @submit.prevent="handleSubmit">
          <VField>
            <VLabel>Select Vendor *</VLabel>
            <VControl>
              <VSelect 
                v-model="form.vendor_id" 
                :class="{ 'is-danger': errors.vendor_id }"
                @change="onVendorChange"
              >
                <VOption :value="0">Please select vendor</VOption>
                <VOption 
                  v-for="vendor in vendorStore.vendors" 
                  :key="vendor.id" 
                  :value="vendor.id"
                >
                  {{ vendor.name }}
                </VOption>
              </VSelect>
              <p v-if="errors.vendor_id" class="help is-danger">
                {{ errors.vendor_id }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>OEM Name *</VLabel>
            <VControl>
              <VInput
                v-model="form.oemname"
                placeholder="Enter OEM name"
                :class="{ 'is-danger': errors.oemname }"
              />
              <p v-if="errors.oemname" class="help is-danger">
                {{ errors.oemname }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>Standard Model *</VLabel>
            <VControl>
              <VInput
                v-model="form.stdname"
                placeholder="Enter standard model name, e.g.: HG8045Q, AX6000"
                :class="{ 'is-danger': errors.stdname }"
              />
              <p v-if="errors.stdname" class="help is-danger">
                {{ errors.stdname }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>Device Type *</VLabel>
            <VControl>
              <VSelect 
                v-model="form.devtype"
                :class="{ 'is-danger': errors.devtype }"
              >
                <VOption value="">Please select device type</VOption>
                <VOption 
                  v-for="type in DEVICE_TYPES" 
                  :key="type.value" 
                  :value="type.value"
                >
                  {{ type.label }}
                </VOption>
              </VSelect>
              <p v-if="errors.devtype" class="help is-danger">
                {{ errors.devtype }}
              </p>
            </VControl>
          </VField>

          <VField>
            <VLabel>Description</VLabel>
            <VControl>
              <VTextarea
                v-model="form.description"
                placeholder="Enter model description"
                rows="3"
              />
            </VControl>
          </VField>
        </form>
      </template>

      <template #action>
        <VButton 
          color="primary" 
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ editingId ? 'Update' : 'Create' }}
        </VButton>
      </template>
    </VModal>

    <!-- Model Details Modal -->
    <VModal
      :open="detailDialogVisible"
      title="Model Details"
      size="big"
      actions="right"
      cancelLabel="Close"
      @close="detailDialogVisible = false"
    >
      <template #content>
        <div v-if="currentModel" class="model-details">
          <div class="common-info-grid">
            <div class="common-info-item">
              <label>ID</label>
              <span>{{ currentModel.id }}</span>
            </div>
            <div class="common-info-item">
              <label>Vendor Name</label>
              <VTag v-if="currentModel.vendor" color="info">{{ currentModel.vendor.name }}</VTag>
              <span v-else>-</span>
            </div>
            <div class="common-info-item">
              <label>OEM Name</label>
              <span>{{ currentModel.oemname }}</span>
            </div>
            <div class="common-info-item">
              <label>Standard Model</label>
              <span>{{ currentModel.stdname }}</span>
            </div>
            <div class="common-info-item">
              <label>Device Type</label>
              <VTag :color="getDeviceTypeColor(currentModel.devtype)">
                {{ getDeviceTypeLabel(currentModel.devtype) }}
              </VTag>
            </div>
            <div class="common-info-item">
              <label>Status</label>
              <VTag :color="currentModel.is_active ? 'success' : 'danger'">
                {{ currentModel.is_active ? 'Active' : 'Inactive' }}
              </VTag>
            </div>
            <div class="common-info-item">
              <label>Serial Count</label>
              <span>{{ currentModel.serial_count || 0 }}</span>
            </div>
            <div class="common-info-item">
              <label>Device Count</label>
              <span>{{ currentModel.device_count || 0 }}</span>
            </div>
            <div class="common-info-item">
              <label>Created At</label>
              <VDateTimeSplit :date-string="currentModel.created_at" />
            </div>
            <div class="common-info-item">
              <label>Updated At</label>
              <VDateTimeSplit :date-string="currentModel.updated_at" />
            </div>
            <div class="info-item full-width">
              <label>Description</label>
              <span>{{ currentModel.description || 'No description' }}</span>
            </div>
          </div>
        </div>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
:deep(.field.is-grouped) {
  flex-wrap: wrap;
  gap: 0.5rem;
}

.model-id {
  font-weight: 600;
  color: var(--primary);
}

.model-oemname {
  font-weight: 600;
  color: var(--dark-text);
}

.model-stdname {
  color: var(--dark-text);
}

.serial-count {
  font-weight: 600;
  color: var(--primary);
}

.date-text {
  font-size: 0.85rem;
  color: var(--muted-grey);
}


</style>