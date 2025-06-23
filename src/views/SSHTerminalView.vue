<template>
  <div class="ssh-terminal-view">
    <!-- 页面头部 -->
    <div class="terminal-page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" link>
          返回
        </el-button>
        <div class="device-info">
          <h2>SSH终端 - {{ device?.name || device?.serial }}</h2>
          <p>设备序列号: {{ device?.serial }}</p>
        </div>
      </div>
      <div class="header-right">
        <el-tag :type="connectionStatusType" size="large">
          {{ connectionStatusText }}
        </el-tag>
      </div>
    </div>

    <!-- 终端容器 -->
    <div class="terminal-wrapper">
      <WebSSHTerminal
        v-if="device"
        :device="device"
        :ssh-port="sshPort"
        :auto-connect="true"
        @close="handleTerminalClose"
        @status-change="handleStatusChange"
        ref="terminalRef"
      />
      
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-loading
          text="正在初始化SSH终端..."
          background="rgba(0, 0, 0, 0.8)"
        />
      </div>
      
      <!-- 错误状态 -->
      <div v-if="error" class="error-container">
        <el-result
          icon="error"
          title="无法连接SSH终端"
          :sub-title="error"
        >
          <template #extra>
            <el-button type="primary" @click="retry">重试连接</el-button>
            <el-button @click="goBack">返回设备列表</el-button>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import WebSSHTerminal from '@/components/WebSSHTerminal.vue'
import { deviceApi } from '@/api'
import { remoteAccessApi } from '@/api/remote-access'
import type { Device } from '@/api/types'

const route = useRoute()
const router = useRouter()

// 数据
const device = ref<Device | null>(null)
const sshPort = ref<number>(0)
const loading = ref(true)
const error = ref<string>('')
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
const terminalRef = ref()

// 计算属性
const connectionStatusType = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'error': return 'danger'
    default: return 'info'
  }
})

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中'
    case 'error': return '连接错误'
    default: return '未连接'
  }
})

// 方法
const initializeTerminal = async () => {
  try {
    loading.value = true
    error.value = ''
    
    // 获取设备ID
    const deviceId = Number(route.params.deviceId)
    if (!deviceId) {
      throw new Error('无效的设备ID')
    }
    
    // 获取设备信息
    const deviceResponse = await deviceApi.getDevice(deviceId)
    device.value = deviceResponse.data
    
    // 检查设备是否在线
    if (!device.value?.is_online) {
      throw new Error('设备离线，无法建立SSH连接')
    }
    
    // 获取SSH隧道状态
    const statusResponse = await remoteAccessApi.getRemoteAccessStatus(deviceId)
    const sshStatus = statusResponse.data.ssh
    
    if (sshStatus.status !== 'connected') {
      throw new Error('SSH隧道未连接，请先在设备列表中启动SSH访问')
    }
    
    if (!sshStatus.port) {
      throw new Error('SSH端口未分配')
    }
    
    sshPort.value = sshStatus.port
    
    console.log('SSH终端初始化完成:', {
      device: device.value?.serial,
      port: sshPort.value
    })
    
  } catch (err: any) {
    console.error('SSH终端初始化失败:', err)
    error.value = err.message || '初始化失败'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

const handleStatusChange = (status: 'connected' | 'disconnected' | 'error', message?: string) => {
  connectionStatus.value = status
  
  if (status === 'connected') {
    ElMessage.success('SSH终端连接成功')
  } else if (status === 'error') {
    ElMessage.error(message || 'SSH连接失败')
  }
}

const handleTerminalClose = () => {
  ElMessageBox.confirm('确定要关闭SSH终端吗？', '确认操作', {
    type: 'warning'
  }).then(() => {
    goBack()
  }).catch(() => {
    // 用户取消
  })
}

const retry = () => {
  initializeTerminal()
}

const goBack = () => {
  // 清理终端连接
  if (terminalRef.value && terminalRef.value.isConnected) {
    terminalRef.value.disconnect()
  }
  
  // 返回设备列表或上一页
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/devices')
  }
}

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (terminalRef.value && terminalRef.value.isConnected) {
    e.preventDefault()
    e.returnValue = '您有一个活动的SSH会话，确定要离开吗？'
  }
}

// 生命周期
onMounted(() => {
  initializeTerminal()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  // 清理资源
  if (terminalRef.value && terminalRef.value.isConnected) {
    terminalRef.value.disconnect()
  }
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.ssh-terminal-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.terminal-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e4e4e7;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.device-info h2 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.device-info p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.terminal-wrapper {
  flex: 1;
  position: relative;
  margin: 16px;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  z-index: 10;
}

.error-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  z-index: 10;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .terminal-page-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }
  
  .header-left {
    align-self: flex-start;
  }
  
  .header-right {
    align-self: flex-end;
  }
  
  .terminal-wrapper {
    margin: 8px;
  }
  
  .device-info h2 {
    font-size: 16px;
  }
}

/* 全屏模式 */
.ssh-terminal-view.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.ssh-terminal-view.fullscreen .terminal-wrapper {
  margin: 0;
  border-radius: 0;
}
</style> 