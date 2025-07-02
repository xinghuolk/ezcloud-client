<template>
  <div class="modem-status">
    <div v-if="!modemStatus" class="status-offline">
      <el-icon class="status-icon offline"><Close /></el-icon>
      <span class="status-text">Modem Offline</span>
    </div>
    
    <div v-else class="status-online">
      <div class="modem-summary">
        <el-icon class="status-icon online"><Connection /></el-icon>
        <div class="status-details">
          <div class="network-info">
            <span class="network-type">{{ modemStatus.network_type || 'Unknown' }}</span>
            <span class="operator">{{ modemStatus.operator || 'No Operator' }}</span>
          </div>
          <div class="signal-info">
            <span class="signal-strength" :class="getSignalClass(modemStatus.rssi)">
              📶 {{ formatSignalStrength(modemStatus.rssi) }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 详细信息弹窗触发 -->
      <el-button 
        v-if="showDetails"
        link 
        size="small" 
        @click="showDetailDialog = true"
        class="details-btn"
      >
        Details
      </el-button>
    </div>

    <!-- Modem详情对话框 -->
    <el-dialog 
      v-model="showDetailDialog" 
      title="Modem Status Details" 
      width="600px"
    >
      <div class="modem-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Active SIM Slot">
            <el-tag type="primary" size="small">
              Slot {{ modemStatus?.active_slot || 1 }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Operator">
            {{ modemStatus?.operator || 'Unknown' }}
          </el-descriptions-item>
          <el-descriptions-item label="Network Type">
            <el-tag 
              :type="getNetworkTypeColor(modemStatus?.network_type)" 
              size="small"
            >
              {{ modemStatus?.network_type || 'Unknown' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Signal Strength">
            <span :class="getSignalClass(modemStatus?.rssi)">
              {{ formatSignalStrength(modemStatus?.rssi) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="ICCID">
            <span class="mono-text">{{ modemStatus?.iccid || 'N/A' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="IMSI">
            <span class="mono-text">{{ modemStatus?.imsi || 'N/A' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Phone Number">
            {{ modemStatus?.phone_number || 'N/A' }}
          </el-descriptions-item>
          <el-descriptions-item label="APN">
            {{ modemStatus?.apn_name || 'N/A' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 流量统计 -->
        <div class="traffic-section">
          <h4>Traffic Statistics</h4>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-card class="traffic-card">
                <div class="traffic-item">
                  <div class="traffic-label">Download</div>
                  <div class="traffic-value">{{ formatBytes(modemStatus?.rx_bytes || 0) }}</div>
                  <div class="traffic-speed">{{ formatSpeed(modemStatus?.rx_speed || 0) }}</div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card class="traffic-card">
                <div class="traffic-item">
                  <div class="traffic-label">Upload</div>
                  <div class="traffic-value">{{ formatBytes(modemStatus?.tx_bytes || 0) }}</div>
                  <div class="traffic-speed">{{ formatSpeed(modemStatus?.tx_speed || 0) }}</div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
        
        <div v-if="modemStatus?.last_update" class="last-update">
          Last updated: {{ formatDate(new Date(modemStatus.last_update)) }}
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showDetailDialog = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  ElIcon, 
  ElButton, 
  ElDialog, 
  ElDescriptions, 
  ElDescriptionsItem, 
  ElTag, 
  ElCard, 
  ElRow, 
  ElCol 
} from 'element-plus'
import { Connection, Close } from '@element-plus/icons-vue'
import type { ModemStatus } from '@/api/types'

interface Props {
  modemStatus?: ModemStatus | null
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true
})

const showDetailDialog = ref(false)

// 获取信号强度等级
const getSignalClass = (signalStrength?: number) => {
  if (!signalStrength) return 'signal-unknown'
  
  if (signalStrength >= -70) return 'signal-excellent'
  if (signalStrength >= -85) return 'signal-good'
  if (signalStrength >= -100) return 'signal-fair'
  return 'signal-poor'
}

// 格式化信号强度
const formatSignalStrength = (signalStrength?: number) => {
  if (!signalStrength) return 'Unknown'
  return `${signalStrength}dBm`
}

// 获取网络类型颜色
const getNetworkTypeColor = (networkType?: string) => {
  if (!networkType) return 'info'
  
  switch (networkType.toLowerCase()) {
    case '5g': return 'success'
    case '4g':
    case 'lte': return 'primary'
    case '3g': return 'warning'
    case '2g': return 'danger'
    default: return 'info'
  }
}

// 格式化字节数
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 格式化速度
const formatSpeed = (speed: number) => {
  if (speed === 0) return '0 bps'
  
  const k = 1024
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps']
  const i = Math.floor(Math.log(speed) / Math.log(k))
  
  return parseFloat((speed / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (date: Date) => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.modem-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-offline {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
}

.status-online {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modem-summary {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  font-size: 16px;
}

.status-icon.online {
  color: #67c23a;
}

.status-icon.offline {
  color: #f56c6c;
}

.status-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.network-info {
  display: flex;
  gap: 6px;
  align-items: center;
}

.network-type {
  font-weight: 600;
  color: #409eff;
}

.operator {
  color: #606266;
}

.signal-info {
  display: flex;
  align-items: center;
}

.signal-strength {
  font-size: 11px;
  font-weight: 500;
}

.signal-excellent {
  color: #67c23a;
}

.signal-good {
  color: #e6a23c;
}

.signal-fair {
  color: #f56c6c;
}

.signal-poor {
  color: #f56c6c;
}

.signal-unknown {
  color: #909399;
}

.details-btn {
  padding: 2px 4px;
  font-size: 11px;
  height: auto;
  min-height: auto;
}

.modem-details {
  max-height: 500px;
  overflow-y: auto;
}

.mono-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 2px;
}

.traffic-section {
  margin-top: 20px;
}

.traffic-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.traffic-card {
  text-align: center;
}

.traffic-item {
  padding: 8px;
}

.traffic-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.traffic-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.traffic-speed {
  font-size: 11px;
  color: #67c23a;
}

.last-update {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #909399;
}
</style> 