<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { devicesApi } from '/@src/api'
import type { Device } from '/@src/api/types'
import { Notyf } from 'notyf'
import WebSSHTerminal from '/@src/components/WebSSHTerminal.vue'

definePage({
  meta: {
    requiresAuth: true
  }
})

const route = useRoute()
const router = useRouter()
const notyf = new Notyf()

// State
const device = ref<Device | null>(null)
const loading = ref(true)
const error = ref<string>('')

// Get device ID from route params
const deviceIdParam = (route.params as { deviceId: string | string[] }).deviceId
const deviceId = Array.isArray(deviceIdParam) ? Number(deviceIdParam[0]) : Number(deviceIdParam)

// Initialize device data
const initializeDevice = async () => {
  try {
    loading.value = true
    error.value = ''
    
    if (!deviceId || isNaN(deviceId)) {
      throw new Error(`Invalid device ID: ${deviceIdParam}`)
    }
    
    // Get device info
    const deviceResponse = await devicesApi.getDevice(deviceId)
    if (deviceResponse.success) {
      device.value = deviceResponse.data
    } else {
      throw new Error('Failed to get device information')
    }
  } catch (err: any) {
    console.error('Device initialization failed:', err)
    error.value = err.message || 'Initialization failed'
    notyf.error(error.value)
  } finally {
    loading.value = false
  }
}

// Handle SSH terminal close
const handleTerminalClose = () => {
  router.push('/app/devices')
}

// Handle SSH terminal status change
const handleStatusChange = (status: 'connected' | 'disconnected' | 'error', message?: string) => {
  console.log('SSH Terminal Status Change:', status, message)
}

// Lifecycle
onMounted(() => {
  initializeDevice()
})

useHead({
  title: computed(() => device.value ? `${device.value.name || device.value.serial} - Device Workspace - EzCloud` : 'Device Workspace - EzCloud')
})
</script>

<template>
  <div class="ssh-terminal-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <VLoader size="large" />
      <p class="loading-text">Loading device information...</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <VPlaceholderPage 
        title="Cannot Load Device"
        :subtitle="error"
      >
        <template #action>
          <VButton color="primary" raised @click="initializeDevice">
            Retry
          </VButton>
          <VButton @click="router.push('/app/devices')" outlined>
            Back to Device List
          </VButton>
        </template>
      </VPlaceholderPage>
    </div>
    
    <!-- SSH Terminal -->
    <WebSSHTerminal 
      v-else-if="device"
      :device="device"
      :auto-connect="true"
      @close="handleTerminalClose"
      @status-change="handleStatusChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.ssh-terminal-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background-grey);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--white);

  .loading-text {
    margin-top: 1rem;
    color: var(--muted-grey);
    font-weight: 500;
  }
}

.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--white);
}

.is-dark {
  .loading-container,
  .error-container {
    background: var(--dark-sidebar);
  }
}
</style>

