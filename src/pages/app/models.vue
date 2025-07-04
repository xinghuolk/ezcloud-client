<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useVendorStore } from '/@src/stores/vendors'
import { modelApi } from '/@src/api'
import type { DeviceModel, CreateDeviceModelParams } from '/@src/api/types'
import type { VTagColor } from '/@src/components/base/VTag.vue'
import { Notyf } from 'notyf'

definePage({
  meta: {
    requiresAuth: true
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

const onVendorChange = (vendorId: number) => {
  const selectedVendor = vendorStore.vendors.find(v => v.id === vendorId)
  if (selectedVendor) {
    form.oemname = selectedVendor.name
  }
}

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
  <div class="page-content-inner">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="title is-3">Device Model Management</h1>
        <VButton color="primary" raised @click="handleAdd">
          <iconify-icon icon="lucide:plus" class="mr-2" />
          Add Model
        </VButton>
      </div>
    </div>

    <!-- Search & Filter -->
    <VCard radius="smooth" class="mb-6">
      <h3 class="title is-6 mb-4">Search & Filter</h3>
      <div class="filter-form">
        <div class="columns is-multiline">
          <div class="column is-3">
            <VField>
              <VLabel>Search</VLabel>
              <VControl>
                <VInput
                  v-model="searchForm.search"
                  placeholder="Search model name, vendor, description"
                  @keyup.enter="handleSearch"
                />
                <iconify-icon icon="lucide:search" class="form-icon" />
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
                  @keyup.enter="handleSearch"
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
                <div class="buttons">
                  <VButton color="primary" @click="handleSearch">Search</VButton>
                  <VButton @click="handleReset">Reset</VButton>
                </div>
              </VControl>
            </VField>
          </div>
        </div>
      </div>
    </VCard>

    <!-- Models Table -->
    <VCard radius="smooth">
      <VFlexTableWrapper
        :columns="{
          id: 'ID',
          vendor: 'Vendor',
          oemname: 'OEM Name',
          stdname: 'Standard Model',
          devtype: 'Device Type',
          description: 'Description',
          serial_count: 'Serial Count',
          is_active: 'Status',
          created_at: 'Created At',
          actions: 'Actions'
        }"
        :data="models"
      >
        <template #default="wrapperState">
          <VFlexTable rounded>
            <template #body-cell="{ row: model, column }">
              <template v-if="column.key === 'id'">
                <span class="model-id">{{ model.id }}</span>
              </template>

              <template v-if="column.key === 'vendor'">
                <div v-if="model.vendor">
                  <VTag color="info" size="tiny">{{ model.vendor.name }}</VTag>
                </div>
                <span v-else>-</span>
              </template>

              <template v-if="column.key === 'oemname'">
                <span class="model-oemname">{{ model.oemname }}</span>
              </template>

              <template v-if="column.key === 'stdname'">
                <span class="model-stdname">{{ model.stdname }}</span>
              </template>

              <template v-if="column.key === 'devtype'">
                <VTag :color="getDeviceTypeColor(model.devtype)" size="tiny">
                  {{ getDeviceTypeLabel(model.devtype) }}
                </VTag>
              </template>

              <template v-if="column.key === 'description'">
                <VTextEllipsis width="200px">
                  {{ model.description || 'No description' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'serial_count'">
                <span class="serial-count">{{ model.serial_count || 0 }}</span>
              </template>

              <template v-if="column.key === 'is_active'">
                <VTag :color="model.is_active ? 'success' : 'danger'" size="tiny">
                  {{ model.is_active ? 'Active' : 'Inactive' }}
                </VTag>
              </template>

              <template v-if="column.key === 'created_at'">
                <span class="date-text">{{ formatDateTime(model.created_at) }}</span>
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
        <VButton @click="dialogVisible = false">Cancel</VButton>
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
      @close="detailDialogVisible = false"
    >
      <template #content>
        <div v-if="currentModel" class="model-details">
          <div class="model-info-grid">
            <div class="info-item">
              <label>ID</label>
              <span>{{ currentModel.id }}</span>
            </div>
            <div class="info-item">
              <label>Vendor Name</label>
              <VTag v-if="currentModel.vendor" color="info">{{ currentModel.vendor.name }}</VTag>
              <span v-else>-</span>
            </div>
            <div class="info-item">
              <label>OEM Name</label>
              <span>{{ currentModel.oemname }}</span>
            </div>
            <div class="info-item">
              <label>Standard Model</label>
              <span>{{ currentModel.stdname }}</span>
            </div>
            <div class="info-item">
              <label>Device Type</label>
              <VTag :color="getDeviceTypeColor(currentModel.devtype)">
                {{ getDeviceTypeLabel(currentModel.devtype) }}
              </VTag>
            </div>
            <div class="info-item">
              <label>Status</label>
              <VTag :color="currentModel.is_active ? 'success' : 'danger'">
                {{ currentModel.is_active ? 'Active' : 'Inactive' }}
              </VTag>
            </div>
            <div class="info-item">
              <label>Serial Count</label>
              <span>{{ currentModel.serial_count || 0 }}</span>
            </div>
            <div class="info-item">
              <label>Device Count</label>
              <span>{{ currentModel.device_count || 0 }}</span>
            </div>
            <div class="info-item">
              <label>Created At</label>
              <span>{{ formatDateTime(currentModel.created_at) }}</span>
            </div>
            <div class="info-item">
              <label>Updated At</label>
              <span>{{ formatDateTime(currentModel.updated_at) }}</span>
            </div>
            <div class="info-item full-width">
              <label>Description</label>
              <span>{{ currentModel.description || 'No description' }}</span>
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
.page-content-inner {
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;

    .title {
      margin: 0 0 0.5rem 0;
      line-height: 1.2;
      color: var(--dark-text);
    }
  }
}

.filter-form {
  .buttons {
    gap: 0.5rem;
  }
}

:deep(.form-icon) {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  color: var(--muted-grey);
  font-size: 1rem;
  z-index: 1;
}

:deep(.input) {
  padding-left: 2.5rem;
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

.model-details {
  .model-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;

    .info-item {
      padding: 1rem;
      background: var(--fade-grey-light-6);
      border-radius: var(--radius);
      border: 1px solid var(--fade-grey-light-3);

      &.full-width {
        grid-column: 1 / -1;
      }

      label {
        display: block;
        font-weight: 600;
        color: var(--muted-grey);
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      span {
        color: var(--dark-text);
        font-weight: 500;
      }
    }
  }
}

.is-dark {
  .model-info-grid .info-item {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
  }
}

@media only screen and (max-width: 767px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .model-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>