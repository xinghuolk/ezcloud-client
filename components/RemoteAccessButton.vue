<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { remoteAccessApi } from '/@src/api'
import type { Device, RemoteAccessStatus } from '/@src/api/types'
import { notyf } from '/@src/api/request'

interface Props {
  device: Device
  showStatusIndicators?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showStatusIndicators: true
})

const emit = defineEmits<{
  statusChange: [device: Device, status: RemoteAccessStatus]
}>()

const router = useRouter()

// State
const httpLoading = ref(false)
const sshLoading = ref(false)
const accessStatus = ref<RemoteAccessStatus | null>(null)
const showSshInfo = ref(false)
const statusPollingInterval = ref<number | null>(null)

// Computed
const httpStatus = computed(() => accessStatus.value?.http?.status || 'disconnected')
const sshStatus = computed(() => accessStatus.value?.ssh?.status || 'disconnected')

const httpButtonText = computed(() => {
  switch (httpStatus.value) {
    case 'connecting': return 'Connecting...'
    case 'connected': return 'Access Device'
    case 'error': return 'Connection Failed'
    default: return 'Web Access'
  }
})

const sshButtonText = computed(() => {
  switch (sshStatus.value) {
    case 'connecting': return 'Connecting...'
    case 'connected': return 'SSH Info'
    case 'error': return 'Connection Failed'
    default: return 'SSH Access'
  }
})

const sshHost = computed(() => accessStatus.value?.ssh?.host || window.location.hostname)
const sshPort = computed(() => accessStatus.value?.ssh?.port || 0)
const sshCommandLine = computed(() => 
  `ssh root@${sshHost.value} -p ${sshPort.value}`
)

// Methods
const getStatusTagColor = (status: string) => {
  switch (status) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'error': return 'danger'
    default: return 'light'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting'
    case 'error': return 'Error'
    default: return 'Disconnected'
  }
}

const handleHttpAccess = async () => {
  if (httpStatus.value === 'connected') {
    // If already connected, open device page directly
    // 使用后端返回的URL，后端已根据环境生成正确的URL
    const url = accessStatus.value?.http?.url
    if (!url) {
      notyf.error('Device URL not available, please try again')
      return
    }
    window.open(url, '_blank')
    return
  }

  httpLoading.value = true
  try {
    const response = await remoteAccessApi.startHttpAccess(props.device.id)
    // Always show the message from backend response
    notyf.success(response.data?.message || 'HTTP access establishing...')
    
    // If URL is provided in response, open immediately
    if (response.data?.url) {
      window.open(response.data.url, '_blank')
      httpLoading.value = false
    } else {
      // Start polling for status
      startStatusPolling()
    }
    
  } catch (error: any) {
    console.error('Start HTTP access error:', error)
    httpLoading.value = false
    
    // 设置HTTP错误状态
    if (accessStatus.value) {
      accessStatus.value.http = { status: 'error', message: error.response?.data?.message || 'Failed to start HTTP access' }
    } else {
      accessStatus.value = {
        http: { status: 'error', message: error.response?.data?.message || 'Failed to start HTTP access' },
        ssh: { status: 'disconnected' }
      }
    }
    
    notyf.error(error.response?.data?.message || 'Failed to start HTTP access')
  }
}

const handleSshAccess = async () => {
  if (sshStatus.value === 'connected') {
    // If already connected, show connection info
    showSshInfo.value = true
    return
  }

  sshLoading.value = true
  try {
    const response = await remoteAccessApi.startSshAccess(props.device.id)
    // Always show the message from backend response
    notyf.success(response.data?.message || 'SSH access establishing...')
    
    // Start polling for status
    startStatusPolling()
    
  } catch (error: any) {
    console.error('Start SSH access error:', error)
    sshLoading.value = false
    
    // 设置SSH错误状态
    if (accessStatus.value) {
      accessStatus.value.ssh = { status: 'error', message: error.response?.data?.message || 'Failed to start SSH access' }
    } else {
      accessStatus.value = {
        http: { status: 'disconnected' },
        ssh: { status: 'error', message: error.response?.data?.message || 'Failed to start SSH access' }
      }
    }
    
    notyf.error(error.response?.data?.message || 'Failed to start SSH access')
  }
}

const handleStopSshAccess = async () => {
  try {
    const response = await remoteAccessApi.stopRemoteAccess(props.device.id, 'ssh')
    if (response.success) {
      notyf.success('SSH tunnel closed')
      showSshInfo.value = false
      await fetchAccessStatus()
    }
  } catch (error: any) {
    console.error('Stop SSH access error:', error)
    notyf.error('Failed to close SSH tunnel')
  }
}

const fetchAccessStatus = async () => {
  try {
    const response = await remoteAccessApi.getRemoteAccessStatus(props.device.id)
    if (response.success) {
      const statusData = response.data as RemoteAccessStatus
      accessStatus.value = statusData
      
      // Notify parent component of status change
      emit('statusChange', props.device, statusData)
      
      // Auto-open HTTP page if connection successful
      if (httpLoading.value && statusData.http?.status === 'connected') {
        httpLoading.value = false
        const url = statusData.http?.url
        if (url) {
          notyf.success('HTTP tunnel established successfully! Opening device page...')
          window.open(url, '_blank')
        } else {
          notyf.error('Device URL not available from server')
        }
        stopStatusPolling()
      }
      
      // Show SSH info if connection successful
      if (sshLoading.value && statusData.ssh?.status === 'connected') {
        sshLoading.value = false
        notyf.success('SSH tunnel established successfully!')
        showSshInfo.value = true
        stopStatusPolling()
      }
      
      // Handle connection errors
      if (httpLoading.value && statusData.http?.status === 'error') {
        httpLoading.value = false
        stopStatusPolling()
        notyf.error('HTTP tunnel establishment failed')
      }
      
      if (sshLoading.value && statusData.ssh?.status === 'error') {
        sshLoading.value = false
        stopStatusPolling()
        notyf.error('SSH tunnel establishment failed')
      }
    }
  } catch (error) {
    console.error('Get remote access status failed:', error)
    
    // 设置错误状态确保UI正确显示
    if (httpLoading.value) {
      httpLoading.value = false
      // 设置HTTP错误状态
      if (accessStatus.value) {
        accessStatus.value.http = { status: 'error', message: 'Failed to get status' }
      } else {
        accessStatus.value = {
          http: { status: 'error', message: 'Failed to get status' },
          ssh: { status: 'disconnected' }
        }
      }
      notyf.error('HTTP connection status check failed')
    }
    
    if (sshLoading.value) {
      sshLoading.value = false
      // 设置SSH错误状态
      if (accessStatus.value) {
        accessStatus.value.ssh = { status: 'error', message: 'Failed to get status' }
      } else {
        accessStatus.value = {
          http: { status: 'disconnected' },
          ssh: { status: 'error', message: 'Failed to get status' }
        }
      }
      notyf.error('SSH connection status check failed')
    }
    
    stopStatusPolling()
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
    notyf.success('Copied to clipboard')
  } catch {
    notyf.error('Copy failed, please copy manually')
  }
}

const openWebTerminal = () => {
  // Check SSH connection status
  if (!accessStatus.value?.ssh || accessStatus.value.ssh.status !== 'connected') {
    notyf.error('Please start SSH tunnel connection first')
    return
  }
  
  // Ensure device ID is valid
  if (!props.device?.id) {
    notyf.error('Device ID invalid')
    return
  }
  
  try {
    // Open SSH terminal in new browser tab with standalone mode
    const terminalUrl = `${window.location.origin}/app/ssh-terminal/${props.device.id}?standalone=true`
    const newWindow = window.open(terminalUrl, '_blank', 'width=1200,height=800,menubar=no,toolbar=no,status=no,scrollbars=yes,resizable=yes')
    
    if (newWindow) {
      notyf.success(`Opening SSH Terminal for ${props.device.serial} in new window`)
      // Close SSH info modal after successful window opening
      showSshInfo.value = false
    } else {
      notyf.error('Failed to open new window. Please check popup blocker settings.')
    }
    
  } catch (error) {
    console.error('Failed to open SSH terminal:', error)
    notyf.error('Failed to open SSH terminal, please try again')
  }
}

// Lifecycle
onMounted(() => {
  fetchAccessStatus()
})

onUnmounted(() => {
  stopStatusPolling()
})
</script>

<template>
  <div class="remote-access-buttons">
    <!-- HTTP Access Button -->
    <VButton
      :color="httpStatus === 'connected' ? 'success' : 'primary'"
      size="medium"
      :loading="httpLoading"
      :disabled="!device.is_online"
      @click="handleHttpAccess"
      outlined
    >
      <iconify-icon 
        :icon="httpStatus === 'connected' ? 'lucide:monitor' : 'lucide:globe'" 
        class="mr-1" 
      />
      {{ httpButtonText }}
    </VButton>

    <!-- SSH Access Button -->
    <VButton
      :color="sshStatus === 'connected' ? 'success' : 'info'"
      size="medium"
      :loading="sshLoading"
      :disabled="!device.is_online"
      @click="handleSshAccess"
      outlined
    >
      <iconify-icon 
        :icon="sshStatus === 'connected' ? 'lucide:terminal' : 'lucide:server'" 
        class="mr-1" 
      />
      {{ sshButtonText }}
    </VButton>

    <!-- Status Indicators -->
    <div v-if="showStatusIndicators" class="status-indicators">
      <VTag
        v-if="httpStatus !== 'disconnected'"
        :color="getStatusTagColor(httpStatus)"
        size="tiny"
        class="status-tag"
      >
        HTTP: {{ getStatusText(httpStatus) }}
      </VTag>
      <VTag
        v-if="sshStatus !== 'disconnected'"
        :color="getStatusTagColor(sshStatus)"
        size="tiny"
        class="status-tag"
      >
        SSH: {{ getStatusText(sshStatus) }}
      </VTag>
    </div>

    <!-- SSH Connection Info Modal -->
    <VModal 
      :open="showSshInfo"
      title="SSH Tunnel Information"
      size="medium"
      actions="right"
      @close="showSshInfo = false"
    >
      <template #content>
        <div class="ssh-info-content">
          <VMessage color="success" class="mb-4">
            SSH Tunnel Established Successfully
          </VMessage>
          
          <div class="connection-methods">
            <h4 class="subtitle">Connection Method 1: SSH Command</h4>
            <VField>
              <VControl>
                <VInput
                  :model-value="sshCommandLine"
                  readonly
                />
              </VControl>
              <VControl>
                <VButton @click="copyToClipboard(sshCommandLine)" outlined>
                  <iconify-icon icon="lucide:copy" class="mr-2" />
                  Copy
                </VButton>
              </VControl>
            </VField>
            
            <h4 class="subtitle">Connection Method 2: Web Terminal</h4>          
            <div class="connection-details">
              <VButton color="primary" raised @click="openWebTerminal">
                <iconify-icon icon="lucide:monitor" class="mr-2" />
                Open Web SSH Terminal
              </VButton>
              <p class="help-text">
                Open SSH Terminal in browser, no extra software needed
              </p>
            </div>

            <h4 class="subtitle">Connection Method 3: SSH Client</h4>
            <div class="connection-details">
              <div class="ssh-details">
                <div class="detail-item">
                  <label>Server Address</label>
                  <span>{{ sshHost }}</span>
                </div>
                <div class="detail-item">
                  <label>Port</label>
                  <span>{{ sshPort }}</span>
                </div>
                <div class="detail-item">
                  <label>Username</label>
                  <span>root</span>
                </div>
                <div class="detail-item">
                  <label>Device Serial</label>
                  <span>{{ device.serial }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <VMessage color="info" class="mt-4">
            Note: SSH tunnel will be automatically closed after 30 minutes of inactivity
          </VMessage>
        </div>
      </template>
      
      <template #action>
        <VButton color="danger" @click="handleStopSshAccess" outlined>
          Close SSH Tunnel
        </VButton>
        <VButton color="primary" @click="showSshInfo = false" raised>
          Got it
        </VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
.remote-access-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-indicators {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;

  .status-tag {
    font-size: 0.75rem;
  }
}

.ssh-info-content {
  .connection-methods {
    .subtitle {
      margin: 1.5rem 0 0.75rem 0;
      color: var(--primary);
      font-weight: 600;
      
      &:first-child {
        margin-top: 0;
      }
    }

    .connection-details {
      margin-bottom: 1rem;

      .help-text {
        margin-top: 0.5rem;
        font-size: 0.85rem;
        color: var(--muted-grey);
      }
    }

    .ssh-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 1rem;
      background: var(--fade-grey-light-6);
      border-radius: var(--radius);
      border: 1px solid var(--fade-grey-light-3);

      .detail-item {
        label {
          display: block;
          font-weight: 600;
          color: var(--muted-grey);
          font-size: 0.8rem;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        span {
          color: var(--dark-text);
          font-weight: 500;
          font-family: 'Courier New', monospace;
        }
      }
    }
  }
}

.is-dark {
  .ssh-details {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
  }
}

@media only screen and (max-width: 767px) {
  .remote-access-buttons {
    flex-direction: column;
    align-items: stretch;
    width: 100%;

    .button {
      width: 100%;
    }
  }

  .ssh-details {
    grid-template-columns: 1fr;
  }
}
</style>