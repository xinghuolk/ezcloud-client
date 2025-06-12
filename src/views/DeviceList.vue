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
          <el-button 
            v-if="selectedDevices.length > 0"
            type="warning"
            @click="showBatchOperationDialog = true"
            :icon="Operation"
          >
            Batch Operations ({{ selectedDevices.length }})
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
        
        <el-table-column label="Status" width="120">
          <template #default="{ row }">
            <div class="status-indicators">
              <el-tag :type="row.is_online ? 'success' : 'danger'" size="small">
                {{ row.is_online ? 'Online' : 'Offline' }}
              </el-tag>
              <el-tag :type="row.is_activate ? 'success' : 'info'" size="small">
                {{ row.is_activate ? 'Activated' : 'Not Activated' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- WiFi状态列 -->
        <el-table-column label="WiFi Status" width="180">
          <template #default="{ row }">
            <WiFiStatus 
              :wifi-status="row.wifiStatus" 
              :show-details="false"
            />
          </template>
        </el-table-column>

        <!-- Modem状态列 -->
        <el-table-column label="Modem Status" width="200">
          <template #default="{ row }">
            <ModemStatus 
              :modem-status="row.modemStatus" 
              :show-details="false"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="Network" width="160">
          <template #default="{ row }">
            <div class="network-info">
              <div v-if="row.wanip">WAN: {{ row.wanip }}</div>
              <div v-if="row.public_ip">Public: {{ row.public_ip }}</div>
              <div v-if="row.primary_mac">MAC: {{ row.primary_mac }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="Last Seen" width="140">
          <template #default="{ row }">
            <span v-if="row.last_seen">{{ formatDate(row.last_seen) }}</span>
            <span v-else>Never</span>
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="120" fixed="right">
          <template #default="{ row }">
            <DeviceActions
              :device="row"
              @success="handleOperationSuccess"
              @details="handleViewDetails"
              @unbind="handleUnbind"
            />
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
      <el-form :model="bindForm" :rules="bindRules" ref="bindFormRef" label-width="120px">
        <el-form-item label="Serial Number" prop="serial">
          <el-input 
            v-model="bindForm.serial" 
            placeholder="Enter device serial number"
            clearable
          />
        </el-form-item>
        <el-form-item label="Device Name">
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

    <!-- 批量操作对话框 -->
    <el-dialog 
      v-model="showBatchOperationDialog" 
      title="Batch Operations" 
      width="500px"
    >
      <div class="batch-operation-content">
        <el-alert
          :title="`Selected ${selectedDevices.length} devices`"
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 20px"
        />
        
        <el-form :model="batchForm" label-width="120px">
          <el-form-item label="Operation">
            <el-select v-model="batchForm.operation" placeholder="Select operation">
              <el-option label="Reboot Devices" value="reboot" />
              <el-option label="Collect Logs" value="logs" />
              <el-option label="Switch to Slot 1" value="sim_slot_1" />
              <el-option label="Switch to Slot 2" value="sim_slot_2" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="showBatchOperationDialog = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="handleBatchOperation"
          :loading="batchLoading"
          :disabled="!batchForm.operation"
        >
          Execute
        </el-button>
      </template>
    </el-dialog>

    <!-- 设备详情对话框 -->
    <el-dialog 
      v-model="detailsDialogVisible" 
      title="Device Details" 
      width="800px"
    >
      <div v-if="selectedDevice" class="device-details">
        <el-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <el-tab-pane label="Basic Info" name="basic">
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
          </el-tab-pane>

          <!-- WiFi状态 -->
          <el-tab-pane label="WiFi Status" name="wifi">
            <WiFiStatus 
              :wifi-status="selectedDevice.wifiStatus" 
              :show-details="true"
            />
          </el-tab-pane>

          <!-- Modem状态 -->
          <el-tab-pane label="Modem Status" name="modem">
            <ModemStatus 
              :modem-status="selectedDevice.modemStatus" 
              :show-details="true"
            />
          </el-tab-pane>
        </el-tabs>
        
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
import { Plus, Refresh, Search, Operation } from '@element-plus/icons-vue'
import { deviceApi } from '@/api'
import type { Device, DeviceQuery } from '@/api/types'
import { useUserStore } from '@/stores/user'
import WiFiStatus from '@/components/WiFiStatus.vue'
import ModemStatus from '@/components/ModemStatus.vue'
import DeviceActions from '@/components/DeviceActions.vue'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const bindLoading = ref(false)
const batchLoading = ref(false)
const deviceList = ref<Device[]>([])
const selectedDevices = ref<Device[]>([])
const selectedDevice = ref<Device | null>(null)

// 对话框控制
const bindDialogVisible = ref(false)
const detailsDialogVisible = ref(false)
const showBatchOperationDialog = ref(false)

// 表单引用
const bindFormRef = ref<FormInstance>()

// 活动标签页
const activeTab = ref('basic')

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

// 批量操作表单
const batchForm = reactive({
  operation: ''
})

// 表单验证规则
const bindRules: FormRules = {
  serial: [
    { required: true, message: 'Please enter serial number', trigger: 'blur' },
    { min: 3, max: 100, message: 'Serial number length should be 3-100 characters', trigger: 'blur' }
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

      // 获取设备的WiFi和Modem状态
      await fetchDeviceStatuses()
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

// 获取设备状态信息
const fetchDeviceStatuses = async () => {
  const promises = deviceList.value.map(async (device) => {
    try {
      const [wifiResponse, modemResponse] = await Promise.all([
        deviceApi.getDeviceWiFi(device.id).catch(() => null),
        deviceApi.getDeviceModem(device.id).catch(() => null)
      ])

      if (wifiResponse?.success) {
        // 将新的嵌套结构转换为旧的扁平数组格式，以兼容现有的WiFiStatus组件
        const wifiData = wifiResponse.data.wifi
        if (wifiData && wifiData.radios) {
          device.wifiStatus = []
          wifiData.radios.forEach((radio: any) => {
            if (radio.ssids && radio.ssids.length > 0) {
              radio.ssids.forEach((ssid: any) => {
                if (!device.wifiStatus) device.wifiStatus = []
                device.wifiStatus.push({
                  id: 0, // 临时ID
                  device_id: device.id,
                  interface: `${radio.band}-${ssid.ssid_index}`,
                  ssid: ssid.ssid,
                  status: ssid.status,
                  frequency: radio.band,
                  channel: radio.channel,
                  tx_power: radio.txpower,
                  connected_clients: ssid.connected_clients,
                  rx_bytes: ssid.rx_bytes,
                  tx_bytes: ssid.tx_bytes,
                  rx_packets: ssid.rx_packets,
                  tx_packets: ssid.tx_packets,
                  error_count: ssid.error_count,
                  noise_level: radio.noise_level,
                  reported_at: ssid.reported_at
                })
              })
            }
          })
        }
      }
      if (modemResponse?.success) {
        device.modemStatus = modemResponse.data
      }
    } catch (error) {
      console.error(`Error fetching status for device ${device.id}:`, error)
    }
  })

  await Promise.all(promises)
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
      
      // 获取详细的WiFi和Modem状态
      const [wifiResponse, modemResponse] = await Promise.all([
        deviceApi.getDeviceWiFi(device.id).catch(() => null),
        deviceApi.getDeviceModem(device.id).catch(() => null)
      ])

      if (wifiResponse?.success && selectedDevice.value) {
        // 将新的嵌套结构转换为旧的扁平数组格式，以兼容现有的WiFiStatus组件
        const wifiData = wifiResponse.data.wifi
        if (wifiData && wifiData.radios) {
          selectedDevice.value.wifiStatus = []
          wifiData.radios.forEach((radio: any) => {
            if (radio.ssids && radio.ssids.length > 0) {
              radio.ssids.forEach((ssid: any) => {
                if (selectedDevice.value && !selectedDevice.value.wifiStatus) {
                  selectedDevice.value.wifiStatus = []
                }
                selectedDevice.value?.wifiStatus?.push({
                  id: 0, // 临时ID
                  device_id: selectedDevice.value?.id || 0,
                  interface: `${radio.band}-${ssid.ssid_index}`,
                  ssid: ssid.ssid,
                  status: ssid.status,
                  frequency: radio.band,
                  channel: radio.channel,
                  tx_power: radio.txpower,
                  connected_clients: ssid.connected_clients,
                  rx_bytes: ssid.rx_bytes,
                  tx_bytes: ssid.tx_bytes,
                  rx_packets: ssid.rx_packets,
                  tx_packets: ssid.tx_packets,
                  error_count: ssid.error_count,
                  noise_level: radio.noise_level,
                  reported_at: ssid.reported_at
                })
              })
            }
          })
        }
      }
      if (modemResponse?.success) {
        selectedDevice.value.modemStatus = modemResponse.data
      }

      detailsDialogVisible.value = true
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('Error fetching device details:', error)
    ElMessage.error('Failed to fetch device details')
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

const handleUnbind = async (device: Device) => {
  try {
    const response = await deviceApi.unbindDevice(device.id)
    if (response.success) {
      ElMessage.success('Device unbound successfully')
      fetchDevices()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('Error unbinding device:', error)
    ElMessage.error('Failed to unbind device')
  }
}

const handleBatchOperation = async () => {
  if (!batchForm.operation || selectedDevices.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `Are you sure you want to execute "${batchForm.operation}" on ${selectedDevices.value.length} devices?`,
      'Confirm Batch Operation',
      {
        confirmButtonText: 'Execute',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )

    batchLoading.value = true
    
    const deviceIds = selectedDevices.value.map(d => d.id)
    let operationType = batchForm.operation
    let params = {}

    if (batchForm.operation === 'sim_slot_1') {
      operationType = 'sim_switch'
      params = { slot: 1 }
    } else if (batchForm.operation === 'sim_slot_2') {
      operationType = 'sim_switch'
      params = { slot: 2 }
    }

    const response = await deviceApi.batchOperation({
      device_ids: deviceIds,
      operation: { type: operationType as any, params }
    })

    if (response.success) {
      ElMessage.success('Batch operation initiated successfully')
      showBatchOperationDialog.value = false
      batchForm.operation = ''
      selectedDevices.value = []
    } else {
      ElMessage.error(response.message || 'Failed to execute batch operation')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error executing batch operation:', error)
      ElMessage.error('Failed to execute batch operation')
    }
  } finally {
    batchLoading.value = false
  }
}

const handleOperationSuccess = (message: string) => {
  ElMessage.success(message)
  fetchDevices()
}

const resetBindForm = () => {
  Object.assign(bindForm, {
    serial: '',
    name: ''
  })
  bindFormRef.value?.clearValidate()
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
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.batch-operation-content {
  padding: 0 20px;
}

.user-info h4 {
  margin: 0 0 12px 0;
  color: #303133;
}
</style> 