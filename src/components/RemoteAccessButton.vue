<template>
  <div class="remote-access-buttons">
    <!-- HTTP访问按钮 -->
    <el-tooltip content="通过Web浏览器访问设备管理界面" placement="top">
      <el-button
        :type="httpStatus === 'connected' ? 'success' : 'primary'"
        size="small"
        :loading="httpLoading"
        :disabled="!device.is_online"
        @click="handleHttpAccess"
      >
        <el-icon class="button-icon">
          <Monitor v-if="httpStatus === 'connected'" />
          <ChromeFilled v-else />
        </el-icon>
        <span class="button-text">
          {{ httpButtonText }}
        </span>
      </el-button>
    </el-tooltip>

    <!-- SSH访问按钮 -->
    <el-tooltip content="启动SSH隧道访问设备终端" placement="top">
      <el-button
        :type="sshStatus === 'connected' ? 'success' : 'info'"
        size="small"
        :loading="sshLoading"
        :disabled="!device.is_online"
        @click="handleSshAccess"
      >
        <el-icon class="button-icon">
          <Operation v-if="sshStatus === 'connected'" />
          <Monitor v-else />
        </el-icon>
        <span class="button-text">
          {{ sshButtonText }}
        </span>
      </el-button>
    </el-tooltip>

    <!-- 连接状态指示器 -->
    <div v-if="showStatusIndicators" class="status-indicators">
      <el-tag
        v-if="httpStatus !== 'disconnected'"
        :type="getStatusTagType(httpStatus)"
        size="small"
        class="status-tag"
      >
        HTTP: {{ getStatusText(httpStatus) }}
      </el-tag>
      <el-tag
        v-if="sshStatus !== 'disconnected'"
        :type="getStatusTagType(sshStatus)"
        size="small"
        class="status-tag"
      >
        SSH: {{ getStatusText(sshStatus) }}
      </el-tag>
    </div>

    <!-- SSH连接信息对话框 -->
    <el-dialog
      v-model="sshInfoDialogVisible"
      title="SSH连接信息"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="ssh-info-content">
        <el-alert
          title="SSH隧道已建立"
          type="success"
          :closable="false"
          show-icon
        />
        
        <div class="connection-info">
          <h4>连接方式1: 命令行</h4>
          <el-input
            :model-value="sshCommandLine"
            readonly
            class="command-input"
          >
            <template #append>
              <el-button @click="copyToClipboard(sshCommandLine)" :icon="CopyDocument">
                复制
              </el-button>
            </template>
          </el-input>
          
          <h4>连接方式2: Web终端</h4>
          <div class="connection-details">
            <el-button type="primary" @click="openWebTerminal" :icon="Monitor">
              打开Web SSH终端
            </el-button>
            <p style="margin-top: 8px; font-size: 12px; color: #666;">
              在浏览器中直接使用SSH终端，无需额外软件
            </p>
          </div>

          <h4>连接方式3: SSH客户端</h4>
          <div class="connection-details">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="服务器地址">{{ sshHost }}</el-descriptions-item>
              <el-descriptions-item label="端口">{{ sshPort }}</el-descriptions-item>
              <el-descriptions-item label="用户名">root</el-descriptions-item>
              <el-descriptions-item label="设备序列号">{{ device.serial }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
        
        <el-alert
          title="提示: SSH隧道将在30分钟无活动后自动关闭"
          type="info"
          :closable="false"
          show-icon
          class="timeout-notice"
        />
      </div>
      
      <template #footer>
        <el-button type="danger" @click="handleStopSshAccess">关闭SSH隧道</el-button>
        <el-button type="primary" @click="sshInfoDialogVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  Monitor,
  ChromeFilled,
  Operation,
  CopyDocument
} from '@element-plus/icons-vue'
import { remoteAccessApi } from '@/api/remote-access'
import type { Device } from '@/api/types'
import type { RemoteAccessStatus } from '@/api/remote-access'

interface Props {
  device: Device
  showStatusIndicators?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStatusIndicators: true
})

const emit = defineEmits<{
  statusChange: [device: Device, status: RemoteAccessStatus]
  openTerminal: [device: Device, sshPort: number]
}>()

const router = useRouter()

// 状态管理
const httpLoading = ref(false)
const sshLoading = ref(false)
const accessStatus = ref<RemoteAccessStatus | null>(null)
const sshInfoDialogVisible = ref(false)
const statusPollingInterval = ref<number | null>(null)

// 计算属性
const httpStatus = computed(() => accessStatus.value?.http?.status || 'disconnected')
const sshStatus = computed(() => accessStatus.value?.ssh?.status || 'disconnected')

const httpButtonText = computed(() => {
  switch (httpStatus.value) {
    case 'connecting': return '连接中...'
    case 'connected': return '访问设备'
    case 'error': return '连接失败'
    default: return 'Web访问'
  }
})

const sshButtonText = computed(() => {
  switch (sshStatus.value) {
    case 'connecting': return '启动中...'
    case 'connected': return 'SSH信息'
    case 'error': return '连接失败'
    default: return 'SSH访问'
  }
})

const sshHost = computed(() => accessStatus.value?.ssh?.host || window.location.hostname)
const sshPort = computed(() => accessStatus.value?.ssh?.port || 0)
const sshCommandLine = computed(() => 
  `ssh root@${sshHost.value} -p ${sshPort.value}`
)

// 方法
const getStatusTagType = (status: string) => {
  switch (status) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'error': return 'danger'
    default: return 'info'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中'
    case 'error': return '错误'
    default: return '未连接'
  }
}

const handleHttpAccess = async () => {
  if (httpStatus.value === 'connected') {
    // 如果已连接，直接打开设备页面
    const url = accessStatus.value?.http?.url || `https://${props.device.serial}.dev.outdoorrouter.net`
    window.open(url, '_blank')
    return
  }

  httpLoading.value = true
  try {
    const response = await remoteAccessApi.startHttpAccess(props.device.id)
    ElMessage.success(response.data.message)
    
    // 如果响应中直接包含了URL，立即打开
    if (response.data?.url) {
      window.open(response.data.url, '_blank')
      httpLoading.value = false
    } else {
      // 开始轮询状态，等待隧道建立
      startStatusPolling()
    }
    
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '启动HTTP访问失败')
    httpLoading.value = false
  }
}

const handleSshAccess = async () => {
  if (sshStatus.value === 'connected') {
    // 如果已连接，显示连接信息
    sshInfoDialogVisible.value = true
    return
  }

  sshLoading.value = true
  try {
    const response = await remoteAccessApi.startSshAccess(props.device.id)
    ElMessage.success(response.data.message)
    
    // 开始轮询状态
    startStatusPolling()
    
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '启动SSH访问失败')
  } finally {
    sshLoading.value = false
  }
}

const handleStopSshAccess = async () => {
  try {
    await ElMessageBox.confirm('确定要关闭SSH隧道吗？', '确认操作', {
      type: 'warning'
    })
    
    await remoteAccessApi.stopRemoteAccess(props.device.id, 'ssh')
    ElMessage.success('SSH隧道已关闭')
    sshInfoDialogVisible.value = false
    
    // 刷新状态
    await fetchAccessStatus()
    
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '关闭SSH隧道失败')
    }
  }
}

const fetchAccessStatus = async () => {
  try {
    const response = await remoteAccessApi.getRemoteAccessStatus(props.device.id)
    const previousStatus = accessStatus.value
    
    // 后端返回的标准数据结构：实际数据在data字段中
    const statusData = response.data
    accessStatus.value = statusData
    
    // 通知父组件状态变化
    emit('statusChange', props.device, statusData)
    
    // 如果HTTP连接成功，自动打开页面
    if (httpLoading.value && statusData.http?.status === 'connected') {
      httpLoading.value = false
      const url = statusData.http?.url || `https://${props.device.serial}.dev.outdoorrouter.net`
      window.open(url, '_blank')
      // 停止轮询，因为已经成功
      stopStatusPolling()
    }
    
    // 如果SSH连接成功，显示连接信息
    if (sshLoading.value && statusData.ssh?.status === 'connected') {
      sshLoading.value = false
      sshInfoDialogVisible.value = true
      // 停止轮询，因为已经成功
      stopStatusPolling()
    }
    
    // 如果连接失败，停止loading和轮询
    if (httpLoading.value && statusData.http?.status === 'error') {
      httpLoading.value = false
      stopStatusPolling()
      ElMessage.error('HTTP隧道建立失败')
    }
    
    if (sshLoading.value && statusData.ssh?.status === 'error') {
      sshLoading.value = false
      stopStatusPolling()
      ElMessage.error('SSH隧道建立失败')
    }
    
  } catch (error) {
    console.error('获取远程访问状态失败:', error)
    // 如果获取状态失败，停止loading
    if (httpLoading.value || sshLoading.value) {
      httpLoading.value = false
      sshLoading.value = false
      stopStatusPolling()
    }
  }
}

const startStatusPolling = () => {
  if (statusPollingInterval.value) {
    clearInterval(statusPollingInterval.value)
  }
  
  statusPollingInterval.value = window.setInterval(fetchAccessStatus, 3000)
}

const stopStatusPolling = () => {
  if (statusPollingInterval.value) {
    clearInterval(statusPollingInterval.value)
    statusPollingInterval.value = null
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const openWebTerminal = () => {
  // 打开Web SSH终端页面
  router.push(`/ssh-terminal/${props.device.id}`)
}

// 生命周期
onMounted(() => {
  fetchAccessStatus()
})

onUnmounted(() => {
  stopStatusPolling()
})
</script>

<style scoped>
.remote-access-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.button-icon {
  margin-right: 4px;
}

.button-text {
  font-size: 12px;
}

.status-indicators {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.status-tag {
  font-size: 10px;
}

.ssh-info-content {
  padding: 16px 0;
}

.connection-info {
  margin: 16px 0;
}

.connection-info h4 {
  margin: 16px 0 8px 0;
  color: #409eff;
}

.command-input {
  margin-bottom: 16px;
}

.connection-details {
  margin-bottom: 16px;
}

.timeout-notice {
  margin-top: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .remote-access-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .button-text {
    font-size: 14px;
  }
}
</style> 