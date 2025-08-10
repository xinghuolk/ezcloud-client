<template>
  <div class="web-ssh-terminal" :class="{ 'standalone': props.standalone }">
    <!-- Terminal Header (hidden in standalone mode) -->
    <div v-if="!props.standalone" class="terminal-header">
      <div class="terminal-title">
        <iconify-icon icon="lucide:monitor" class="mr-2" />
        <span>SSH Terminal - {{ device.serial }}</span>
      </div>
      <div class="terminal-controls">
        <VButton
          :color="isConnected ? 'success' : 'primary'"
          :loading="isConnecting"
          @click="toggleConnection"
          size="small"
        >
          {{ connectionButtonText }}
        </VButton>
        <VButton 
          @click="clearTerminal" 
          :disabled="!isConnected"
          size="small"
          outlined
        >
          <iconify-icon icon="lucide:trash-2" class="mr-1" />
          Clear
        </VButton>
        <VButton 
          @click="closeTerminal"
          size="small"
          outlined
        >
          <iconify-icon icon="lucide:x" class="mr-1" />
          Close
        </VButton>
      </div>
    </div>

    <!-- Connection Status -->
    <div v-if="!isConnected && !isConnecting" class="connection-status" :class="{ 'standalone-error': props.standalone }">
      <VMessage 
        :color="statusType"
        :title="statusMessage"
        :icon="statusIcon"
      >
        <template #default>
          {{ statusDescription }}
        </template>
      </VMessage>
      
      <!-- Standalone模式下的操作按钮 -->
      <div v-if="props.standalone" class="standalone-actions">
        <VButton 
          color="primary" 
          @click="connectSSH"
          :loading="isConnecting"
          size="medium"
        >
          <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
          Reconnect
        </VButton>
        <VButton 
          color="secondary" 
          @click="emit('close')"
          outlined
          size="medium"
        >
          <iconify-icon icon="lucide:x" class="mr-2" />
          Close Window
        </VButton>
      </div>
    </div>

    <!-- Terminal Container -->
    <div 
      ref="terminalContainer" 
      class="terminal-container"
      :class="{ 'terminal-hidden': !isConnected }"
    ></div>

    <!-- Loading Overlay -->
    <div v-if="isConnecting" class="loading-overlay" :class="{ 'standalone-loading': props.standalone }">
      <div class="loading-content">
        <VLoader size="large" />
        <p class="loading-text">{{ props.standalone ? 'Connecting SSH Terminal...' : 'Connecting SSH Terminal...' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { Device } from '/@src/api/types'
import { remoteAccessApi } from '/@src/api'
import { notyf } from '/@src/api/request'

interface Props {
  device: Device
  sshPort?: number
  autoConnect?: boolean
  standalone?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoConnect: false,
  standalone: false
})

const emit = defineEmits<{
  close: []
  statusChange: [status: 'connected' | 'disconnected' | 'error', message?: string]
}>()

// Terminal related
const terminalContainer = ref<HTMLElement>()
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null

// WebSocket connection
let websocket: WebSocket | null = null
const isConnected = ref(false)
const isConnecting = ref(false)
const statusMessage = ref('SSH Terminal Ready')
const statusDescription = ref('Click the connect button to start the SSH session')
const statusType = ref<'info' | 'success' | 'warning' | 'danger'>('info')

// Computed properties
const connectionButtonText = computed(() => {
  if (isConnecting.value) return 'Connecting...'
  if (isConnected.value) return 'Disconnect'
  return 'Connect SSH'
})

const statusIcon = computed(() => {
  switch (statusType.value) {
    case 'success': return 'lucide:check-circle'
    case 'danger': return 'lucide:x-circle'
    case 'warning': return 'lucide:alert-triangle'
    default: return 'lucide:info'
  }
})

// Methods
const initTerminal = () => {
  if (!terminalContainer.value) return

  // VSCode Dark+ 终端主题配色
  const vscodeTheme = {
    background: '#0d1117',        // VSCode深色背景
    foreground: '#e6edf3',        // VSCode前景色（浅灰白）
    cursor: '#f0f6fc',           // 光标颜色
    cursorAccent: '#0d1117',     // 光标背景
    selectionBackground: '#264f78', // 选择背景
    
    // ANSI 标准16色（VSCode配色）
    black: '#16181e',            // 黑色
    red: '#f85149',              // 红色
    green: '#56d364',            // 绿色  
    yellow: '#e3b341',           // 黄色
    blue: '#79c0ff',             // 蓝色
    magenta: '#d2a8ff',          // 品红
    cyan: '#39c5cf',             // 青色
    white: '#b1bac4',            // 白色
    
    // 高亮16色
    brightBlack: '#484f58',      // 亮黑
    brightRed: '#ff7b72',        // 亮红
    brightGreen: '#7ee787',      // 亮绿
    brightYellow: '#f2cc60',     // 亮黄
    brightBlue: '#a5b4fc',       // 亮蓝
    brightMagenta: '#ebb9ff',    // 亮品红
    brightCyan: '#56d4dd',       // 亮青
    brightWhite: '#f0f6fc'       // 亮白
  }

  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 16,                 // 增大字体
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    scrollback: 1000,
    tabStopWidth: 4,
    allowProposedApi: true,       // 允许使用扩展API
    theme: vscodeTheme            // 直接在创建时设置VSCode主题
  })
  
  console.log('🔧 Terminal created with VSCode theme:', vscodeTheme)
  console.log('🔧 Terminal theme after creation:', terminal.options.theme)

  // Create fit addon
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  // Mount terminal to container
  terminal.open(terminalContainer.value)
  
  // 确保主题应用后立即刷新
  nextTick(() => {
    if (terminal && terminal.rows > 0) {
      terminal.refresh(0, terminal.rows - 1)
    }
  })
  
  // 延迟fit以确保容器尺寸正确
  setTimeout(() => {
    if (fitAddon && terminal) {
      fitAddon.fit()
      if (terminal.rows > 0) {
        terminal.refresh(0, terminal.rows - 1)
      }
      
      // 应用VSCode终端主题
      applyVSCodeTheme()
    }
  }, 100)

  // Listen for window resize
  window.addEventListener('resize', handleResize)
}

const connectSSH = async () => {
  if (isConnecting.value || isConnected.value) return

  try {
    isConnecting.value = true
    statusMessage.value = 'Checking SSH Tunnel Status'
    statusDescription.value = 'Verifying SSH tunnel connectivity...'
    statusType.value = 'info'

    // Check SSH tunnel status using unified API
    const statusResponse = await remoteAccessApi.getRemoteAccessStatus(props.device.id)
    
    if (!statusResponse.success) {
      throw new Error('Failed to get SSH tunnel status')
    }
    
    const statusData = statusResponse
    console.log('SSH Tunnel Status:', statusData)
    
    // Check SSH tunnel status
    if (!statusData.data?.ssh || statusData.data.ssh.status !== 'connected') {
      throw new Error('SSH Tunnel Not Connected, Please Establish SSH Tunnel First')
    }

    statusMessage.value = 'Establishing SSH Terminal Connection'
    statusDescription.value = 'Creating WebSocket connection...'

    // Get JWT token for WebSocket authentication
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('User not logged in')
    }

    // Build WebSocket connection URL
    // 自动检测协议并通过nginx代理连接
    let wsBaseUrl = import.meta.env.VITE_WS_BASE_URL
    
    if (wsBaseUrl === 'AUTO' || !wsBaseUrl) {
      // 自动检测当前页面协议
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      wsBaseUrl = `${protocol}//${host}`
    }
    
    const wsUrl = `${wsBaseUrl}/ws/ssh-terminal/device/${props.device.id}?token=${encodeURIComponent(token)}`

    // Create WebSocket connection
    websocket = new WebSocket(wsUrl)

    // Setup WebSocket event handlers
    websocket.onopen = () => {
      console.log('SSH WebSocket Connection Established')
      
      if (terminal && websocket) {
        isConnected.value = true
        isConnecting.value = false
        statusMessage.value = 'SSH Connection Established'
        statusDescription.value = 'Terminal is ready for use'
        statusType.value = 'success'
        
        
        // 应用VSCode主题
        applyVSCodeTheme()
        
        // Fit terminal (延迟执行确保主题应用完成)
        setTimeout(() => {
          if (fitAddon && terminal) {
            fitAddon.fit()
            if (terminal.rows > 0) {
              terminal.refresh(0, terminal.rows - 1)
            }
          }
          
          // Send initial terminal size
          sendTerminalSize()
          
          // 如果是standalone模式，强制重新调整尺寸
          if (props.standalone) {
            forceTerminalResize()
          }
        }, 100)
        
        // Setup terminal handlers
        setupTerminalHandlers()
        
        emit('statusChange', 'connected', 'SSH Terminal Connected')
        notyf.success('SSH Terminal Connected')
      }
    }

    // WebSocket message handling
    websocket.onmessage = (event) => {
      if (terminal) {
        try {
          // Handle different types of data
          if (event.data instanceof ArrayBuffer) {
            // ArrayBuffer data
            const uint8Array = new Uint8Array(event.data)
            terminal.write(uint8Array)
          } else if (event.data instanceof Blob) {
            // Blob data, need to convert to ArrayBuffer
            event.data.arrayBuffer().then(buffer => {
              const uint8Array = new Uint8Array(buffer)
              if (terminal) {
                terminal.write(uint8Array)
              }
            })
          } else if (typeof event.data === 'string') {
            // Try to parse JSON control messages
            try {
              const message = JSON.parse(event.data)
              if (message.type === 'error') {
                console.error('SSH Server Error:', message.message)
                notyf.error(`SSH Error: ${message.message}`)
                // 同时在终端中显示错误信息
                terminal.write(`\r\n\x1b[31m[SSH Error]: ${message.message}\x1b[0m\r\n`)
                return
              }
              // Other control messages also don't write to terminal
            } catch {
              // Not JSON, write directly to terminal as text
              terminal.write(event.data)
            }
          } else {
            // Other data types
            terminal.write(event.data)
          }
        } catch (error) {
          console.error('Handle WebSocket Message Failed:', error)
        }
      }
    }

    websocket.onerror = (error) => {
      console.error('SSH WebSocket Connection Error:', error)
      
      // 强制更新连接状态
      isConnecting.value = false
      isConnected.value = false
      
      // 使用nextTick确保状态更新
      nextTick(() => {
        statusMessage.value = 'SSH Connection Failed'
        // 尝试从错误事件中提取更具体的错误信息
        let errorDetail = 'WebSocket connection failed. Please check network connection or retry.'
        if (error && error.target && (error.target as WebSocket).readyState === WebSocket.CLOSED) {
          errorDetail = 'WebSocket connection was closed. Server may be unreachable or network issue.'
        }
        statusDescription.value = errorDetail
        statusType.value = 'danger'
        
        emit('statusChange', 'error', 'SSH Connection Failed')
        notyf.error('SSH Terminal Connection Failed')
      })
    }

    websocket.onclose = (event) => {
      console.log('SSH WebSocket Connection Closed', event)
      
      // 强制更新连接状态
      isConnected.value = false
      isConnecting.value = false
      
      // 使用nextTick确保状态更新
      nextTick(() => {
        // 只有在正常关闭时才显示info状态，错误关闭保持之前的错误状态
        if (event.wasClean || statusType.value !== 'danger') {
          statusMessage.value = 'SSH Connection Closed'
          statusDescription.value = 'Connection has been terminated'
          statusType.value = 'info'
          emit('statusChange', 'disconnected', 'SSH Connection Closed')
        } else {
          // 如果是因为错误而关闭，确保显示错误状态
          console.log('Connection closed due to error, setting error status')
          statusMessage.value = 'SSH Connection Failed'
          statusDescription.value = 'Connection failed due to network error or server unavailable'
          statusType.value = 'danger'
          emit('statusChange', 'error', 'SSH Connection Failed')
        }
      })
      
      // Clean up terminal handlers
      if (terminal) {
        terminal.dispose()
        initTerminal() // Reinitialize terminal
      }
    }

  } catch (error) {
    console.error('Establish SSH Connection Failed:', error)
    
    // 强制更新状态，确保响应性触发
    isConnecting.value = false
    isConnected.value = false
    
    // 使用nextTick确保状态更新顺序
    await nextTick()
    
    const errorMsg = error instanceof Error ? error.message : 'Connection Failed, Please Retry'
    statusMessage.value = 'SSH Connection Failed'
    statusDescription.value = `Error Details: ${errorMsg}`
    statusType.value = 'danger'
    
    emit('statusChange', 'error', `SSH Connection Failed: ${errorMsg}`)
    notyf.error(`SSH Connection Failed: ${errorMsg}`)
  }
}

const disconnectSSH = () => {
  if (websocket) {
    websocket.close()
    websocket = null
  }
  
  if (terminal) {
    terminal.dispose()
    initTerminal() // Reinitialize terminal
  }
  
  // 强制更新状态
  isConnected.value = false
  isConnecting.value = false
  
  // 使用nextTick确保状态更新
  nextTick(() => {
    statusMessage.value = 'SSH Connection Closed'
    statusDescription.value = 'Connection has been closed by user'
    statusType.value = 'info'
  })
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
  
  // Handle user input
  terminal.onData((data) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(data)
    }
  })
  
  // Handle keyboard events
  terminal.onKey(({ domEvent }) => {
    // Handle special keys
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

// 强制重新适配终端尺寸 - 用于standalone模式切换后
const forceTerminalResize = () => {
  if (fitAddon && terminal) {
    // 分阶段执行，确保CSS完全应用
    setTimeout(() => {
      // 第一次fit
      if (fitAddon && terminal) {
        fitAddon.fit()
        if (terminal.rows > 0) {
          terminal.refresh(0, terminal.rows - 1)
        }
      }
    }, 100)
    
    setTimeout(() => {
      // 第二次fit，确保尺寸正确
      if (fitAddon && terminal) {
        fitAddon.fit()
        if (isConnected.value) {
          sendTerminalSize()
        }
        if (terminal.rows > 0) {
          terminal.refresh(0, terminal.rows - 1)
        }
      }
    }, 300)
  }
}

const sendTerminalSize = () => {
  if (websocket && terminal && websocket.readyState === WebSocket.OPEN) {
    const size = {
      cols: terminal.cols,
      rows: terminal.rows
    }
    
    // Send terminal size adjustment message
    const message = {
      type: 'resize',
      data: size
    }
    
    websocket.send(JSON.stringify(message))
  }
}


// 应用VSCode终端主题
const applyVSCodeTheme = () => {
  if (terminal) {
    const vscodeTheme = {
      background: '#0d1117',        // VSCode深色背景
      foreground: '#e6edf3',        // VSCode前景色（浅灰白）
      cursor: '#f0f6fc',           // 光标颜色
      cursorAccent: '#0d1117',     // 光标背景
      selectionBackground: '#264f78', // 选择背景
      
      // ANSI 标准16色（VSCode配色）
      black: '#16181e',            // 黑色
      red: '#f85149',              // 红色
      green: '#56d364',            // 绿色  
      yellow: '#e3b341',           // 黄色
      blue: '#79c0ff',             // 蓝色
      magenta: '#d2a8ff',          // 品红
      cyan: '#39c5cf',             // 青色
      white: '#b1bac4',            // 白色
      
      // 高亮16色
      brightBlack: '#484f58',      // 亮黑
      brightRed: '#ff7b72',        // 亮红
      brightGreen: '#7ee787',      // 亮绿
      brightYellow: '#f2cc60',     // 亮黄
      brightBlue: '#a5b4fc',       // 亮蓝
      brightMagenta: '#ebb9ff',    // 亮品红
      brightCyan: '#56d4dd',       // 亮青
      brightWhite: '#f0f6fc'       // 亮白
    }
    
    // 设置主题（主要由CSS覆盖生效）
    terminal.options.theme = vscodeTheme
    
    // 刷新显示
    if (terminal.rows > 0) {
      terminal.refresh(0, terminal.rows - 1)
    }
    
    console.log('🎨 Applied VSCode theme to terminal')
  }
}

// 监听standalone模式变化，强制重新调整终端尺寸
watch(() => props.standalone, (newStandalone) => {
  if (newStandalone) {
    // standalone模式激活，延迟重新调整终端尺寸和应用VSCode主题
    setTimeout(() => {
      forceTerminalResize()
      applyVSCodeTheme()
    }, 200)
  }
})

// Lifecycle
onMounted(() => {
  initTerminal()
  
  if (props.autoConnect) {
    // Delay auto-connect to ensure component is fully mounted
    setTimeout(() => {
      connectSSH()
    }, 500)
  }
})

onUnmounted(() => {
  // Clean up resources
  disconnectSSH()
  
  if (terminal) {
    terminal.dispose()
  }
  
  window.removeEventListener('resize', handleResize)
})

// Expose methods to parent component
defineExpose({
  connect: connectSSH,
  disconnect: disconnectSSH,
  isConnected: computed(() => isConnected.value),
  clear: clearTerminal
})
</script>

<style lang="scss" scoped>
.web-ssh-terminal {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0d1117;          // VSCode背景色
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--light-box-shadow);
  
  // Standalone模式下占满全屏，无边框无阴影
  &.standalone {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10000;
    background: #0d1117;          // VSCode背景色
    height: 100vh !important;
    width: 100vw !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    
    // 确保终端容器在standalone模式下占满全部空间
    .terminal-container {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      height: 100vh !important;
      width: 100vw !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  }
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;

  .terminal-title {
    display: flex;
    align-items: center;
    color: #cccccc;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .terminal-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.connection-status {
  padding: 1rem;
  background: #252526;
  
  // Standalone模式下的错误显示样式
  &.standalone-error {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10001;
    background: #1a1a1a;
    border: 2px solid #ff0000;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(255, 0, 0, 0.3);
    max-width: 600px;
    width: 90%;
    
    :deep(.message) {
      background: transparent !important;
      color: #ffffff !important;
      
      .message-header {
        background: #ff0000 !important;
        color: #ffffff !important;
        font-weight: bold;
      }
      
      .message-body {
        background: #1a1a1a !important;
        color: #ffffff !important;
        border: none !important;
      }
    }
    
    .standalone-actions {
      margin-top: 1rem;
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
  }
}

.terminal-container {
  flex: 1;
  position: relative;
  background: #0d1117;          // VSCode背景色
  overflow: hidden;
  width: 100%;
  height: 100%;
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
  z-index: 10;
  
  // Standalone模式下的加载覆盖层
  &.standalone-loading {
    position: fixed;
    background: rgba(0, 0, 0, 0.95);
    z-index: 10001;
  }
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  .loading-text {
    color: #cccccc;
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0;
    
    // Standalone模式下更大的字体
    .standalone-loading & {
      color: #ffffff;
      font-size: 1.2rem;
      font-weight: 600;
    }
  }
}

.is-dark {
  .terminal-header {
    background: var(--dark-sidebar-light-6);
    border-bottom-color: var(--dark-sidebar-light-12);
  }

  .connection-status {
    background: var(--dark-sidebar-light-2);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .terminal-header {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;

    .terminal-controls {
      width: 100%;
      justify-content: center;
    }
  }
}

/* Terminal theme overrides */
:deep(.xterm) {
  height: 100% !important;
  width: 100% !important;
  
  // Standalone模式下的特殊处理
  .standalone & {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    height: 100vh !important;
    width: 100vw !important;
  }
}

:deep(.xterm-viewport) {
  width: 100% !important;
  height: 100% !important;
  
  .standalone & {
    height: 100vh !important;
    width: 100vw !important;
  }
}

:deep(.xterm-screen) {
  width: 100% !important;
  height: 100% !important;
  
  .standalone & {
    height: 100vh !important;
    width: 100vw !important;
  }
}

:deep(.xterm-rows) {
  width: 100% !important;
  height: 100% !important;
}

// 确保VSCode主题基础颜色生效 - 只覆盖背景和默认前景色
:deep(.xterm) {
  background-color: #0d1117 !important;
  color: #e6edf3 !important;
}

:deep(.xterm-viewport) {
  background-color: #0d1117 !important;
}

:deep(.xterm-screen) {
  background-color: #0d1117 !important;
  color: #e6edf3 !important;
}

:deep(.xterm-rows) {
  background-color: #0d1117 !important;
  color: #e6edf3 !important;
}

:deep(.xterm-fg-default) {
  color: #e6edf3 !important;
}

:deep(.xterm-bg-default) {
  background-color: #0d1117 !important;
}

// VSCode ANSI颜色确保正确显示
:deep(.xterm-fg-0) { color: #16181e !important; }    // black
:deep(.xterm-fg-1) { color: #f85149 !important; }    // red  
:deep(.xterm-fg-2) { color: #56d364 !important; }    // green
:deep(.xterm-fg-3) { color: #e3b341 !important; }    // yellow
:deep(.xterm-fg-4) { color: #79c0ff !important; }    // blue
:deep(.xterm-fg-5) { color: #d2a8ff !important; }    // magenta
:deep(.xterm-fg-6) { color: #39c5cf !important; }    // cyan
:deep(.xterm-fg-7) { color: #b1bac4 !important; }    // white

// VSCode亮色ANSI
:deep(.xterm-fg-8) { color: #484f58 !important; }    // bright black
:deep(.xterm-fg-9) { color: #ff7b72 !important; }    // bright red
:deep(.xterm-fg-10) { color: #7ee787 !important; }   // bright green
:deep(.xterm-fg-11) { color: #f2cc60 !important; }   // bright yellow
:deep(.xterm-fg-12) { color: #a5b4fc !important; }   // bright blue
:deep(.xterm-fg-13) { color: #ebb9ff !important; }   // bright magenta
:deep(.xterm-fg-14) { color: #56d4dd !important; }   // bright cyan
:deep(.xterm-fg-15) { color: #f0f6fc !important; }   // bright white

// 确保无特定颜色类的文本使用默认前景色
:deep(.xterm) span:not([class*="xterm-fg-"]) {
  color: #e6edf3 !important;
}

</style>