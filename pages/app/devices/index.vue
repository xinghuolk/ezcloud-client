<script setup lang="ts">
import { reactive, onMounted, watch } from 'vue'
import { useDeviceManagement } from './composables/useDeviceManagement'
import { useDeviceDialogs } from './composables/useDeviceDialogs'
import { useDeviceStore } from '/@src/stores/devices'
import { useFormErrorHandler } from '/@src/composables/use-error-handler'
import type { Device, DeviceQuery } from '/@src/api/types'
import DeviceList from './components/DeviceList.vue'
import DeviceDetailDialog from './components/DeviceDetailDialog.vue'
import DeviceDialogs from './components/DeviceDialogs.vue'
import DeviceTrustManager from '/@src/components/DeviceTrustManager.vue'

definePage({
  meta: {
    requiresAuth: true
  }
})

const deviceStore = useDeviceStore()

// Composables
const deviceManagement = useDeviceManagement()
const deviceDialogs = useDeviceDialogs()

// Error handling
const { createFormErrors, clearFormErrors, setFieldError, handleError } = useFormErrorHandler()
const bindErrors = createFormErrors()

// Search and filter state
const filterForm = reactive<DeviceQuery>({
  page: 1,
  limit: 20,
  search: '',
  is_online: undefined,
  is_activate: undefined,
  version: ''
})

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Methods
const fetchDevices = async () => {
  await deviceManagement.fetchDevices(filterForm)
}

const handleRefresh = () => {
  fetchDevices()
}

const handlePageChange = (newPage: number) => {
  filterForm.page = newPage
  fetchDevices()
}

const handleLimitChange = (newLimit: number) => {
  filterForm.limit = newLimit
  filterForm.page = 1
  fetchDevices()
}

const handleDebouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    filterForm.page = 1
    fetchDevices()
  }, 500)
}

const handleImmediateSearch = () => {
  filterForm.page = 1
  fetchDevices()
}

const handleReset = () => {
  Object.assign(filterForm, {
    search: '',
    is_online: undefined,
    is_activate: undefined,
    version: ''
  })
  filterForm.page = 1
  fetchDevices()
}

const handleSelectionChange = (selection: Device[]) => {
  // 批量操作功能已移除
}

const handleViewDetails = async (device: Device) => {
  try {
    const details = await deviceStore.fetchDeviceDetails(device.id)
    if (details) {
      deviceDialogs.selectedDevice.value = details
      deviceDialogs.detailsDialogOpen.value = true
    }
  } catch (error) {
    console.error('Failed to fetch device details:', error)
    handleError(error, { fallbackMessage: 'Failed to load device details' })
  }
}

const handleManageTrust = (device: Device) => {
  deviceDialogs.openTrustDialog(device)
}

const handleReboot = (device: Device) => {
  deviceDialogs.openRebootConfirm(device)
}

const handleUnbind = (device: Device) => {
  deviceDialogs.openUnbindConfirm(device)
}

const handleRemoteAccessStatusChange = () => {
  // Handle remote access status changes if needed
}

const handleBindDevice = async (data: { serial: string; name: string }) => {
  clearFormErrors(bindErrors)
  
  if (!data.serial.trim()) {
    setFieldError(bindErrors, 'serial', 'Please enter serial number')
    return
  }
  
  try {
    const success = await deviceManagement.bindDevice(data.serial)
    if (success) {
      deviceDialogs.closeBindDialog()
      await fetchDevices()
    }
  } catch (error) {
    console.error('Failed to bind device:', error)
    handleError(error, { fallbackMessage: 'Failed to bind device' })
  }
}


const confirmReboot = async () => {
  if (!deviceDialogs.selectedDeviceForReboot.value) return
  
  try {
    const success = await deviceManagement.rebootDevice(deviceDialogs.selectedDeviceForReboot.value.id)
    if (success) {
      deviceDialogs.closeRebootConfirm()
    }
  } catch (error) {
    console.error('Failed to reboot device:', error)
    handleError(error, { fallbackMessage: 'Failed to reboot device' })
  }
}

const confirmUnbind = async () => {
  if (!deviceDialogs.selectedDeviceForUnbind.value) return
  
  try {
    const success = await deviceManagement.unbindDevice(deviceDialogs.selectedDeviceForUnbind.value.id)
    if (success) {
      deviceDialogs.closeUnbindConfirm()
      await fetchDevices()
    }
  } catch (error) {
    console.error('Failed to unbind device:', error)
    handleError(error, { fallbackMessage: 'Failed to unbind device' })
  }
}

const handleTrustUpdated = () => {
  fetchDevices()
}

// Watch for filter changes
watch(() => filterForm.is_online, () => {
  handleImmediateSearch()
})

watch(() => filterForm.is_activate, () => {
  handleImmediateSearch()
})

watch(() => filterForm.search, () => {
  handleDebouncedSearch()
})


watch(() => filterForm.version, () => {
  handleDebouncedSearch()
})

// Lifecycle
onMounted(() => {
  fetchDevices()
})

useHead({
  title: 'Device Management - Ezen Cloud',
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">Device Management</h1>
          <p class="subtitle is-6">Manage your 5G gateway devices</p>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="columns is-multiline mb-6">
      <div class="column is-3">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-primary">{{ deviceManagement.deviceCount.value }}</h3>
          <p class="subtitle is-6">Total Devices</p>
        </VCard>
      </div>
      <div class="column is-3">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-success">{{ deviceManagement.onlineCount.value }}</h3>
          <p class="subtitle is-6">Online Devices</p>
        </VCard>
      </div>
      <div class="column is-3">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-info">{{ deviceManagement.ownedCount.value }}</h3>
          <p class="subtitle is-6">Owned Devices</p>
        </VCard>
      </div>
      <div class="column is-3">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-warning">{{ deviceManagement.trustedCount.value }}</h3>
          <p class="subtitle is-6">Trusted Devices</p>
        </VCard>
      </div>
    </div>

    <!-- Controls -->
    <VCard>
      <!-- Filter Section -->
      <div class="card-content">
        <div class="columns is-multiline">
          <div class="column is-4">
            <VField>
              <VLabel>Search</VLabel>
              <VControl>
                <VInput
                  v-model="filterForm.search"
                  placeholder="Search by serial, MAC, name or IP"
                  icon="lucide:search"
                />
              </VControl>
            </VField>
          </div>
          <div class="column is-2">
            <VField>
              <VLabel>Status</VLabel>
              <VControl>
                <VSelect v-model="filterForm.is_online">
                  <VOption value="">All</VOption>
                  <VOption :value="true">Online</VOption>
                  <VOption :value="false">Offline</VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>
          <div class="column is-2">
            <VField>
              <VLabel>Activation</VLabel>
              <VControl>
                <VSelect v-model="filterForm.is_activate">
                  <VOption value="">All</VOption>
                  <VOption :value="true">Activated</VOption>
                  <VOption :value="false">Not Activated</VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>
          <div class="column is-4">
            <VField>
              <VLabel>Version</VLabel>
              <VControl>
                <VInput
                  v-model="filterForm.version"
                  placeholder="Filter by version"
                />
              </VControl>
            </VField>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="buttons">
          <VButton 
            color="primary"
            @click="deviceDialogs.openBindDialog()"
          >
            <iconify-icon icon="lucide:plus" class="mr-2" />
            Bind Device
          </VButton>
          <VButton 
            outlined
            @click="handleReset"
          >
            <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
            Reset Filters
          </VButton>
          <VButton 
            outlined
            @click="handleRefresh"
          >
            <iconify-icon icon="lucide:refresh-cw" />
            Refresh
          </VButton>
        </div>
      </div>

      <!-- Device List -->
      <DeviceList
        :devices="deviceManagement.devices.value"
        :loading="deviceManagement.loading.value"
        :pagination="deviceManagement.pagination.value"
        :filterLimit="filterForm.limit || 20"
        @selection-change="handleSelectionChange"
        @page-change="handlePageChange"
        @limit-change="handleLimitChange"
        @view-details="handleViewDetails"
        @manage-trust="handleManageTrust"
        @reboot="handleReboot"
        @unbind="handleUnbind"
        @remote-access-status-change="handleRemoteAccessStatusChange"
      />
    </VCard>

    <!-- Detail Dialog -->
    <DeviceDetailDialog
      :open="deviceDialogs.detailsDialogOpen.value"
      :device="deviceDialogs.selectedDevice.value"
      @close="deviceDialogs.closeDetailsDialog()"
    />

    <!-- Small Dialogs -->
    <DeviceDialogs
      :bind-dialog-open="deviceDialogs.bindDialogOpen.value"
      :bind-errors="bindErrors"
      :batch-dialog-open="deviceDialogs.batchDialogOpen.value"
      :selected-devices="deviceDialogs.selectedDevicesForBatch.value"
      :reboot-confirm-open="deviceDialogs.rebootConfirmOpen.value"
      :selected-device-for-reboot="deviceDialogs.selectedDeviceForReboot.value"
      :unbind-confirm-open="deviceDialogs.unbindConfirmOpen.value"
      :selected-device-for-unbind="deviceDialogs.selectedDeviceForUnbind.value"
      @update:bind-dialog-open="deviceDialogs.bindDialogOpen.value = $event"
      @update:batch-dialog-open="deviceDialogs.batchDialogOpen.value = $event"
      @update:reboot-confirm-open="deviceDialogs.rebootConfirmOpen.value = $event"
      @update:unbind-confirm-open="deviceDialogs.unbindConfirmOpen.value = $event"
      @bind-device="handleBindDevice"
      @confirm-reboot="confirmReboot"
      @confirm-unbind="confirmUnbind"
    />

    <!-- Trust Manager -->
    <DeviceTrustManager
      v-if="deviceDialogs.selectedDevice.value"
      :device="deviceDialogs.selectedDevice.value"
      :open="deviceDialogs.trustDialogOpen.value"
      @close="deviceDialogs.closeTrustDialog()"
      @trust-updated="handleTrustUpdated"
    />
  </div>
</template>

<style lang="scss" scoped>
// Styles inherited from original devices.vue
// Most styles are handled by component styles and common framework styles
</style>