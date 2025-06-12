<template>
  <div class="wifi-status-display">
    <div class="wifi-header">
      <h3>
        <el-icon><Wifi /></el-icon>
        WiFi状态监控
      </h3>
      <div class="wifi-controls">
        <el-button 
          size="small" 
          @click="refreshStatus"
          :loading="loading"
          type="primary"
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button 
          size="small" 
          @click="showHistory = !showHistory"
          type="info"
        >
          <el-icon><TrendCharts /></el-icon>
          {{ showHistory ? '隐藏历史' : '显示历史' }}
        </el-button>
      </div>
    </div>

    <!-- WiFi总体状态 -->
    <div class="wifi-overview" v-if="wifiStatus">
      <el-card shadow="never" class="overview-card">
        <div class="overview-stats">
          <div class="stat-item">
            <span class="stat-label">活跃频段</span>
            <span class="stat-value">{{ activeRadioCount }}/{{ totalRadioCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总连接数</span>
            <span class="stat-value">{{ totalConnectedClients }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">活跃SSID</span>
            <span class="stat-value">{{ activeSSIDCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最后更新</span>
            <span class="stat-value">{{ formatTime(lastUpdateTime) }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 频段状态卡片 -->
    <div class="radio-cards" v-if="wifiStatus && wifiStatus.radios">
      <el-card 
        v-for="radio in wifiStatus.radios" 
        :key="radio.band"
        :class="['radio-card', { 'radio-disabled': !radio.enabled }]"
        shadow="hover"
      >
        <template #header>
          <div class="radio-header">
            <div class="radio-title">
              <el-tag 
                :type="getBandTagType(radio.band)"
                size="large"
                effect="dark"
              >
                {{ radio.band }}
              </el-tag>
              <span class="radio-status">
                <el-icon 
                  :class="radio.enabled ? 'status-online' : 'status-offline'"
                >
                  <CircleCheck v-if="radio.enabled" />
                  <CircleClose v-else />
                </el-icon>
                {{ radio.enabled ? '启用' : '禁用' }}
              </span>
            </div>
            <div class="radio-info">
              <span v-if="radio.channel">信道: {{ radio.channel }}</span>
              <span v-if="radio.txpower">功率: {{ radio.txpower }}%</span>
              <span v-if="radio.temperature">温度: {{ radio.temperature }}°C</span>
            </div>
          </div>
        </template>

        <!-- 射频统计信息 -->
        <div class="radio-stats">
          <div class="stats-row">
            <div class="stat-box">
              <div class="stat-title">发送流量</div>
              <div class="stat-number">{{ formatBytes(radio.total_tx_bytes) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">接收流量</div>
              <div class="stat-number">{{ formatBytes(radio.total_rx_bytes) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">噪声电平</div>
              <div class="stat-number">{{ radio.noise_level }}dBm</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">错误计数</div>
              <div class="stat-number">{{ radio.total_error_count }}</div>
            </div>
          </div>
        </div>

        <!-- SSID接口列表 -->
        <div class="ssid-list" v-if="radio.ssids && radio.ssids.length > 0">
          <h4>SSID接口 ({{ radio.ssids.length }}/4)</h4>
          <div class="ssid-grid">
            <div 
              v-for="ssid in radio.ssids" 
              :key="`${radio.band}-${ssid.ssid_index}`"
              :class="['ssid-item', `ssid-status-${ssid.status}`]"
            >
              <div class="ssid-header">
                <div class="ssid-name">
                  <el-icon><Wifi /></el-icon>
                  {{ ssid.name || ssid.ssid || `SSID-${ssid.ssid_index}` }}
                </div>
                <el-tag 
                  :type="getSSIDStatusType(ssid.status)"
                  size="small"
                >
                  {{ ssid.status.toUpperCase() }}
                </el-tag>
              </div>
              
              <div class="ssid-details">
                <div class="ssid-row">
                  <span class="label">连接数:</span>
                  <span class="value">
                    {{ ssid.connected_clients }}/{{ ssid.max_clients }}
                    <el-progress 
                      :percentage="(ssid.connected_clients / ssid.max_clients) * 100"
                      :stroke-width="4"
                      :show-text="false"
                      :color="getClientProgressColor(ssid.connected_clients / ssid.max_clients)"
                    />
                  </span>
                </div>
                
                <div class="ssid-row">
                  <span class="label">流量:</span>
                  <span class="value">
                    ↑{{ formatBytes(ssid.tx_bytes) }} 
                    ↓{{ formatBytes(ssid.rx_bytes) }}
                  </span>
                </div>
                
                <div class="ssid-row" v-if="ssid.rx_errors > 0 || ssid.tx_errors > 0">
                  <span class="label">错误:</span>
                  <span class="value error">
                    TX:{{ ssid.tx_errors }} RX:{{ ssid.rx_errors }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-ssids">
          <el-empty description="该频段暂无SSID配置" :image-size="60" />
        </div>
      </el-card>
    </div>

    <!-- 历史数据图表 -->
    <div v-if="showHistory" class="history-section">
      <el-card shadow="never">
        <template #header>
          <div class="history-header">
            <h4>WiFi状态历史</h4>
            <div class="history-controls">
              <el-select v-model="selectedBand" placeholder="选择频段" size="small" style="width: 120px">
                <el-option label="全部" value="" />
                <el-option label="2.4G" value="2.4G" />
                <el-option label="5G" value="5G" />
                <el-option label="6G" value="6G" />
              </el-select>
              <el-select v-model="historyHours" placeholder="时间范围" size="small" style="width: 120px">
                <el-option label="1小时" :value="1" />
                <el-option label="6小时" :value="6" />
                <el-option label="24小时" :value="24" />
                <el-option label="7天" :value="168" />
              </el-select>
              <el-button size="small" @click="loadHistory" :loading="historyLoading">
                加载历史
              </el-button>
            </div>
          </div>
        </template>
        
        <div class="history-content">
          <div v-if="historyData.length > 0" class="history-charts">
            <!-- 这里可以集成图表库如ECharts显示历史趋势 -->
            <div class="chart-placeholder">
              <el-table :data="historyData.slice(0, 10)" size="small">
                <el-table-column prop="band" label="频段" width="80" />
                <el-table-column prop="enabled" label="状态" width="80">
                  <template #default="{ row }">
                    <el-tag :type="row.enabled ? 'success' : 'danger'" size="small">
                      {{ row.enabled ? '启用' : '禁用' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="channel" label="信道" width="80" />
                <el-table-column prop="txpower" label="功率" width="80" />
                <el-table-column prop="temperature" label="温度" width="80" />
                <el-table-column prop="total_tx_bytes" label="发送流量" width="120">
                  <template #default="{ row }">
                    {{ formatBytes(row.total_tx_bytes) }}
                  </template>
                </el-table-column>
                <el-table-column prop="total_rx_bytes" label="接收流量" width="120">
                  <template #default="{ row }">
                    {{ formatBytes(row.total_rx_bytes) }}
                  </template>
                </el-table-column>
                <el-table-column prop="reported_at" label="时间" width="160">
                  <template #default="{ row }">
                    {{ formatTime(row.reported_at) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
          <div v-else class="no-history">
            <el-empty description="暂无历史数据" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !wifiStatus" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- 错误状态 -->
    <div v-if="error && !wifiStatus" class="error-container">
      <el-alert
        :title="error"
        type="error"
        show-icon
        :closable="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Wifi, 
  Refresh, 
  TrendCharts, 
  CircleCheck, 
  CircleClose 
} from '@element-plus/icons-vue'

// Props
interface Props {
  deviceId: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  refreshInterval: 30000 // 30秒
})

// 响应式数据
const wifiStatus = ref<any>(null)
const loading = ref(false)
const error = ref('')
const showHistory = ref(false)
const historyData = ref<any[]>([])
const historyLoading = ref(false)
const selectedBand = ref('')
const historyHours = ref(24)
const lastUpdateTime = ref<Date | null>(null)

// 自动刷新定时器
let refreshTimer: NodeJS.Timeout | null = null

// 计算属性
const activeRadioCount = computed(() => {
  if (!wifiStatus.value?.radios) return 0
  return wifiStatus.value.radios.filter((radio: any) => radio.enabled).length
})

const totalRadioCount = computed(() => {
  return wifiStatus.value?.radios?.length || 0
})

const totalConnectedClients = computed(() => {
  if (!wifiStatus.value?.radios) return 0
  return wifiStatus.value.radios.reduce((total: number, radio: any) => {
    if (radio.ssids) {
      return total + radio.ssids.reduce((radioTotal: number, ssid: any) => {
        return radioTotal + (ssid.connected_clients || 0)
      }, 0)
    }
    return total
  }, 0)
})

const activeSSIDCount = computed(() => {
  if (!wifiStatus.value?.radios) return 0
  return wifiStatus.value.radios.reduce((total: number, radio: any) => {
    if (radio.ssids) {
      return total + radio.ssids.filter((ssid: any) => ssid.enabled && ssid.status === 'up').length
    }
    return total
  }, 0)
})

// 方法
const refreshStatus = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // 这里调用API获取WiFi状态
    const response = await fetch(`/api/v1/devices/${props.deviceId}/wifi/status`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    if (data.success) {
      wifiStatus.value = data.data.wifi
      lastUpdateTime.value = new Date()
    } else {
      throw new Error(data.message || 'Failed to get WiFi status')
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load WiFi status'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

const loadHistory = async () => {
  historyLoading.value = true
  
  try {
    const params = new URLSearchParams({
      hours: historyHours.value.toString()
    })
    
    if (selectedBand.value) {
      params.append('band', selectedBand.value)
    }
    
    const response = await fetch(`/api/v1/devices/${props.deviceId}/wifi/status/history?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    if (data.success) {
      historyData.value = data.data.history || []
    } else {
      throw new Error(data.message || 'Failed to get WiFi history')
    }
  } catch (err: any) {
    ElMessage.error(err.message || 'Failed to load WiFi history')
  } finally {
    historyLoading.value = false
  }
}

// 工具函数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (time: string | Date | null): string => {
  if (!time) return '--'
  const date = typeof time === 'string' ? new Date(time) : time
  return date.toLocaleString('zh-CN')
}

const getBandTagType = (band: string): string => {
  switch (band) {
    case '2.4G': return 'primary'
    case '5G': return 'success'
    case '6G': return 'warning'
    default: return 'info'
  }
}

const getSSIDStatusType = (status: string): string => {
  switch (status) {
    case 'up': return 'success'
    case 'down': return 'info'
    case 'error': return 'danger'
    default: return 'info'
  }
}

const getClientProgressColor = (ratio: number): string => {
  if (ratio < 0.5) return '#67c23a'
  if (ratio < 0.8) return '#e6a23c'
  return '#f56c6c'
}

// 生命周期
onMounted(() => {
  refreshStatus()
  
  if (props.autoRefresh) {
    refreshTimer = setInterval(refreshStatus, props.refreshInterval)
  }
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

// 暴露方法给父组件
defineExpose({
  refreshStatus,
  loadHistory
})
</script>

<style scoped>
.wifi-status-display {
  padding: 16px;
}

.wifi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.wifi-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wifi-controls {
  display: flex;
  gap: 8px;
}

.wifi-overview {
  margin-bottom: 16px;
}

.overview-card {
  border: none;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 8px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.radio-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.radio-card {
  transition: all 0.3s ease;
}

.radio-card.radio-disabled {
  opacity: 0.6;
}

.radio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.radio-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.radio-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.status-online {
  color: #67c23a;
}

.status-offline {
  color: #f56c6c;
}

.radio-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.radio-stats {
  margin-bottom: 16px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.stat-box {
  text-align: center;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.stat-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-number {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.ssid-list h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #606266;
}

.ssid-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.ssid-item {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
  transition: all 0.3s ease;
}

.ssid-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.ssid-status-up {
  border-left: 3px solid #67c23a;
}

.ssid-status-down {
  border-left: 3px solid #909399;
}

.ssid-status-error {
  border-left: 3px solid #f56c6c;
}

.ssid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ssid-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  font-size: 14px;
}

.ssid-details {
  font-size: 12px;
}

.ssid-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.ssid-row:last-child {
  margin-bottom: 0;
}

.label {
  color: #909399;
}

.value {
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.value.error {
  color: #f56c6c;
}

.no-ssids {
  text-align: center;
  padding: 20px;
}

.history-section {
  margin-top: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-header h4 {
  margin: 0;
}

.history-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.history-content {
  min-height: 200px;
}

.chart-placeholder {
  width: 100%;
}

.no-history {
  text-align: center;
  padding: 40px;
}

.loading-container,
.error-container {
  padding: 20px;
}

@media (max-width: 768px) {
  .radio-cards {
    grid-template-columns: 1fr;
  }
  
  .ssid-grid {
    grid-template-columns: 1fr;
  }
  
  .overview-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style> 