<template>
  <div class="device-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="$router.back()">
        Back
      </el-button>
      <div class="header-info">
        <h1>Device Details</h1>
        <p v-if="device">{{ device.name || device.serial }}</p>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else-if="device" class="device-content">
      <!-- 基本信息 -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <h3>Basic Information</h3>
            <div class="status-badges">
              <el-tag :type="device.is_online ? 'success' : 'danger'" size="large">
                {{ device.is_online ? 'Online' : 'Offline' }}
              </el-tag>
              <el-tag :type="device.is_activate ? 'success' : 'warning'" size="large">
                {{ device.is_activate ? 'Activated' : 'Not Activated' }}
              </el-tag>
            </div>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="Device Name">
            <div class="editable-field">
              <span v-if="!editingName">{{ device.name || 'Unnamed Device' }}</span>
              <el-input 
                v-else 
                v-model="editName" 
                size="small" 
                @blur="saveDeviceName"
                @keyup.enter="saveDeviceName"
              />
              <el-button 
                v-if="!editingName"
                type="text" 
                :icon="Edit" 
                size="small"
                @click="startEditName"
              />
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="Serial Number">
            {{ device.serial }}
          </el-descriptions-item>
          <el-descriptions-item label="Primary MAC">
            {{ device.primary_mac }}
          </el-descriptions-item>
          <el-descriptions-item label="Brand">
            {{ device.deviceModel?.oemname || 'Unknown' }}
          </el-descriptions-item>
          <el-descriptions-item label="Model">
            {{ device.deviceModel?.stdname || 'Unknown' }}
          </el-descriptions-item>
          <el-descriptions-item label="Device Type">
            {{ device.deviceModel?.devtype || 'Unknown' }}
          </el-descriptions-item>
          <el-descriptions-item label="WAN IP">
            {{ device.wanip || 'Not Available' }}
          </el-descriptions-item>
          <el-descriptions-item label="Public IP">
            {{ device.public_ip || 'Not Available' }}
          </el-descriptions-item>
          <el-descriptions-item label="Firmware Version">
            {{ device.version || 'Unknown' }}
          </el-descriptions-item>
                     <el-descriptions-item label="First Connection">
             {{ formatDateTime(device.firsttime || null) }}
           </el-descriptions-item>
           <el-descriptions-item label="Last Seen">
             {{ formatDateTime(device.last_seen || null) }}
           </el-descriptions-item>
          <el-descriptions-item label="Created At">
            {{ formatDateTime(device.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- MAC地址范围信息 -->
      <el-card v-if="device.serialNumber" class="mac-info-card">
        <template #header>
          <h3>MAC Address Range</h3>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Batch ID">
            {{ device.serialNumber.batch_id }}
          </el-descriptions-item>
          <el-descriptions-item label="MAC Start">
            {{ device.serialNumber.mac_start }}
          </el-descriptions-item>
          <el-descriptions-item label="MAC Count">
            {{ device.serialNumber.mac_count }}
          </el-descriptions-item>
          <el-descriptions-item label="MAC Interval">
            {{ device.serialNumber.mac_interval }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="mac-range">
          <h4>Available MAC Addresses:</h4>
          <div class="mac-list">
            <el-tag 
              v-for="(mac, index) in calculatedMacAddresses" 
              :key="index"
              class="mac-tag"
            >
              {{ mac }}
            </el-tag>
          </div>
        </div>
      </el-card>

      <!-- 设备状态历史 -->
      <el-card class="status-card">
        <template #header>
          <div class="card-header">
            <h3>Status History</h3>
            <el-button :icon="Refresh" @click="loadStatusHistory">
              Refresh
            </el-button>
          </div>
        </template>

        <div v-if="statusHistory.length === 0" class="empty-state">
          <el-empty description="No status data available" />
        </div>

        <el-table v-else :data="statusHistory" style="width: 100%">
          <el-table-column prop="reported_at" label="Time" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.reported_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="cpuload" label="CPU Load" width="100">
            <template #default="{ row }">
              {{ row.cpuload ? `${row.cpuload}%` : 'N/A' }}
            </template>
          </el-table-column>
          <el-table-column prop="memload" label="Memory Load" width="120">
            <template #default="{ row }">
              {{ row.memload ? `${row.memload}%` : 'N/A' }}
            </template>
          </el-table-column>
          <el-table-column label="Connected Hosts" width="140">
            <template #default="{ row }">
              {{ row.hostnum }} / {{ row.hostmax }}
            </template>
          </el-table-column>
          <el-table-column prop="upload_total" label="Upload (MB)" width="120">
            <template #default="{ row }">
              {{ formatBytes(row.upload_total) }}
            </template>
          </el-table-column>
          <el-table-column prop="download_total" label="Download (MB)" width="120">
            <template #default="{ row }">
              {{ formatBytes(row.download_total) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 操作按钮 -->
      <el-card class="actions-card">
        <template #header>
          <h3>Device Operations</h3>
        </template>

        <div class="action-buttons">
          <el-button type="primary" :icon="RefreshRight" @click="restartDevice">
            Restart Device
          </el-button>
          <el-button type="warning" :icon="Setting" @click="configureDevice">
            Configure
          </el-button>
          <el-button type="danger" :icon="Delete" @click="unbindDevice">
            Unbind Device
          </el-button>
        </div>
      </el-card>
    </div>

    <div v-else class="error-state">
      <el-result
        icon="error"
        title="Device Not Found"
        sub-title="The requested device could not be found."
      >
        <template #extra>
          <el-button type="primary" @click="$router.push('/devices')">
            Back to Device List
          </el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Refresh,
  RefreshRight,
  Setting,
  Delete
} from '@element-plus/icons-vue'
import { useDeviceStore } from '@/stores/devices'
import { deviceApi } from '@/api'
import type { Device, DeviceStatus } from '@/api/types'

const route = useRoute()
const router = useRouter()
const deviceStore = useDeviceStore()

// 状态
const device = ref<Device | null>(null)
const loading = ref(true)
const statusHistory = ref<DeviceStatus[]>([])
const editingName = ref(false)
const editName = ref('')

// 计算MAC地址范围
const calculatedMacAddresses = computed(() => {
  if (!device.value?.serialNumber) return []
  
  const { mac_start, mac_count, mac_interval } = device.value.serialNumber
  const addresses = []
  
  // 将MAC地址转换为数字进行计算
  const macToNumber = (mac: string) => {
    return parseInt(mac.replace(/:/g, ''), 16)
  }
  
  // 将数字转换回MAC地址格式
  const numberToMac = (num: number) => {
    const hex = num.toString(16).padStart(12, '0').toUpperCase()
    return hex.match(/.{2}/g)?.join(':') || ''
  }
  
  const startNum = macToNumber(mac_start)
  
  for (let i = 0; i < mac_count; i++) {
    const macNum = startNum + (i * mac_interval)
    addresses.push(numberToMac(macNum))
  }
  
  return addresses
})

// 格式化日期时间
const formatDateTime = (dateTime: string | null) => {
  if (!dateTime) return 'Never'
  return new Date(dateTime).toLocaleString()
}

// 格式化字节数
const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

// 开始编辑设备名称
const startEditName = () => {
  editName.value = device.value?.name || ''
  editingName.value = true
}

// 保存设备名称
const saveDeviceName = async () => {
  if (!device.value) return
  
  try {
    const success = await deviceStore.updateDeviceName(device.value.id, editName.value)
    if (success && device.value) {
      device.value.name = editName.value
    }
  } catch (error) {
    console.error('Failed to update device name:', error)
  } finally {
    editingName.value = false
  }
}

// 加载设备详情
const loadDeviceDetails = async () => {
  const deviceId = Number(route.params.id)
  if (!deviceId) {
    router.push('/devices')
    return
  }

  loading.value = true
  try {
    device.value = await deviceStore.fetchDeviceDetails(deviceId)
    if (device.value) {
      await loadStatusHistory()
    }
  } catch (error) {
    console.error('Failed to load device details:', error)
    ElMessage.error('Failed to load device details')
  } finally {
    loading.value = false
  }
}

// 加载状态历史
const loadStatusHistory = async () => {
  if (!device.value) return
  
  try {
    const response = await deviceApi.getDeviceStatus(device.value.id, { limit: 10 })
    if (response.success) {
      statusHistory.value = response.data
    }
  } catch (error) {
    console.error('Failed to load status history:', error)
  }
}

// 重启设备
const restartDevice = async () => {
  if (!device.value) return
  
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to restart this device?',
      'Confirm Restart',
      {
        confirmButtonText: 'Restart',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    const response = await deviceApi.operateDevice(device.value.id, 'restart')
    if (response.success) {
      ElMessage.success('Restart command sent successfully')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to restart device:', error)
      ElMessage.error('Failed to restart device')
    }
  }
}

// 配置设备
const configureDevice = () => {
  ElMessage.info('Configuration feature coming soon')
}

// 解绑设备
const unbindDevice = async () => {
  if (!device.value) return
  
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to unbind this device? This action cannot be undone.',
      'Confirm Unbind',
      {
        confirmButtonText: 'Unbind',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    
    const success = await deviceStore.unbindDevice(device.value.id)
    if (success) {
      router.push('/devices')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to unbind device:', error)
    }
  }
}

onMounted(() => {
  loadDeviceDetails()
})
</script>

<style scoped>
.device-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.header-info h1 {
  margin: 0 0 5px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.header-info p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.loading-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.device-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card,
.mac-info-card,
.status-card,
.actions-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.status-badges {
  display: flex;
  gap: 10px;
}

.editable-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mac-range {
  margin-top: 20px;
}

.mac-range h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.mac-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mac-tag {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .status-badges {
    align-self: stretch;
    justify-content: space-between;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
  }
}
</style> 