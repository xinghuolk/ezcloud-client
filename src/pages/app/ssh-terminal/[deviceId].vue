<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
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

// Get device ID from route params and check standalone mode
const deviceIdParam = (route.params as { deviceId: string | string[] }).deviceId
const deviceId = Array.isArray(deviceIdParam) ? Number(deviceIdParam[0]) : Number(deviceIdParam)
const isStandalone = computed(() => route.query.standalone === 'true')

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
  if (isStandalone.value) {
    // In standalone mode, close the window
    window.close()
  } else {
    // In normal mode, navigate back to devices page
    router.push('/app/devices')
  }
}

// Handle SSH terminal status change
const handleStatusChange = (status: 'connected' | 'disconnected' | 'error', message?: string) => {
  console.log('SSH Terminal Status Change:', status, message)
}

// Lifecycle
onMounted(() => {
  initializeDevice()
  
  // 在standalone模式下隐藏布局元素
  if (isStandalone.value) {
    document.body.classList.add('ssh-terminal-standalone')
  }
})

onUnmounted(() => {
  // 清理standalone模式的CSS类
  document.body.classList.remove('ssh-terminal-standalone')
})

useHead({
  title: computed(() => device.value ? `${device.value.name || device.value.serial} - Device Workspace - EzCloud` : 'Device Workspace - EzCloud')
})
</script>

<template>
  <div class="ssh-terminal-page" :class="{ 'standalone-mode': isStandalone }">
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
          <VButton @click="handleTerminalClose" outlined>
            {{ isStandalone ? 'Close Window' : 'Back to Device List' }}
          </VButton>
        </template>
      </VPlaceholderPage>
    </div>
    
    <!-- SSH Terminal -->
    <WebSSHTerminal 
      v-else-if="device"
      :device="device"
      :auto-connect="true"
      :standalone="isStandalone"
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
  
  &.standalone-mode {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: #1e1e1e;
  }
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

<!-- Global styles for standalone mode -->
<style lang="scss">
body.ssh-terminal-standalone {
  // 隐藏所有可能的导航和菜单元素
  .sidebar,
  .navbar,
  .toolbar, 
  .breadcrumb,
  .mobile-sidebar,
  .layout-header,
  .layout-footer,
  .app-layout .navbar,
  .app-layout .sidebar,
  .view-wrapper > .navbar,
  .view-wrapper > .sidebar,
  nav,
  header {
    display: none !important;
  }
  
  // 让主要内容区域全屏
  .view-wrapper,
  .page-content-wrapper,
  .page-content-inner,
  .app-layout,
  .app-wrapper,
  #app {
    padding: 0 !important;
    margin: 0 !important;
    height: 100vh !important;
    width: 100vw !important;
  }
  
  // 确保SSH终端页面占满全屏
  .ssh-terminal-page.standalone-mode {
    height: 100vh !important;
    width: 100vw !important;
  }
}
</style>

