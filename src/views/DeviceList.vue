<template>
  <div class="device-list">
    <!-- 页面标题和操作区 -->
    <div class="page-header">
      <div class="header-content">
        <h2>Device Management</h2>
        <div class="header-actions">
          <el-button 
            type="primary" 
            @click="bindDialogVisible = true"
            :icon="Plus"
          >
            Bind Device
          </el-button>
          <el-button 
            @click="handleRefresh"
            :icon="Refresh"
            :loading="loading"
          >
            Refresh
          </el-button>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选区 -->
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="Search">
          <el-input
            v-model="filterForm.search"
            placeholder="Search by serial, MAC, name or IP"
            :prefix-icon="Search"
            style="width: 300px"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="Status">
          <el-select v-model="filterForm.is_online" placeholder="Online Status" clearable style="width: 140px">
            <el-option label="Online" :value="true" />
            <el-option label="Offline" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="Activation">
          <el-select v-model="filterForm.is_activate" placeholder="Activation Status" clearable style="width: 140px">
            <el-option label="Activated" :value="true" />
            <el-option label="Not Activated" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="Brand">
          <el-input
            v-model="filterForm.oemname"
            placeholder="Filter by brand"
            style="width: 150px"
            clearable
          />
        </el-form-item>
        <el-form-item label="Model">
          <el-input
            v-model="filterForm.stdname"
            placeholder="Filter by model"
            style="width: 150px"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">Search</el-button>
          <el-button @click="handleReset">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 设备列表表格 -->
    <el-card class="table-card">
      <el-table 
        :data="deviceList" 
        :loading="loading"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="serial" label="Serial Number" width="120" show-overflow-tooltip />
        
        <el-table-column prop="name" label="Device Name" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.name || 'Unnamed Device' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="Model" width="200">
          <template #default="{ row }">
            <div v-if="row.deviceModel">
              <div class="model-info">
                <strong>{{ row.deviceModel.oemname }}</strong>
                <br>
                <small class="model-stdname">{{ row.deviceModel.stdname }}</small>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="primary_mac" label="MAC Address" width="140" />
        
        <el-table-column label="Status" width="120">
          <template #default="{ row }">
            <div class="status-indicators">
              <el-tag 
                :type="row.is_online ? 'success' : 'danger'" 
                size="small"
                effect="dark"
              >
                {{ row.is_online ? 'Online' : 'Offline' }}
              </el-tag>
              <el-tag 
                :type="row.is_activate ? 'success' : 'info'" 
                size="small"
                style="margin-top: 2px"
              >
                {{ row.is_activate ? 'Activated' : 'Not Activated' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="Network" width="160">
          <template #default="{ row }">
            <div class="network-info">
              <div v-if="row.wanip">
                <small>WAN: {{ row.wanip }}</small>
              </div>
              <div v-if="row.public_ip">
                <small>Public: {{ row.public_ip }}</small>
              </div>
              <div v-if="!row.wanip && !row.public_ip">
                <small>-</small>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="version" label="Version" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.version || '-' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="Last Seen" width="140">
          <template #default="{ row }">
            <span v-if="row.last_seen">{{ formatDate(row.last_seen) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="160" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              link 
              size="small"
              @click="handleViewDetails(row)"
            >
              Details
            </el-button>
            <el-button 
              type="primary" 
              link 
              size="small"
              @click="handleEdit(row)"
            >
              Edit
            </el-button>
            <el-button 
              type="danger" 
              link 
              size="small"
              @click="handleUnbind(row)"
            >
              Unbind
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 设备绑定对话框 -->
    <el-dialog 
      v-model="bindDialogVisible" 
      title="Bind Device" 
      width="500px"
      @closed="resetBindForm"
    >
      <el-form 
        :model="bindForm" 
        :rules="bindRules" 
        ref="bindFormRef"
        label-width="120px"
      >
        <el-form-item label="Serial Number" prop="serial">
          <el-input 
            v-model="bindForm.serial" 
            placeholder="Enter device serial number"
            clearable
          />
        </el-form-item>
        <el-form-item label="Device Name" prop="name">
          <el-input 
            v-model="bindForm.name" 
            placeholder="Enter device name (optional)"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="handleBindDevice"
          :loading="bindLoading"
        >
          Bind Device
        </el-button>
      </template>
    </el-dialog>

    <!-- 设备编辑对话框 -->
    <el-dialog 
      v-model="editDialogVisible" 
      title="Edit Device" 
      width="500px"
      @closed="resetEditForm"
    >
      <el-form 
        :model="editForm" 
        :rules="editRules" 
        ref="editFormRef"
        label-width="120px"
      >
        <el-form-item label="Device Name" prop="name">
          <el-input 
            v-model="editForm.name" 
            placeholder="Enter device name"
            clearable
          />
        </el-form-item>
        <el-form-item label="WAN IP" prop="wanip">
          <el-input 
            v-model="editForm.wanip" 
            placeholder="Enter WAN IP address"
            clearable
          />
        </el-form-item>
        <el-form-item label="Public IP" prop="public_ip">
          <el-input 
            v-model="editForm.public_ip" 
            placeholder="Enter public IP address"
            clearable
          />
        </el-form-item>
        <el-form-item label="Version" prop="version">
          <el-input 
            v-model="editForm.version" 
            placeholder="Enter device version"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="handleUpdateDevice"
          :loading="editLoading"
        >
          Save Changes
        </el-button>
      </template>
    </el-dialog>

    <!-- 设备详情对话框 -->
    <el-dialog 
      v-model="detailsDialogVisible" 
      title="Device Details" 
      width="700px"
    >
      <div v-if="selectedDevice" class="device-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Serial Number">
            {{ selectedDevice.serial }}
          </el-descriptions-item>
          <el-descriptions-item label="Device Name">
            {{ selectedDevice.name || 'Unnamed Device' }}
          </el-descriptions-item>
          <el-descriptions-item label="Brand">
            {{ selectedDevice.deviceModel?.oemname || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="Model">
            {{ selectedDevice.deviceModel?.stdname || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="Device Type">
            {{ selectedDevice.deviceModel?.devtype || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="MAC Address">
            {{ selectedDevice.primary_mac }}
          </el-descriptions-item>
          <el-descriptions-item label="Online Status">
            <el-tag :type="selectedDevice.is_online ? 'success' : 'danger'">
              {{ selectedDevice.is_online ? 'Online' : 'Offline' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Activation Status">
            <el-tag :type="selectedDevice.is_activate ? 'success' : 'info'">
              {{ selectedDevice.is_activate ? 'Activated' : 'Not Activated' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="WAN IP">
            {{ selectedDevice.wanip || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="Public IP">
            {{ selectedDevice.public_ip || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="Version">
            {{ selectedDevice.version || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="First Connect">
            {{ selectedDevice.firsttime ? formatDate(selectedDevice.firsttime) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="Last Seen">
            {{ selectedDevice.last_seen ? formatDate(selectedDevice.last_seen) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="Created At">
            {{ formatDate(selectedDevice.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="selectedDevice.user" class="user-info" style="margin-top: 20px">
          <h4>Bound User</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Username">
              {{ selectedDevice.user.username }}
            </el-descriptions-item>
            <el-descriptions-item label="Email">
              {{ selectedDevice.user.email }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailsDialogVisible = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { deviceApi } from '@/api'
import type { Device, DeviceQuery } from '@/api/types'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const bindLoading = ref(false)
const editLoading = ref(false)
const deviceList = ref<Device[]>([])
const selectedDevices = ref<Device[]>([])
const selectedDevice = ref<Device | null>(null)

// 对话框控制
const bindDialogVisible = ref(false)
const editDialogVisible = ref(false)
const detailsDialogVisible = ref(false)

// 表单引用
const bindFormRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()

// 筛选表单
const filterForm = reactive<DeviceQuery>({
  page: 1,
  limit: 20,
  search: '',
  is_online: undefined,
  is_activate: undefined,
  oemname: '',
  stdname: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})

// 设备绑定表单
const bindForm = reactive({
  serial: '',
  name: ''
})

// 设备编辑表单
const editForm = reactive({
  id: 0,
  name: '',
  wanip: '',
  public_ip: '',
  version: ''
})

// 表单验证规则
const bindRules: FormRules = {
  serial: [
    { required: true, message: 'Please enter serial number', trigger: 'blur' },
    { min: 3, max: 100, message: 'Serial number length should be 3-100 characters', trigger: 'blur' }
  ]
}

const editRules: FormRules = {
  name: [
    { max: 100, message: 'Device name should not exceed 100 characters', trigger: 'blur' }
  ],
  wanip: [
    { pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, message: 'Please enter a valid IP address', trigger: 'blur' }
  ],
  public_ip: [
    { pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, message: 'Please enter a valid IP address', trigger: 'blur' }
  ]
}

// 计算属性
const isAdmin = computed(() => userStore.user?.role === 'admin')

// 方法定义
const fetchDevices = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: filterForm.search || undefined,
      is_online: filterForm.is_online,
      is_activate: filterForm.is_activate,
      oemname: filterForm.oemname || undefined,
      stdname: filterForm.stdname || undefined
    }
    
    const response = await deviceApi.getDevices(params)
    if (response.success) {
      deviceList.value = response.data.devices
      pagination.total = response.data.pagination.total
      pagination.pages = response.data.pagination.pages
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('Error fetching devices:', error)
    ElMessage.error('Failed to fetch devices')
  } finally {
    loading.value = false
  }
}

const handleRefresh = () => {
  fetchDevices()
}

const handleSearch = () => {
  pagination.page = 1
  fetchDevices()
}

const handleReset = () => {
  Object.assign(filterForm, {
    search: '',
    is_online: undefined,
    is_activate: undefined,
    oemname: '',
    stdname: ''
  })
  pagination.page = 1
  fetchDevices()
}

const handleSizeChange = (newSize: number) => {
  pagination.limit = newSize
  pagination.page = 1
  fetchDevices()
}

const handleCurrentChange = (newPage: number) => {
  pagination.page = newPage
  fetchDevices()
}

const handleSelectionChange = (selection: Device[]) => {
  selectedDevices.value = selection
}

const handleViewDetails = async (device: Device) => {
  try {
    const response = await deviceApi.getDevice(device.id)
    if (response.success) {
      selectedDevice.value = response.data
      detailsDialogVisible.value = true
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('Error fetching device details:', error)
    ElMessage.error('Failed to fetch device details')
  }
}

const handleEdit = (device: Device) => {
  editForm.id = device.id
  editForm.name = device.name || ''
  editForm.wanip = device.wanip || ''
  editForm.public_ip = device.public_ip || ''
  editForm.version = device.version || ''
  editDialogVisible.value = true
}

const handleUnbind = async (device: Device) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to unbind device "${device.name || device.serial}"? This will remove the device from your account.`,
      'Confirm Unbind',
      {
        confirmButtonText: 'Unbind',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    const response = await deviceApi.unbindDevice(device.id)
    if (response.success) {
      ElMessage.success('Device unbound successfully')
      fetchDevices()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error unbinding device:', error)
      ElMessage.error('Failed to unbind device')
    }
  }
}

const handleBindDevice = async () => {
  if (!bindFormRef.value) return
  
  try {
    const valid = await bindFormRef.value.validate()
    if (!valid) return
    
    bindLoading.value = true
    const response = await deviceApi.bindDevice(bindForm)
    if (response.success) {
      ElMessage.success('Device bound successfully')
      bindDialogVisible.value = false
      fetchDevices()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('Error binding device:', error)
    ElMessage.error('Failed to bind device')
  } finally {
    bindLoading.value = false
  }
}

const handleUpdateDevice = async () => {
  if (!editFormRef.value) return
  
  try {
    const valid = await editFormRef.value.validate()
    if (!valid) return
    
    editLoading.value = true
    const { id, ...updateData } = editForm
    const response = await deviceApi.updateDevice(id, updateData)
    if (response.success) {
      ElMessage.success('Device updated successfully')
      editDialogVisible.value = false
      fetchDevices()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('Error updating device:', error)
    ElMessage.error('Failed to update device')
  } finally {
    editLoading.value = false
  }
}

const resetBindForm = () => {
  Object.assign(bindForm, {
    serial: '',
    name: ''
  })
  bindFormRef.value?.clearValidate()
}

const resetEditForm = () => {
  Object.assign(editForm, {
    id: 0,
    name: '',
    wanip: '',
    public_ip: '',
    version: ''
  })
  editFormRef.value?.clearValidate()
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  fetchDevices()
})
</script>

<style scoped>
.device-list {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.table-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.status-indicators {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-info {
  line-height: 1.4;
}

.model-stdname {
  color: #909399;
}

.network-info {
  font-size: 12px;
  line-height: 1.3;
}

.device-details {
  max-height: 500px;
  overflow-y: auto;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.user-info h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table th) {
  background-color: #fafafa;
}

:deep(.el-descriptions__label) {
  width: 120px;
  font-weight: 600;
}
</style> 