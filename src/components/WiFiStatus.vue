<template>
  <div class="wifi-status">
    <div v-if="!wifiStatus || wifiStatus.length === 0" class="status-offline">
      <el-icon class="status-icon offline"><Close /></el-icon>
      <span class="status-text">WiFi Offline</span>
    </div>
    
    <div v-else class="status-online">
      <div class="wifi-summary">
        <el-icon class="status-icon online"><Connection /></el-icon>
        <div class="status-details">
          <div class="frequency-status">
            <span 
              v-for="status in frequencyStatus" 
              :key="status.frequency"
              :class="['frequency-badge', status.status]"
            >
              {{ status.frequency }}
            </span>
          </div>
          <div class="client-count">
            {{ totalClients }} clients
          </div>
        </div>
      </div>
      
      <!-- 详细信息弹窗触发 -->
      <el-button 
        v-if="showDetails"
        type="text" 
        size="small" 
        @click="showDetailDialog = true"
        class="details-btn"
      >
        Details
      </el-button>
    </div>

    <!-- WiFi详情对话框 -->
    <el-dialog 
      v-model="showDetailDialog" 
      title="WiFi Status Details" 
      width="600px"
    >
      <div class="wifi-details">
        <el-table :data="wifiStatus" stripe>
          <el-table-column prop="interface" label="Interface" width="100" />
          <el-table-column prop="ssid" label="SSID" width="150" show-overflow-tooltip />
          <el-table-column label="Status" width="80">
            <template #default="{ row }">
              <el-tag 
                :type="getStatusType(row.status)" 
                size="small"
              >
                {{ row.status.toUpperCase() }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="frequency" label="Band" width="80" />
          <el-table-column prop="channel" label="Channel" width="80" />
          <el-table-column prop="connected_clients" label="Clients" width="80" />
          <el-table-column prop="tx_power" label="Power" width="80">
            <template #default="{ row }">
              {{ row.tx_power }}dBm
            </template>
          </el-table-column>
          <el-table-column label="Traffic" width="120">
            <template #default="{ row }">
              <div class="traffic-info">
                <div>↓ {{ formatBytes(row.rx_bytes) }}</div>
                <div>↑ {{ formatBytes(row.tx_bytes) }}</div>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <div v-if="lastUpdate" class="last-update">
          Last updated: {{ formatDate(lastUpdate) }}
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showDetailDialog = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElIcon, ElButton, ElDialog, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { Connection, Close } from '@element-plus/icons-vue'
import type { WiFiStatus } from '@/api/types'

interface Props {
  wifiStatus?: WiFiStatus[]
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true
})

const showDetailDialog = ref(false)

// 计算频段状态
const frequencyStatus = computed(() => {
  if (!props.wifiStatus || props.wifiStatus.length === 0) return []
  
  const frequencies = new Map<string, { status: string, clients: number }>()
  
  props.wifiStatus.forEach(status => {
    const freq = status.frequency || 'Unknown'
    const existing = frequencies.get(freq) || { status: 'down', clients: 0 }
    
    if (status.status === 'up') {
      existing.status = 'up'
    }
    existing.clients += status.connected_clients || 0
    
    frequencies.set(freq, existing)
  })
  
  return Array.from(frequencies.entries()).map(([frequency, data]) => ({
    frequency,
    status: data.status,
    clients: data.clients
  }))
})

// 计算总客户端数
const totalClients = computed(() => {
  if (!props.wifiStatus) return 0
  return props.wifiStatus.reduce((total, status) => total + (status.connected_clients || 0), 0)
})

// 最后更新时间
const lastUpdate = computed(() => {
  if (!props.wifiStatus || props.wifiStatus.length === 0) return null
  
  const dates = props.wifiStatus
    .map(status => new Date(status.reported_at))
    .sort((a, b) => b.getTime() - a.getTime())
  
  return dates[0]
})

// 获取状态类型
const getStatusType = (status: string) => {
  switch (status) {
    case 'up': return 'success'
    case 'down': return 'info'
    case 'error': return 'danger'
    default: return 'info'
  }
}

// 格式化字节数
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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
.wifi-status {
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

.wifi-summary {
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

.frequency-status {
  display: flex;
  gap: 4px;
}

.frequency-badge {
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 500;
}

.frequency-badge.up {
  background-color: #f0f9ff;
  color: #67c23a;
  border: 1px solid #b3e19d;
}

.frequency-badge.down {
  background-color: #f5f5f5;
  color: #909399;
  border: 1px solid #dcdfe6;
}

.client-count {
  color: #606266;
  font-weight: 500;
}

.details-btn {
  padding: 2px 4px;
  font-size: 11px;
  height: auto;
  min-height: auto;
}

.wifi-details {
  max-height: 400px;
  overflow-y: auto;
}

.traffic-info {
  font-size: 11px;
  line-height: 1.2;
}

.last-update {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #909399;
}
</style> 