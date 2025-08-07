<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeviceStore } from '/@src/stores/devices'
import { devicesApi } from '/@src/api'
import type { Device, DeviceStatus } from '/@src/api/types'
import { Notyf } from 'notyf'

definePage({
  meta: {
    requiresAuth: true
  }
})

const route = useRoute()
const router = useRouter()
const devicesStore = useDeviceStore()
const notyf = new Notyf()

// State
const device = ref<Device | null>(null)
const loading = ref(true)
const statusHistory = ref<DeviceStatus[]>([])
const editingName = ref(false)
const editName = ref('')
const actionLoading = ref(false)

// Computed MAC addresses
const calculatedMacAddresses = computed(() => {
  if (!device.value?.serialNumber) {
    console.log('No serialNumber data for MAC calculation')
    return []
  }
  
  const { mac_start, mac_count, mac_interval } = device.value.serialNumber
  console.log('MAC calculation data:', { mac_start, mac_count, mac_interval })
  const addresses = []
  
  // Convert MAC address to number for calculation
  const macToNumber = (mac: string) => {
    return parseInt(mac.replace(/:/g, ''), 16)
  }
  
  // Convert number back to MAC address format
  const numberToMac = (num: number) => {
    const hex = num.toString(16).padStart(12, '0').toUpperCase()
    return hex.match(/.{2}/g)?.join(':') || ''
  }
  
  const startNum = macToNumber(mac_start)
  
  for (let i = 0; i < mac_count; i++) {
    const macNum = startNum + (i * mac_interval)
    addresses.push(numberToMac(macNum))
  }
  
  return addresses
})

// Format date time
const formatDateTime = (dateTime: string | null) => {
  if (!dateTime) return 'Never'
  return new Date(dateTime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format bytes
const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

// Start editing device name
const startEditName = () => {
  editName.value = device.value?.name || ''
  editingName.value = true
}

// Save device name
const saveDeviceName = async () => {
  if (!device.value) return
  
  try {
    const success = await devicesStore.updateDeviceName(device.value.id, editName.value)
    if (success && device.value) {
      device.value.name = editName.value
      notyf.success('Device name updated successfully')
    }
  } catch (error) {
    console.error('Failed to update device name:', error)
    notyf.error('Failed to update device name')
  } finally {
    editingName.value = false
  }
}

// Force reset editing state
const resetEditingState = () => {
  editingName.value = false
  editName.value = ''
  console.log('Editing state reset - editingName:', editingName.value)
}

// Load device details
const loadDeviceDetails = async () => {
  const rawId = String(route.params.id || '')
  const deviceId = Number(rawId)
  if (!rawId || !deviceId || isNaN(deviceId)) {
    console.error('Invalid device ID:', rawId)
    notyf.error('Invalid device ID')
    router.push('/app/devices')
    return
  }

  loading.value = true
  console.log('Loading device details for ID:', deviceId)
  
  try {
    device.value = await devicesStore.fetchDeviceDetails(deviceId)
    console.log('Device details loaded:', device.value)
    
    // Force reset editing state after device loads
    resetEditingState()
    
    if (device.value) {
      await loadStatusHistory()
    } else {
      console.warn('No device data returned from store')
    }
  } catch (error) {
    console.error('Failed to load device details:', error)
    notyf.error('Failed to load device details')
  } finally {
    loading.value = false
  }
}

// Load status history
const loadStatusHistory = async () => {
  if (!device.value) return
  
  try {
    console.log('Loading status history for device ID:', device.value.id)
    const response = await devicesApi.getDeviceStatus(device.value.id, { limit: 10 })
    console.log('Status history response:', response)
    
    if (response.success) {
      statusHistory.value = response.data
      console.log('Status history loaded:', statusHistory.value)
    } else {
      console.warn('Failed to load status history:', response.message)
    }
  } catch (error) {
    console.error('Exception when loading status history:', error)
  }
}

// Restart device
const restartDevice = async () => {
  if (!device.value) return
  
  actionLoading.value = true
  try {
    const response = await devicesApi.operateDevice(device.value.id, 'restart')
    if (response.success) {
      notyf.success('Restart command sent successfully')
    }
  } catch (error) {
    console.error('Failed to restart device:', error)
    notyf.error('Failed to restart device')
  } finally {
    actionLoading.value = false
  }
}

// Configure device
const configureDevice = () => {
  notyf.success('Configuration feature coming soon')
}

// Unbind device
const unbindDevice = async () => {
  if (!device.value) return
  
  actionLoading.value = true
  try {
    const success = await devicesStore.unbindDevice(device.value.id)
    if (success) {
      notyf.success('Device unbound successfully')
      router.push('/app/devices')
    }
  } catch (error) {
    console.error('Failed to unbind device:', error)
    notyf.error('Failed to unbind device')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  loadDeviceDetails()
})

useHead({
  title: computed(() => device.value ? `Device ${device.value.name || device.value.serial} - Ezen Cloud` : 'Device Details - Ezen Cloud')
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <VButton @click="$router.back()" outlined>
          <iconify-icon icon="lucide:arrow-left" class="mr-2" />
          Back
        </VButton>
        <div class="header-info">
          <h1 class="title is-3">Device Details</h1>
          <p v-if="device" class="subtitle">{{ device.name || device.serial }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <VPlaceload class="mb-4" />
      <VPlaceload class="mb-4" />
      <VPlaceload class="mb-4" />
    </div>

    <!-- Debug Info -->
    <div v-if="!loading" class="debug-info" style="background: yellow; padding: 10px; margin: 10px; border: 2px solid red;">
      <h4>DEBUG INFO:</h4>
      <p>Device exists: {{ !!device }}</p>
      <p>Device ID: {{ device?.id }}</p>
      <p>Device Serial: {{ device?.serial }}</p>
      <p>editingName: {{ editingName }} (type: {{ typeof editingName }})</p>
      <p>editingName raw: {{ editingName }} (should be false)</p>
      <p>Loading: {{ loading }}</p>
      <p>Template render condition (!editingName): {{ !editingName }}</p>
    </div>

    <!-- Device Content -->
    <div v-else-if="device" class="device-content">
      <!-- Basic Information -->
      <VCard radius="smooth" class="mb-6">
        <template #header>
          <div class="common-card-header">
            <h3 class="title is-5">Basic Information</h3>
            <div class="status-badges">
              <VTag :color="device.is_online ? 'success' : 'danger'" size="tiny">
                {{ device.is_online ? 'Online' : 'Offline' }}
              </VTag>
              <VTag :color="device.is_activate ? 'success' : 'warning'" size="tiny">
                {{ device.is_activate ? 'Activated' : 'Not Activated' }}
              </VTag>
            </div>
          </div>
        </template>

        <div class="common-info-grid">
          <div class="common-info-item">
            <label>Device Name</label>
            <div class="common-editable-field">
              <span v-if="!editingName" :key="'span-' + device.id">{{ device.name || 'Unnamed Device' }}</span>
              <VInput 
                v-else 
                v-model="editName" 
                size="small" 
                @blur="saveDeviceName"
                @keyup.enter="saveDeviceName"
                :key="'input-' + device.id"
              />
              <VButton 
                v-if="!editingName"
                size="medium"
                light
                @click="startEditName"
              >
                <iconify-icon icon="lucide:edit" />
              </VButton>
            </div>
          </div>

          <div class="common-info-item">
            <label>Serial Number</label>
            <div style="background: lightblue; padding: 5px; margin: 2px;">
              <small>DEBUG: device.serial = {{ device.serial }} (type: {{ typeof device.serial }})</small>
            </div>
            <span>{{ device.serial }}</span>
          </div>

          <div class="common-info-item">
            <label>Primary MAC</label>
            <span>{{ device.primary_mac }}</span>
          </div>

          <div class="common-info-item">
            <label>Brand</label>
            <span>{{ device.deviceModel?.oemname || 'Unknown' }}</span>
          </div>

          <div class="common-info-item">
            <label>Model</label>
            <span>{{ device.deviceModel?.stdname || 'Unknown' }}</span>
          </div>

          <div class="common-info-item">
            <label>Device Type</label>
            <span>{{ device.deviceModel?.devtype || 'Unknown' }}</span>
          </div>

          <div class="common-info-item">
            <label>WAN IP</label>
            <span>{{ device.wanip || 'Not Available' }}</span>
          </div>

          <div class="common-info-item">
            <label>Public IP</label>
            <span>{{ device.public_ip || 'Not Available' }}</span>
          </div>

          <div class="common-info-item">
            <label>Firmware Version</label>
            <span>{{ device.version || 'Unknown' }}</span>
          </div>

          <div class="common-info-item">
            <label>First Connection</label>
            <span>{{ formatDateTime(device.firsttime || null) }}</span>
          </div>

          <div class="common-info-item">
            <label>Last Seen</label>
            <span>{{ formatDateTime(device.last_seen || null) }}</span>
          </div>

          <div class="common-info-item">
            <label>Created At</label>
            <span>{{ formatDateTime(device.created_at) }}</span>
          </div>
        </div>
      </VCard>

      <!-- MAC Address Range -->
      <VCard v-if="device.serialNumber" radius="smooth" class="mb-6">
        <template #header>
          <h3 class="title is-5">MAC Address Range</h3>
        </template>

        <div class="common-info-grid">
          <div class="common-info-item">
            <label>Batch ID</label>
            <span>{{ device.serialNumber.batch_id }}</span>
          </div>
          <div class="common-info-item">
            <label>MAC Start</label>
            <span>{{ device.serialNumber.mac_start }}</span>
          </div>
          <div class="common-info-item">
            <label>MAC Count</label>
            <span>{{ device.serialNumber.mac_count }}</span>
          </div>
          <div class="common-info-item">
            <label>MAC Interval</label>
            <span>{{ device.serialNumber.mac_interval }}</span>
          </div>
        </div>

        <div class="mac-range">
          <h4 class="subtitle">Available MAC Addresses:</h4>
          <div class="mac-list">
            <VTag 
              v-for="(mac, index) in calculatedMacAddresses" 
              :key="index"
              class="mac-tag"
              color="light"
            >
              {{ mac }}
            </VTag>
          </div>
        </div>
      </VCard>

      <!-- Status History -->
      <VCard radius="smooth" class="mb-6">
        <template #header>
          <div class="common-card-header">
            <h3 class="title is-5">Status History</h3>
            <VButton @click="loadStatusHistory" outlined>
              <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
              Refresh
            </VButton>
          </div>
        </template>

        <div v-if="statusHistory.length === 0" class="empty-state">
          <VPlaceholderPage 
            title="No status data available"
            subtitle="No status information has been reported by this device yet"
          />
        </div>

        <VFlexTable v-else>
          <template #header>
            <VFlexTableSortColumn id="time-col" label="Time">Time</VFlexTableSortColumn>
            <VFlexTableSortColumn id="cpu-col" label="CPU Load">CPU Load</VFlexTableSortColumn>
            <VFlexTableSortColumn id="memory-col" label="Memory Load">Memory Load</VFlexTableSortColumn>
            <VFlexTableSortColumn id="hosts-col" label="Connected Hosts">Connected Hosts</VFlexTableSortColumn>
            <VFlexTableSortColumn id="upload-col" label="Upload">Upload</VFlexTableSortColumn>
            <VFlexTableSortColumn id="download-col" label="Download">Download</VFlexTableSortColumn>
          </template>

          <template #body>
            <VFlexTableCell 
              v-for="status in statusHistory" 
              :key="status.id"
            >
              <VFlexTableCellColumn>
                {{ formatDateTime(status.reported_at) }}
              </VFlexTableCellColumn>
              <VFlexTableCellColumn>
                {{ status.cpuload ? `${status.cpuload}%` : 'N/A' }}
              </VFlexTableCellColumn>
              <VFlexTableCellColumn>
                {{ status.memload ? `${status.memload}%` : 'N/A' }}
              </VFlexTableCellColumn>
              <VFlexTableCellColumn>
                {{ status.hostnum }} / {{ status.hostmax }}
              </VFlexTableCellColumn>
              <VFlexTableCellColumn>
                {{ formatBytes(status.upload_total) }}
              </VFlexTableCellColumn>
              <VFlexTableCellColumn>
                {{ formatBytes(status.download_total) }}
              </VFlexTableCellColumn>
            </VFlexTableCell>
          </template>
        </VFlexTable>
      </VCard>

      <!-- Device Operations -->
      <VCard radius="smooth">
        <template #header>
          <h3 class="title is-5">Device Operations</h3>
        </template>

        <div class="action-buttons">
          <VButton 
            color="primary" 
            raised
            :loading="actionLoading"
            @click="restartDevice"
          >
            <iconify-icon icon="lucide:refresh-ccw" class="mr-2" />
            Restart Device
          </VButton>
          <VButton 
            color="warning" 
            raised
            @click="configureDevice"
          >
            <iconify-icon icon="lucide:settings" class="mr-2" />
            Configure
          </VButton>
          <VButton 
            color="danger" 
            raised
            :loading="actionLoading"
            @click="unbindDevice"
          >
            <iconify-icon icon="lucide:unlink" class="mr-2" />
            Unbind Device
          </VButton>
        </div>
      </VCard>
    </div>

    <!-- Error State -->
    <div v-else class="error-state">
      <VPlaceholderPage 
        title="Device Not Found"
        subtitle="The requested device could not be found."
      >
        <template #action>
          <VButton color="primary" raised @click="$router.push('/app/devices')">
            Back to Device List
          </VButton>
        </template>
      </VPlaceholderPage>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.loading-container {
  .v-placeload {
    height: 200px;
  }
}

.device-content {
  display: flex;
  flex-direction: column;
}

.mac-range {
  margin-top: 1.5rem;

  .subtitle {
    margin: 0 0 1rem 0;
    color: var(--dark-text);
    font-weight: 600;
  }

  .mac-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;

    .mac-tag {
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
    }
  }
}

.empty-state {
  padding: 2rem 0;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

@media only screen and (max-width: 767px) {
  .action-buttons {
    flex-direction: column;

    .button {
      width: 100%;
    }
  }
}
</style>