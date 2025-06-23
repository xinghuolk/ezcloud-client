<template>
  <div class="web-ssh-terminal">
    <!-- 终端头部 -->
    <div class="terminal-header">
      <div class="terminal-title">
        <el-icon><Monitor /></el-icon>
        <span>SSH终端 - {{ device.serial }}</span>
      </div>
      <div class="terminal-controls">
        <el-button-group size="small">
          <el-button 
            :type="isConnected ? 'success' : 'primary'"
            :loading="isConnecting"
            @click="toggleConnection"
          >
            {{ connectionButtonText }}
          </el-button>
          <el-button @click="clearTerminal" :disabled="!isConnected">
            <el-icon><Delete /></el-icon>
            清屏
          </el-button>
          <el-button @click="closeTerminal">
            <el-icon><Close /></el-icon>
            关闭
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 连接状态指示器 -->
    <div v-if="!isConnected && !isConnecting" class="connection-status">
      <el-alert 
        title="SSH终端未连接"
        :description="statusMessage"
        :type="statusType"
        :closable="false"
        show-icon
      />
    </div>

    <!-- 终端容器 -->
    <div 
      ref="terminalContainer" 
      class="terminal-container"
      :class="{ 'terminal-hidden': !isConnected }"
    ></div>

    <!-- 加载状态 -->
    <div v-if="isConnecting" class="loading-overlay">
      <el-loading-spinner size="50px" />
      <p>正在连接SSH终端...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Monitor, Delete, Close } from '@element-plus/icons-vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { AttachAddon } from '@xterm/addon-attach'
import '@xterm/xterm/css/xterm.css'
import type { Device } from '@/api/types'

interface Props {
  device: Device
  sshPort?: number
  autoConnect?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoConnect: false
})

const emit = defineEmits<{
  close: []
  statusChange: [status: 'connected' | 'disconnected' | 'error', message?: string]
}>()

// 终端相关
const terminalContainer = ref<HTMLElement>()
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let attachAddon: AttachAddon | null = null

// WebSocket连接
let websocket: WebSocket | null = null
const isConnected = ref(false)
const isConnecting = ref(false)
const statusMessage = ref('点击连接按钮启动SSH会话')
const statusType = ref<'info' | 'success' | 'warning' | 'error'>('info')

// 计算属性
const connectionButtonText = computed(() => {
  if (isConnecting.value) return '连接中...'
  if (isConnected.value) return '断开连接'
  return '连接SSH'
})

// 方法
const initTerminal = () => {
  if (!terminalContainer.value) return

  // 创建终端实例
  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#ffffff',
      selectionBackground: '#264f78'
    },
    scrollback: 1000,
    tabStopWidth: 4
  })

  // 创建插件
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  // 将终端挂载到容器
  terminal.open(terminalContainer.value)
  
  // 调整大小
  nextTick(() => {
    if (fitAddon) {
      fitAddon.fit()
    }
  })

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

const connectSSH = async () => {
  if (!props.sshPort) {
    ElMessage.error('SSH端口未分配，请先启动SSH隧道')
    return
  }

  if (isConnecting.value || isConnected.value) return

  try {
    isConnecting.value = true
    statusMessage.value = '正在建立SSH连接...'
    statusType.value = 'info'

    // 构建WebSocket连接URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ssh-terminal/${props.device.id}`

    // 创建WebSocket连接
    websocket = new WebSocket(wsUrl)

    // 设置WebSocket事件处理
    websocket.onopen = () => {
      console.log('SSH WebSocket连接已建立')
      
      if (terminal && websocket) {
        // 创建并加载AttachAddon
        attachAddon = new AttachAddon(websocket)
        terminal.loadAddon(attachAddon)
        
        isConnected.value = true
        isConnecting.value = false
        statusMessage.value = 'SSH连接已建立'
        statusType.value = 'success'
        
        // 调整终端大小
        if (fitAddon) {
          fitAddon.fit()
        }
        
        // 发送初始终端大小
        sendTerminalSize()
        
        emit('statusChange', 'connected', 'SSH终端已连接')
        ElMessage.success('SSH终端连接成功')
      }
    }

    websocket.onerror = (error) => {
      console.error('SSH WebSocket连接错误:', error)
      isConnecting.value = false
      isConnected.value = false
      statusMessage.value = 'SSH连接失败，请检查网络或重试'
      statusType.value = 'error'
      
      emit('statusChange', 'error', 'SSH连接失败')
      ElMessage.error('SSH终端连接失败')
    }

    websocket.onclose = () => {
      console.log('SSH WebSocket连接已关闭')
      isConnected.value = false
      isConnecting.value = false
      statusMessage.value = 'SSH连接已断开'
      statusType.value = 'info'
      
      // 清理AttachAddon
      if (attachAddon && terminal) {
        terminal.dispose()
        initTerminal() // 重新初始化终端
      }
      
      emit('statusChange', 'disconnected', 'SSH连接已断开')
    }

  } catch (error) {
    console.error('建立SSH连接失败:', error)
    isConnecting.value = false
    statusMessage.value = '连接失败，请重试'
    statusType.value = 'error'
    ElMessage.error('SSH连接失败')
  }
}

const disconnectSSH = () => {
  if (websocket) {
    websocket.close()
    websocket = null
  }
  
  if (attachAddon && terminal) {
    terminal.dispose()
    initTerminal() // 重新初始化终端
    attachAddon = null
  }
  
  isConnected.value = false
  isConnecting.value = false
  statusMessage.value = 'SSH连接已断开'
  statusType.value = 'info'
}

const toggleConnection = () => {
  if (isConnected.value) {
    disconnectSSH()
  } else {
    connectSSH()
  }
}

const clearTerminal = () => {
  if (terminal) {
    terminal.clear()
  }
}

const closeTerminal = () => {
  disconnectSSH()
  emit('close')
}

const handleResize = () => {
  if (fitAddon && isConnected.value) {
    fitAddon.fit()
    sendTerminalSize()
  }
}

const sendTerminalSize = () => {
  if (websocket && terminal && websocket.readyState === WebSocket.OPEN) {
    const size = {
      cols: terminal.cols,
      rows: terminal.rows
    }
    
    // 发送终端大小调整消息
    const message = {
      type: 'resize',
      data: size
    }
    
    websocket.send(JSON.stringify(message))
  }
}

// 生命周期
onMounted(() => {
  initTerminal()
  
  if (props.autoConnect && props.sshPort) {
    // 延迟自动连接，确保组件完全挂载
    setTimeout(() => {
      connectSSH()
    }, 500)
  }
})

onUnmounted(() => {
  // 清理资源
  disconnectSSH()
  
  if (terminal) {
    terminal.dispose()
  }
  
  window.removeEventListener('resize', handleResize)
})

// 暴露方法给父组件
defineExpose({
  connect: connectSSH,
  disconnect: disconnectSSH,
  isConnected: computed(() => isConnected.value),
  clear: clearTerminal
})
</script>

<style scoped>
.web-ssh-terminal {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cccccc;
  font-weight: 500;
}

.terminal-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-status {
  padding: 16px;
  background: #252526;
}

.terminal-container {
  flex: 1;
  position: relative;
  background: #1e1e1e;
  overflow: hidden;
}

.terminal-hidden {
  display: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 30, 0.9);
  color: #cccccc;
  font-size: 14px;
  gap: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .terminal-header {
    flex-direction: column;
    gap: 12px;
    padding: 8px 12px;
  }
  
  .terminal-controls {
    width: 100%;
    justify-content: center;
  }
}

/* 终端主题覆盖 */
:deep(.xterm) {
  height: 100% !important;
}

:deep(.xterm-viewport) {
  background-color: #1e1e1e !important;
}

:deep(.xterm-screen) {
  background-color: #1e1e1e !important;
}
</style> 