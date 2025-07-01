<template>
  <div class="web-ssh-terminal">
    <!-- 终端头部 -->
    <div class="terminal-header">
      <div class="terminal-title">
        <el-icon><Monitor /></el-icon>
        <span>SSH Terminal - {{ device.serial }}</span>
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
            Clear Screen
          </el-button>
          <el-button @click="closeTerminal">
            <el-icon><Close /></el-icon>
            Close
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 连接状态指示器 -->
    <div v-if="!isConnected && !isConnecting" class="connection-status">
      <el-alert 
        title="SSH Terminal Not Connected"
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
      <div class="loading-content">
        <el-icon class="loading-icon" :size="50">
          <Loading />
        </el-icon>
        <p>Connecting SSH Terminal...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Monitor, Delete, Close, Loading } from '@element-plus/icons-vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
// 移除AttachAddon，我们将手动处理WebSocket消息
import '@xterm/xterm/css/xterm.css'
import type { Device } from '@/api/types'
import { getApiBaseUrl, getWebSocketBaseUrl } from '@/utils/config'

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

// WebSocket连接
let websocket: WebSocket | null = null
const isConnected = ref(false)
const isConnecting = ref(false)
const statusMessage = ref('Click the connect button to start the SSH session')
const statusType = ref<'info' | 'success' | 'warning' | 'error'>('info')

// 计算属性
const connectionButtonText = computed(() => {
  if (isConnecting.value) return 'Connecting...'
  if (isConnected.value) return 'Disconnect'
  return 'Connect SSH'
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
  if (isConnecting.value || isConnected.value) return

  try {
    isConnecting.value = true
    statusMessage.value = 'Checking SSH Tunnel Status...'
    statusType.value = 'info'

    // 获取JWT token用于认证
    const token = localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('User not logged in')
    }

    // 首先检查SSH隧道状态
    const apiBaseUrl = getApiBaseUrl()
    const response = await fetch(`${apiBaseUrl}/api/v1/remote-access/status/${props.device.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to get SSH tunnel status')
    }
    
    const statusData = await response.json()
    console.log('SSH Tunnel Status:', statusData)
    
    // 检查SSH隧道状态
    if (!statusData.data?.ssh || statusData.data.ssh.status !== 'connected') {
      throw new Error('SSH Tunnel Not Connected, Please Establish SSH Tunnel First')
    }

    statusMessage.value = 'Establishing SSH Terminal Connection...'

    // 构建WebSocket连接URL
    const wsBaseUrl = getWebSocketBaseUrl()
    const wsUrl = `${wsBaseUrl}/ws/ssh-terminal/device/${props.device.id}?token=${encodeURIComponent(token)}`

    // 创建WebSocket连接
    websocket = new WebSocket(wsUrl)

    // 设置WebSocket事件处理
    websocket.onopen = () => {
        console.log('SSH WebSocket Connection Established')
      
      if (terminal && websocket) {
        isConnected.value = true
        isConnecting.value = false
        statusMessage.value = 'SSH Connection Established'
        statusType.value = 'success'
        
        // 调整终端大小
        if (fitAddon) {
          fitAddon.fit()
        }
        
        // 发送初始终端大小
        sendTerminalSize()
        
        // 设置终端数据处理
        setupTerminalHandlers()
        
        emit('statusChange', 'connected', 'SSH Terminal Connected')
        ElMessage.success('SSH Terminal Connected')
      }
    }

    // WebSocket消息处理
    websocket.onmessage = (event) => {
      if (terminal) {
        try {
          // 处理不同类型的数据
          if (event.data instanceof ArrayBuffer) {
            // ArrayBuffer数据
            const uint8Array = new Uint8Array(event.data)
            terminal.write(uint8Array)
          } else if (event.data instanceof Blob) {
            // Blob数据，需要转换为ArrayBuffer
            event.data.arrayBuffer().then(buffer => {
              const uint8Array = new Uint8Array(buffer)
              if (terminal) {
                terminal.write(uint8Array)
              }
            })
          } else if (typeof event.data === 'string') {
            // 尝试解析JSON控制消息
            try {
              const message = JSON.parse(event.data)
              if (message.type === 'error') {
                console.error('SSH Server Error:', message.message)
                ElMessage.error(`SSH Error: ${message.message}`)
                return
              }
              // 其他控制消息也不写入终端
            } catch {
              // 不是JSON，直接作为文本写入终端
              terminal.write(event.data)
            }
          } else {
            // 其他数据类型
            terminal.write(event.data)
          }
        } catch (error) {
          console.error('Handle WebSocket Message Failed:', error)
        }
      }
    }

    websocket.onerror = (error) => {
      console.error('SSH WebSocket Connection Error:', error)
      isConnecting.value = false
      isConnected.value = false
      statusMessage.value = 'SSH Connection Failed, Please Check Network or Retry'
      statusType.value = 'error'
      
      emit('statusChange', 'error', 'SSH Connection Failed')
      ElMessage.error('SSH Terminal Connection Failed')
    }

    websocket.onclose = () => {
      console.log('SSH WebSocket Connection Closed')
      isConnected.value = false
      isConnecting.value = false
      statusMessage.value = 'SSH Connection Closed'
      statusType.value = 'info'
      
      // 清理终端处理器
      if (terminal) {
        terminal.dispose()
        initTerminal() // 重新初始化终端
      }
      
      emit('statusChange', 'disconnected', 'SSH Connection Closed')
    }

  } catch (error) {
    console.error('Establish SSH Connection Failed:', error)
    isConnecting.value = false
    const errorMsg = error instanceof Error ? error.message : 'Connection Failed, Please Retry'
    statusMessage.value = errorMsg
    statusType.value = 'error'
    ElMessage.error(`SSH Connection Failed: ${errorMsg}`)
  }
}

const disconnectSSH = () => {
  if (websocket) {
    websocket.close()
    websocket = null
  }
  
  if (terminal) {
    terminal.dispose()
    initTerminal() // 重新初始化终端
  }
  
  isConnected.value = false
  isConnecting.value = false
  statusMessage.value = 'SSH Connection Closed'
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

const setupTerminalHandlers = () => {
  if (!terminal || !websocket) return
  
  // 处理用户输入
  terminal.onData((data) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(data)
    }
  })
  
  // 处理键盘事件
  terminal.onKey(({ key, domEvent }) => {
    // 处理特殊键
    if (domEvent.ctrlKey && domEvent.key === 'c') {
      // Ctrl+C
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send('\x03')
      }
    }
  })
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
  
  if (props.autoConnect) {
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
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 30, 0.9);
  color: #cccccc;
  font-size: 14px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-icon {
  animation: spin 1s linear infinite;
  color: #409eff;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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