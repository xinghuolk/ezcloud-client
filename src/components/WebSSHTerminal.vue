<template>
  <div class="web-ssh-terminal">
    <!-- Terminal Header -->
    <div class="terminal-header">
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
    <div v-if="!isConnected && !isConnecting" class="connection-status">
      <VMessage 
        :color="statusType"
        :title="statusMessage"
        :description="statusDescription"
        :icon="statusIcon"
      />
    </div>

    <!-- Terminal Container -->
    <div 
      ref="terminalContainer" 
      class="terminal-container"
      :class="{ 'terminal-hidden': !isConnected }"
    ></div>

    <!-- Loading Overlay -->
    <div v-if="isConnecting" class="loading-overlay">
      <div class="loading-content">
        <VLoader size="large" />
        <p class="loading-text">Connecting SSH Terminal...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { Device } from '/@src/api/types'
import { remoteAccessApi } from '/@src/api'
import { Notyf } from 'notyf'

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

const notyf = new Notyf()

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

  // Create terminal instance
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

  // Create fit addon
  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)

  // Mount terminal to container
  terminal.open(terminalContainer.value)
  
  // Fit terminal
  nextTick(() => {
    if (fitAddon) {
      fitAddon.fit()
    }
  })

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
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3001'
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
        
        // Fit terminal
        if (fitAddon) {
          fitAddon.fit()
        }
        
        // Send initial terminal size
        sendTerminalSize()
        
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
      isConnecting.value = false
      isConnected.value = false
      statusMessage.value = 'SSH Connection Failed'
      statusDescription.value = 'Please check network or retry connection'
      statusType.value = 'danger'
      
      emit('statusChange', 'error', 'SSH Connection Failed')
      notyf.error('SSH Terminal Connection Failed')
    }

    websocket.onclose = () => {
      console.log('SSH WebSocket Connection Closed')
      isConnected.value = false
      isConnecting.value = false
      statusMessage.value = 'SSH Connection Closed'
      statusDescription.value = 'Connection has been terminated'
      statusType.value = 'info'
      
      // Clean up terminal handlers
      if (terminal) {
        terminal.dispose()
        initTerminal() // Reinitialize terminal
      }
      
      emit('statusChange', 'disconnected', 'SSH Connection Closed')
    }

  } catch (error) {
    console.error('Establish SSH Connection Failed:', error)
    isConnecting.value = false
    const errorMsg = error instanceof Error ? error.message : 'Connection Failed, Please Retry'
    statusMessage.value = 'Connection Failed'
    statusDescription.value = errorMsg
    statusType.value = 'danger'
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
  
  isConnected.value = false
  isConnecting.value = false
  statusMessage.value = 'SSH Connection Closed'
  statusDescription.value = 'Connection has been closed by user'
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
  
  // Handle user input
  terminal.onData((data) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(data)
    }
  })
  
  // Handle keyboard events
  terminal.onKey(({ key, domEvent }) => {
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
  background: #1e1e1e;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--light-box-shadow);
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
  z-index: 10;
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
}

:deep(.xterm-viewport) {
  background-color: #1e1e1e !important;
}

:deep(.xterm-screen) {
  background-color: #1e1e1e !important;
}
</style>