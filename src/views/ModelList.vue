<template>
  <div class="model-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>Device Model Management</h3>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            Add Model
          </el-button>
        </div>
      </template>
      
      <!-- 搜索筛选区域 -->
      <div class="search-bar">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-input
              v-model="searchForm.search"
              placeholder="Search model name, vendor, description"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="4">
            <el-input
              v-model="searchForm.oemname"
              placeholder="OEM Name"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
          </el-col>
          <el-col :span="4">
            <el-select
              v-model="searchForm.devtype"
              placeholder="Device Type"
              clearable
              @change="handleSearch"
            >
              <el-option
                v-for="item in DEVICE_TYPES"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select
              v-model="searchForm.is_active"
              placeholder="Status"
              clearable
              @change="handleSearch"
            >
              <el-option label="Active" :value="true" />
              <el-option label="Inactive" :value="false" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              Search
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              Reset
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="models"
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="ID" width="80" sortable="custom" />
        <el-table-column prop="vendor" label="Vendor Name" min-width="120">
          <template #default="{ row }">
            <div v-if="row.vendor">
              <el-tag size="small" type="info">{{ row.vendor.name }}</el-tag>
            </div>
            <div v-else>
              <el-text type="info">-</el-text>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="oemname" label="OEM Name" min-width="120" />
        <el-table-column prop="stdname" label="Standard Model Name" min-width="150" />
        <el-table-column prop="devtype" label="Device Type" width="120">
          <template #default="{ row }">
            <el-tag :type="getDeviceTypeTagType(row.devtype)">
              {{ getDeviceTypeLabel(row.devtype) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip />
        <el-table-column prop="serialNumberCount" label="Serial Count" width="120" align="center">
          <template #default="{ row }">
            <el-link type="primary" @click="viewSerials(row)">
              {{ row.serialNumberCount || 0 }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="Status" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? 'Active' : 'Inactive' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="Created At" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">Details</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">Edit</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="Select Vendor" prop="vendor_id">
          <el-select
            v-model="form.vendor_id"
            placeholder="Please select vendor"
            style="width: 100%"
            filterable
            clearable
          >
            <el-option
              v-for="vendor in vendorStore.activeVendors"
              :key="vendor.id"
              :label="vendor.name"
              :value="vendor.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="OEM Name" prop="oemname">
          <el-input 
            v-model="form.oemname" 
            placeholder="Enter OEM name"
          />
        </el-form-item>
        <el-form-item label="Standard Model" prop="stdname">
          <el-input v-model="form.stdname" placeholder="Enter standard model name, e.g.: HG8045Q, AX6000" />
        </el-form-item>
        <el-form-item label="Device Type" prop="devtype">
          <el-select v-model="form.devtype" placeholder="Please select device type" style="width: 100%">
            <el-option
              v-for="item in DEVICE_TYPES"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Description" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="Enter model description"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="Status" prop="is_active">
          <el-radio-group v-model="form.is_active">
            <el-radio :value="true">Active</el-radio>
            <el-radio :value="false">Inactive</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingId ? 'Update' : 'Create' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="Model Details"
      width="800px"
    >
      <div v-if="currentModel" class="model-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentModel.id }}</el-descriptions-item>
          <el-descriptions-item label="Vendor Name" v-if="currentModel.vendor">
            <el-tag type="info">{{ currentModel.vendor.name }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Vendor Name" v-else>
            <el-text type="info">-</el-text>
          </el-descriptions-item>
          <el-descriptions-item label="OEM Name">{{ currentModel.oemname }}</el-descriptions-item>
          <el-descriptions-item label="Standard Model">{{ currentModel.stdname }}</el-descriptions-item>
          <el-descriptions-item label="Device Type">
            <el-tag :type="getDeviceTypeTagType(currentModel.devtype)">
              {{ getDeviceTypeLabel(currentModel.devtype) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Status">
            <el-tag :type="currentModel.is_active ? 'success' : 'danger'">
              {{ currentModel.is_active ? 'Active' : 'Inactive' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Serial Count">
            {{ currentModel.serialNumberCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="Created At" span="2">
            {{ formatDateTime(currentModel.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="Updated At" span="2">
            {{ formatDateTime(currentModel.updated_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="Description" span="2">
            {{ currentModel.description || 'No description' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useModelsStore } from '@/stores/models'
import { useVendorStore } from '@/stores/vendors'
import { DEVICE_TYPES, getDeviceTypeLabel, type DeviceModel, type ModelCreateParams } from '@/api/models'
import { formatDateTime } from '@/utils/date'

// Store
const modelsStore = useModelsStore()
const vendorStore = useVendorStore()

// 响应式数据
const searchForm = reactive({
  search: '',
  oemname: '',
  devtype: '',
  is_active: undefined as boolean | undefined
})

const form = reactive<ModelCreateParams>({
  vendor_id: undefined,
  oemname: '',
  stdname: '',
  devtype: '',
  description: '',
  is_active: true
})

const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const currentModel = ref<DeviceModel | null>(null)
const formRef = ref<FormInstance>()

// 计算属性
const { models, loading, pagination } = modelsStore
const dialogTitle = computed(() => editingId.value ? 'Edit Model' : 'Add Model')

// 表单验证规则
const rules = {
  vendor_id: [
    { required: true, message: 'Please select a vendor', trigger: 'change' }
  ],
  oemname: [
    { required: true, message: 'Please enter OEM name', trigger: 'blur' },
    { max: 100, message: 'OEM name cannot exceed 100 characters', trigger: 'blur' }
  ],
  stdname: [
    { required: true, message: 'Please enter standard model name', trigger: 'blur' },
    { max: 100, message: 'Standard model name cannot exceed 100 characters', trigger: 'blur' }
  ],
  devtype: [
    { required: true, message: 'Please select device type', trigger: 'change' }
  ],
  description: [
    { max: 1000, message: 'Description cannot exceed 1000 characters', trigger: 'blur' }
  ]
}

// Get device type tag style
const getDeviceTypeTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    'router': 'primary',
    'gateway': 'success',
    'switch': 'warning',
    'modem': 'info',
    'camera': 'danger',
    'sensor': 'primary',
    'controller': 'warning'
  }
  return typeMap[type] || ''
}

// Vendor selection change handler
const onVendorChange = (vendorId: number) => {
  const selectedVendor = vendorStore.vendors.find(v => v.id === vendorId)
  if (selectedVendor) {
    form.oemname = selectedVendor.name
  }
}

// Reset form
const resetForm = () => {
  Object.assign(form, {
    vendor_id: undefined,
    oemname: '',
    stdname: '',
    devtype: '',
    description: '',
    is_active: true
  })
  formRef.value?.clearValidate()
}

// Event handlers
const handleAdd = async () => {
  // Ensure vendor data is loaded
  if (vendorStore.vendors.length === 0) {
    await vendorStore.fetchVendors({ is_active: true })
  }
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = async (row: DeviceModel) => {
  // Ensure vendor data is loaded
  if (vendorStore.vendors.length === 0) {
    await vendorStore.fetchVendors({ is_active: true })
  }
  
  editingId.value = row.id
  Object.assign(form, {
    vendor_id: row.vendor_id || undefined,
    oemname: row.oemname,
    stdname: row.stdname,
    devtype: row.devtype,
    description: row.description || '',
    is_active: row.is_active
  })
  dialogVisible.value = true
}

const handleView = (row: DeviceModel) => {
  currentModel.value = row
  detailDialogVisible.value = true
}

const handleDelete = async (row: DeviceModel) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure to delete model "${row.oemname} ${row.stdname}"? This operation cannot be undone.`,
      'Confirm Delete',
      {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    await modelsStore.deleteModel(row.id)
  } catch (error) {
    // User cancelled deletion
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const success = editingId.value
      ? await modelsStore.updateModel(editingId.value, form)
      : await modelsStore.createModel(form)
    
    if (success) {
      dialogVisible.value = false
      resetForm()
    }
  } finally {
    submitting.value = false
  }
}

const handleSearch = () => {
  modelsStore.searchModels(searchForm)
}

const handleReset = () => {
  Object.assign(searchForm, {
    search: '',
    oemname: '',
    devtype: '',
    is_active: undefined
  })
  modelsStore.resetSearch()
}

const handleSizeChange = (size: number) => {
  modelsStore.changePageAndSize(1, size)
}

const handleCurrentChange = (page: number) => {
  modelsStore.changePageAndSize(page)
}

const handleSortChange = (sort: any) => {
  // TODO: Implement sorting functionality
  console.log('Sort:', sort)
}

const viewSerials = (row: DeviceModel) => {
  // TODO: Navigate to serial number management page
  console.log('View serials:', row)
  ElMessage.info('Serial number management feature is under development')
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    modelsStore.fetchModels(),
    vendorStore.fetchVendors({ is_active: true })
  ])
})
</script>

<style scoped>
.model-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.search-bar {
  margin-bottom: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.model-detail {
  padding: 20px 0;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
}

.vendor-info {
  margin-top: 4px;
}

.form-help {
  margin-top: 4px;
}
</style> 