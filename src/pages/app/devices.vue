<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useDeviceStore } from '/@src/stores/devices'
import { useUserSession } from '/@src/stores/user-session'
import type { Device, DeviceQuery } from '/@src/api/types'
import { deviceApi } from '/@src/api'
import RemoteAccessButton from '/@src/components/RemoteAccessButton.vue'
import DeviceTrustManager from '/@src/components/DeviceTrustManager.vue'
import { Notyf } from 'notyf'

definePage({
  meta: {
    requiresAuth: true
  }
})

const notyf = new Notyf()
const deviceStore = useDeviceStore()
const userSession = useUserSession()

// State
const loading = ref(false)
const bindDialogOpen = ref(false)
const detailsDialogOpen = ref(false)
const batchDialogOpen = ref(false)
const trustDialogOpen = ref(false)
const selectedDevices = ref<Device[]>([])
const selectedDevice = ref<Device | null>(null)
const activeTab = ref('basic')
const wifiData = ref<any>(null)
const modemData = ref<any>(null)
const loadingWifi = ref(false)
const loadingModem = ref(false)

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Form data
const filterForm = reactive<DeviceQuery>({
  page: 1,
  limit: 20,
  search: '',
  is_online: undefined,
  is_activate: undefined,
  oemname: '',
  stdname: ''
})

const bindForm = reactive({
  serial: '',
  name: ''
})

const batchForm = reactive({
  operation: ''
})

// Computed
const isAdmin = computed(() => userSession.isAdmin)
const devices = computed(() => deviceStore.devices)
const pagination = computed(() => deviceStore.pagination)
const deviceCount = computed(() => deviceStore.deviceCount)
const onlineCount = computed(() => deviceStore.onlineCount)
const offlineCount = computed(() => deviceStore.offlineCount)
// Trust device related computed properties
const ownedCount = computed(() => deviceStore.ownedCount)
const trustedCount = computed(() => deviceStore.trustedCount)

// Methods
const fetchDevices = async () => {
  loading.value = true
  try {
    // Fetch device list including trusted devices
    await deviceStore.fetchDevicesWithTrusted(filterForm)
  } finally {
    loading.value = false
  }
}

const handleRefresh = () => {
  fetchDevices()
}

const handleSearch = () => {
  filterForm.page = 1
  fetchDevices()
}

// Debounced search for text inputs
const handleDebouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    filterForm.page = 1
    fetchDevices()
  }, 500)
}

// Immediate search for dropdowns
const handleImmediateSearch = () => {
  filterForm.page = 1
  fetchDevices()
}

const handleReset = () => {
  Object.assign(filterForm, {
    search: '',
    is_online: undefined,
    is_activate: undefined,
    oemname: '',
    stdname: ''
  })
  filterForm.page = 1
  fetchDevices()
}

const handleSelectionChange = (selection: Device[]) => {
  selectedDevices.value = selection
}

const handleViewDetails = async (device: Device) => {
  const details = await deviceStore.fetchDeviceDetails(device.id)
  if (details) {
    selectedDevice.value = details
    detailsDialogOpen.value = true
    // Reset tab-specific data
    wifiData.value = null
    modemData.value = null
  }
}

const handleBindDevice = async () => {
  if (!bindForm.serial.trim()) {
    notyf.error('Please enter serial number')
    return
  }
  
  const success = await deviceStore.bindDevice(bindForm.serial)
  if (success) {
    bindDialogOpen.value = false
    bindForm.serial = ''
    bindForm.name = ''
    fetchDevices()
  }
}

const handleUnbind = async (device: Device) => {
  if (!confirm(`Are you sure you want to unbind device "${device.serial}"? This will remove the device from your account.`)) {
    return
  }
  
  const success = await deviceStore.unbindDevice(device.id)
  if (success) {
    fetchDevices()
  }
}

const handleBatchOperation = async () => {
  if (!batchForm.operation || selectedDevices.value.length === 0) return

  const deviceIds = selectedDevices.value.map(d => d.id)
  let operationType = batchForm.operation
  let params = {}

  if (batchForm.operation === 'sim_slot_1') {
    operationType = 'sim_switch'
    params = { slot: 1 }
  } else if (batchForm.operation === 'sim_slot_2') {
    operationType = 'sim_switch'
    params = { slot: 2 }
  }

  const success = await deviceStore.batchOperation(deviceIds, operationType, params)
  if (success) {
    batchDialogOpen.value = false
    batchForm.operation = ''
    selectedDevices.value = []
  }
}

const handleReboot = async (device: Device) => {
  await deviceStore.rebootDevice(device.id)
}

const handleSIMSwitch = async (device: Device, slot: number) => {
  await deviceStore.switchSIM(device.id, slot)
}

const handleRemoteAccessStatusChange = (device: Device, status: any) => {
  // Handle remote access status changes
  console.log(`Device ${device.serial} remote access status updated:`, status)
  // Additional status handling logic can be added here, such as notifications, logging, etc.
}

const handleManageTrust = (device: Device) => {
  selectedDevice.value = device
  trustDialogOpen.value = true
}

const handleTrustUpdated = () => {
  // Refresh device list after trust relationship update
  fetchDevices()
}

// Load WiFi data for selected device
const loadWiFiData = async () => {
  if (!selectedDevice.value) return
  
  loadingWifi.value = true
  console.log('=== WiFi Data Debug ===')
  console.log('Loading WiFi data for device:', selectedDevice.value.id, selectedDevice.value.serial)
  
  try {
    const response = await deviceApi.getDeviceWiFi(selectedDevice.value.id)
    console.log('Raw WiFi API response:', response)
    console.log('Response success:', response.success)
    console.log('Response data:', response.data)
    console.log('Data type:', typeof response.data)
    console.log('Data keys:', response.data ? Object.keys(response.data) : 'no data')
    
    if (response.success && response.data) {
      console.log('Raw WiFi API response data:', response.data)
      
      // 直接使用实际的radios数组结构
      const rawData = response.data as any
      
      if (rawData.wifi && rawData.wifi.radios) {
        console.log('使用实际WiFi radios数据...', rawData.wifi.radios)
        
        // 使用真实数据结构，添加统计信息
        const transformedData = {
          ...rawData.wifi,
          // 统计信息
          total_radios: rawData.wifi.radios.length,
          enabled_radios: rawData.wifi.radios.filter((r: any) => r.enabled).length,
          total_clients: rawData.wifi.radios.reduce((sum: number, r: any) => sum + (r.connected_clients || 0), 0),
          bands_summary: [...new Set(rawData.wifi.radios.map((r: any) => r.band))].join(', ')
        }
        
        wifiData.value = transformedData
      } else {
        wifiData.value = { radios: [], ap_enabled: false }
      }
      
      console.log('WiFi data set successfully:', wifiData.value)
      
      // Debug actual data fields
      console.log('--- Real WiFi Data Fields ---')
      console.log('ap_enabled:', wifiData.value.ap_enabled)
      console.log('radios count:', wifiData.value.radios?.length)
      console.log('total_clients:', wifiData.value.total_clients)
      console.log('bands_summary:', wifiData.value.bands_summary)
    } else {
      console.warn('Failed to load WiFi data - API returned error:', response.message)
      console.warn('Or response.data is empty/null')
      wifiData.value = null
    }
  } catch (error) {
    console.error('Exception when loading WiFi data:', error)
    console.error('Error details:', (error as Error).message)
    console.error('Error stack:', (error as Error).stack)
    wifiData.value = null
  } finally {
    loadingWifi.value = false
    console.log('=== End WiFi Data Debug ===')
  }
}

// Load Modem data for selected device
const loadModemData = async () => {
  if (!selectedDevice.value) return
  
  loadingModem.value = true
  console.log('=== Modem Data Debug ===')
  console.log('Loading modem data for device:', selectedDevice.value.id, selectedDevice.value.serial)
  
  try {
    const response = await deviceApi.getDeviceModem(selectedDevice.value.id)
    console.log('Raw modem API response:', response)
    console.log('Response success:', response.success)
    console.log('Response data:', response.data)
    console.log('Data type:', typeof response.data)
    console.log('Data keys:', response.data ? Object.keys(response.data) : 'no data')
    
    if (response.success && response.data) {
      // Map API response fields to our expected structure
      const rawData = response.data as any
      const mappedData = {
        sim_status: rawData.sim_status || (rawData.active_slot !== null ? 'ready' : 'no_sim'),
        active_sim: rawData.active_slot || rawData.active_sim || 1,
        iccid: rawData.iccid || rawData.sim_iccid || null,
        imsi: rawData.imsi || rawData.sim_imsi || null,
        phone_number: rawData.phone_number || rawData.msisdn || null,
        operator: rawData.operator || rawData.carrier_name || null,
        signal_strength: rawData.rssi || rawData.signal_strength || null,
        network_type: rawData.network_type || rawData.net_type || null,
        ip_address: rawData.ip_address || rawData.wan_ip || null,
        data_uploaded: rawData.data_uploaded || rawData.tx_bytes || 0,
        data_downloaded: rawData.data_downloaded || rawData.rx_bytes || 0,
        connection_time: rawData.connection_time || rawData.uptime || null,
        last_updated: rawData.last_update || rawData.updated_at || rawData.last_updated || null,
        // 添加缺失的信号质量字段映射
        rssi: rawData.rssi || null,
        rsrp: rawData.rsrp || null,
        rsrq: rawData.rsrq || null,
        snr: rawData.snr !== undefined ? rawData.snr : null,
        status: rawData.status || null,
        imei: rawData.imei || null,
        apn_name: rawData.apn_name || null,
        last_update: rawData.last_update || null
      }
      
      // Always use mapped API data, even if empty
      modemData.value = mappedData
      
      console.log('Modem data set successfully:', modemData.value)
      
      // Debug both raw and mapped data
      console.log('--- Raw API Data ---')
      console.log('active_slot:', rawData.active_slot)
      console.log('operator:', rawData.operator)
      console.log('network_type:', rawData.network_type)
      console.log('rssi:', rawData.rssi)
      console.log('last_update:', rawData.last_update)
      
      console.log('--- Mapped Modem Data ---')
      console.log('sim_status:', mappedData.sim_status)
      console.log('active_sim:', mappedData.active_sim)
      console.log('operator:', mappedData.operator)
      console.log('signal_strength:', mappedData.signal_strength)
      console.log('network_type:', mappedData.network_type)
      console.log('ip_address:', mappedData.ip_address)
      console.log('data_uploaded:', mappedData.data_uploaded)
      console.log('data_downloaded:', mappedData.data_downloaded)
    } else {
      console.warn('Failed to load Modem data - API returned error:', response.message)
      console.warn('Or response.data is empty/null')
      modemData.value = null
    }
  } catch (error) {
    console.error('Exception when loading Modem data:', error)
    console.error('Error details:', (error as Error).message)
    console.error('Error stack:', (error as Error).stack)
    modemData.value = null
  } finally {
    loadingModem.value = false
    console.log('=== End Modem Data Debug ===')
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format bytes to human readable format
const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const getStatusColor = (isOnline: boolean, isActivated: boolean) => {
  if (isOnline && isActivated) return 'success'
  if (isOnline && !isActivated) return 'warning'
  return 'danger'
}

const getStatusText = (isOnline: boolean, isActivated: boolean) => {
  if (isOnline && isActivated) return 'Active'
  if (isOnline && !isActivated) return 'Online'
  return 'Offline'
}

// 获取信号质量等级的CSS类
const getSignalQualityClass = (value: number, type: string) => {
  if (value === null || value === undefined) return 'signal-unknown'
  
  switch (type) {
    case 'rssi':
      if (value >= -70) return 'signal-excellent'
      if (value >= -85) return 'signal-good'
      if (value >= -100) return 'signal-fair'
      return 'signal-poor'
    
    case 'rsrp':
      if (value >= -80) return 'signal-excellent'
      if (value >= -90) return 'signal-good'
      if (value >= -105) return 'signal-fair'
      return 'signal-poor'
    
    case 'rsrq':
      if (value >= -10) return 'signal-excellent'
      if (value >= -15) return 'signal-good'
      if (value >= -20) return 'signal-fair'
      return 'signal-poor'
    
    case 'snr':
      if (value >= 20) return 'signal-excellent'
      if (value >= 13) return 'signal-good'
      if (value >= 0) return 'signal-fair'
      return 'signal-poor'
    
    default:
      return 'signal-unknown'
  }
}

// 获取运营商完整名称
const getOperatorName = (operator: string) => {
  if (!operator) return 'Unknown'
  
  const operatorMap: Record<string, string> = {
    'CT': 'China Telecom',
    'CM': 'China Mobile', 
    'CU': 'China Unicom',
    'CHINA TELECOM': 'China Telecom',
    'CHINA MOBILE': 'China Mobile',
    'CHINA UNICOM': 'China Unicom',
  }
  
  return operatorMap[operator.toUpperCase()] || operator
}

// Trust relationship helper methods
const getOwnershipType = (device: Device) => {
  if (device.ownership?.isOwner) {
    return { type: 'owned', text: 'Owned', color: 'primary' }
  } else if (device.ownership?.isTrusted) {
    return { type: 'trusted', text: 'Trusted', color: 'info' }
  }
  return { type: 'unknown', text: 'Unknown', color: 'light' }
}

const getOwnershipTooltip = (device: Device) => {
  if (device.ownership?.isOwner) {
    return 'You own this device'
  } else if (device.ownership?.isTrusted) {
    const ownerName = device.ownership.ownerInfo?.username || 'Unknown user'
    return `This device is trusted to you by ${ownerName}`
  }
  return 'Device ownership unknown'
}

// Permission control method
const canOperateDevice = (device: Device) => {
  // Only device owners and trustees can operate devices
  return device.ownership?.isOwner || device.ownership?.isTrusted
}

// Watch for active tab changes to load data
watch(() => activeTab.value, (newTab) => {
  if (!selectedDevice.value) return
  
  if (newTab === 'wifi') {
    loadWiFiData()
  } else if (newTab === 'modem') {
    loadModemData()
  }
})

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

watch(() => filterForm.oemname, () => {
  handleDebouncedSearch()
})

watch(() => filterForm.stdname, () => {
  handleDebouncedSearch()
})

// Lifecycle
onMounted(() => {
  fetchDevices()
})

useHead({
  title: 'Device Management - EzCloud',
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
          <h3 class="title is-4 common-text-primary">{{ deviceCount }}</h3>
          <p class="subtitle is-6">Total Devices</p>
        </VCard>
      </div>
      <div class="column is-3">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-success">{{ onlineCount }}</h3>
          <p class="subtitle is-6">Online Devices</p>
        </VCard>
      </div>
      <div class="column is-3">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-info">{{ ownedCount }}</h3>
          <p class="subtitle is-6">Owned Devices</p>
        </VCard>
      </div>
      <div class="column is-3">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-warning">{{ trustedCount }}</h3>
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
          <div class="column is-2">
            <VField>
              <VLabel>Brand</VLabel>
              <VControl>
                <VInput
                  v-model="filterForm.oemname"
                  placeholder="Filter by brand"
                />
              </VControl>
            </VField>
          </div>
          <div class="column is-2">
            <VField>
              <VLabel>Model</VLabel>
              <VControl>
                <VInput
                  v-model="filterForm.stdname"
                  placeholder="Filter by model"
                />
              </VControl>
            </VField>
          </div>
        </div>
        
        <div class="field is-grouped">
          <div class="control">
            <VButton @click="handleReset">
              Reset Filters
            </VButton>
          </div>
          <div class="control">
            <VButton @click="handleRefresh" :loading="loading">
              Refresh
            </VButton>
          </div>
          <div class="control">
            <VButton color="primary" @click="bindDialogOpen = true">
              Bind Device
            </VButton>
          </div>
          <div v-if="selectedDevices.length > 0" class="control">
            <VButton color="warning" @click="batchDialogOpen = true">
              Batch Operations ({{ selectedDevices.length }})
            </VButton>
          </div>
        </div>
      </div>

      <!-- Device Table -->
      <VFlexTableWrapper
        :columns="{
          serial: { 
            label: 'Serial Number', 
            sortable: true,
            searchable: true,
            bold: true,
            grow: true
          },
          name: { 
            label: 'Device Name',
            searchable: true,
            grow: true
          },
          model: { 
            label: 'Model',
            searchable: true,
            grow: true
          },
          ownership: { 
            label: 'Ownership',
            align: 'center'
          },
          status: { 
            label: 'Status',
            searchable: true,
            align: 'center'
          },
          network: { 
            label: 'Network Info',
            grow: 'lg'
          },
          remoteAccess: { 
            label: 'Remote Access',
            align: 'center'
          },
          lastSeen: { 
            label: 'Last Seen',
            sortable: true
          },
          actions: { 
            label: 'Actions', 
            align: 'end'
          }
        }"
        :data="devices"
        @selection-change="handleSelectionChange"
      >
        <template #default="wrapperState">
          <VFlexTableToolbar>
            <template #right>
              <VField>
                <VControl>
                  <VSelect v-model="wrapperState.limit" class="is-rounded">
                    <VOption :value="10">10 per page</VOption>
                    <VOption :value="20">20 per page</VOption>
                    <VOption :value="50">50 per page</VOption>
                    <VOption :value="100">100 per page</VOption>
                  </VSelect>
                </VControl>
              </VField>
            </template>
          </VFlexTableToolbar>

          <VFlexTable rounded selectable>
            <!-- 加载状态 -->
            <template #body>
              <div v-if="loading" class="flex-list-inner">
                <div v-for="key in 5" :key="key" class="flex-table-item">
                  <VFlexTableCell :column="{ grow: true }">
                    <VPlaceload />
                  </VFlexTableCell>
                  <VFlexTableCell :column="{ grow: true }">
                    <VPlaceload />
                  </VFlexTableCell>
                  <VFlexTableCell :column="{ grow: true }">
                    <VPlaceload />
                  </VFlexTableCell>
                  <VFlexTableCell>
                    <VPlaceload width="60px" />
                  </VFlexTableCell>
                  <VFlexTableCell>
                    <VPlaceload width="60px" />
                  </VFlexTableCell>
                  <VFlexTableCell :column="{ grow: 'lg' }">
                    <VPlaceload />
                  </VFlexTableCell>
                  <VFlexTableCell>
                    <VPlaceload width="80px" />
                  </VFlexTableCell>
                  <VFlexTableCell>
                    <VPlaceload width="100px" />
                  </VFlexTableCell>
                  <VFlexTableCell :column="{ align: 'end' }">
                    <VPlaceload width="40px" />
                  </VFlexTableCell>
                </div>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="wrapperState.data?.length === 0" class="flex-list-inner">
                <VPlaceholderSection
                  title="No Devices"
                  subtitle="Please bind a device first or check search criteria"
                  class="my-6"
                />
              </div>
            </template>

            <template #body-cell="{ row: device, column }">
              <template v-if="column.key === 'serial'">
                <VTextEllipsis width="180px" class="common-item-name dark-inverted">
                  {{ device.serial }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'name'">
                <VTextEllipsis width="150px">
                  {{ device.name || 'Unnamed Device' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'model'">
                <div v-if="device.deviceModel" class="model-info">
                  <VTextEllipsis width="120px" class="has-text-weight-semibold model-brand">
                    {{ device.deviceModel.oemname }}
                  </VTextEllipsis>
                  <VTextEllipsis width="120px" class="common-text-light model-name">
                    <small>{{ device.deviceModel.stdname }}</small>
                  </VTextEllipsis>
                </div>
                <span v-else class="common-text-light">-</span>
              </template>

              <template v-if="column.key === 'ownership'">
                <VTooltip>
                  <VTag 
                    :color="getOwnershipType(device).color as any"
                    outlined
                    rounded
                    size="tiny"
                  >
                    {{ getOwnershipType(device).text }}
                  </VTag>
                  <template #content>
                    {{ getOwnershipTooltip(device) }}
                  </template>
                </VTooltip>
              </template>

              <template v-if="column.key === 'status'">
                <VTag 
                  :color="getStatusColor(device.is_online, device.is_activate)"
                  outlined
                  rounded
                >
                  {{ getStatusText(device.is_online, device.is_activate) }}
                </VTag>
              </template>

              <template v-if="column.key === 'network'">
                <div class="common-network-info">
                  <div v-if="device.wanip" class="mb-1">
                    <VTextEllipsis width="140px">
                      <small class="has-text-weight-semibold">WAN:</small> {{ device.wanip }}
                    </VTextEllipsis>
                  </div>
                  <div v-if="device.public_ip" class="mb-1">
                    <VTextEllipsis width="140px">
                      <small class="has-text-weight-semibold">Public:</small> {{ device.public_ip }}
                    </VTextEllipsis>
                  </div>
                  <div v-if="device.primary_mac">
                    <VTextEllipsis width="140px" class="common-text-light">
                      <small>{{ device.primary_mac }}</small>
                    </VTextEllipsis>
                  </div>
                </div>
              </template>

              <template v-if="column.key === 'remoteAccess'">
                <RemoteAccessButton
                  v-if="canOperateDevice(device)"
                  :device="device"
                  :show-status-indicators="false"
                  @status-change="handleRemoteAccessStatusChange"
                />
                <VTooltip v-else>
                  <VButton size="medium" disabled>
                    <iconify-icon icon="lucide:lock" class="mr-1" />
                  </VButton>
                  <template #content>
                    Only device owners and trustees can operate
                  </template>
                </VTooltip>
              </template>

              <template v-if="column.key === 'lastSeen'">
                <VTextEllipsis width="120px">
                  <span v-if="device.last_seen">{{ formatDate(device.last_seen) }}</span>
                  <span v-else class="common-text-light">Never</span>
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'actions'">
                <VDropdown spaced right icon="lucide:more-horizontal">
                  <template #content>
                    <a class="dropdown-item is-media" @click="handleViewDetails(device)">
                      <div class="icon">
                        <iconify-icon icon="lucide:eye" />
                      </div>
                      <div class="meta">
                        <span>View Details</span>
                      </div>
                    </a>
                    <!-- Trust management options (only visible to device owners) -->
                    <a 
                      v-if="device.ownership?.isOwner" 
                      class="dropdown-item is-media" 
                      @click="handleManageTrust(device)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:users" />
                      </div>
                      <div class="meta">
                        <span>Manage Trust</span>
                      </div>
                    </a>
                    <hr v-if="canOperateDevice(device)" class="dropdown-divider">
                    <a 
                      v-if="canOperateDevice(device)"
                      class="dropdown-item is-media" 
                      @click="handleReboot(device)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:refresh-cw" />
                      </div>
                      <div class="meta">
                        <span>Reboot</span>
                      </div>
                    </a>
                    <a 
                      v-if="canOperateDevice(device)"
                      class="dropdown-item is-media" 
                      @click="handleSIMSwitch(device, 1)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:sim-card" />
                      </div>
                      <div class="meta">
                        <span>Switch to Slot 1</span>
                      </div>
                    </a>
                    <a 
                      v-if="canOperateDevice(device)"
                      class="dropdown-item is-media" 
                      @click="handleSIMSwitch(device, 2)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:sim-card" />
                      </div>
                      <div class="meta">
                        <span>Switch to Slot 2</span>
                      </div>
                    </a>
                    <hr class="dropdown-divider">
                    <a 
                      v-if="isAdmin" 
                      class="dropdown-item is-media has-text-danger" 
                      @click="handleUnbind(device)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:unlink" />
                      </div>
                      <div class="meta">
                        <span>Unbind Device</span>
                      </div>
                    </a>
                  </template>
                </VDropdown>
              </template>
            </template>
          </VFlexTable>
        </template>
      </VFlexTableWrapper>

      <!-- Pagination -->
      <VFlexPagination
        v-if="pagination.total > 0 && pagination.total > (pagination.limit || 20)"
        v-model:current-page="filterForm.page"
        :item-per-page="pagination.limit || 20"
        :total-items="pagination.total"
        :max-links-displayed="7"
        no-router
        @update:current-page="handleSearch"
      />
    </VCard>

    <!-- Bind Device Modal -->
    <VModal :open="bindDialogOpen" title="Bind Device" actions="right" cancelLabel="Cancel" @close="bindDialogOpen = false">
      <template #content>
        <VField>
          <VLabel>Serial Number *</VLabel>
          <VControl>
            <VInput
              v-model="bindForm.serial"
              placeholder="Enter device serial number"
            />
          </VControl>
        </VField>
        
        <VField>
          <VLabel>Device Name</VLabel>
          <VControl>
            <VInput
              v-model="bindForm.name"
              placeholder="Enter device name (optional)"
            />
          </VControl>
        </VField>
      </template>
      
      <template #action>
        <VButton color="primary" @click="handleBindDevice">
          Bind Device
        </VButton>
      </template>
    </VModal>

    <!-- Batch Operations Modal -->
    <VModal :open="batchDialogOpen" title="Batch Operations" actions="right" cancelLabel="Cancel" @close="batchDialogOpen = false">
      <template #content>
        <VMessage color="info">
          Selected {{ selectedDevices.length }} devices for batch operation
        </VMessage>
        
        <VField>
          <VLabel>Operation</VLabel>
          <VControl>
            <VSelect v-model="batchForm.operation">
              <VOption value="">Select operation</VOption>
              <VOption value="reboot">Reboot Devices</VOption>
              <VOption value="logs">Collect Logs</VOption>
              <VOption value="sim_slot_1">Switch to SIM Slot 1</VOption>
              <VOption value="sim_slot_2">Switch to SIM Slot 2</VOption>
            </VSelect>
          </VControl>
        </VField>
      </template>
      
      <template #action>
        <VButton 
          color="primary" 
          :disabled="!batchForm.operation"
          @click="handleBatchOperation"
        >
          Execute
        </VButton>
      </template>
    </VModal>

    <!-- Device Details Modal -->
    <VModal :open="detailsDialogOpen" title="Device Details" size="large" actions="right" cancelLabel="Close" @close="detailsDialogOpen = false">
      <template #content>
        <div v-if="selectedDevice">
          <VTabs 
            :selected="activeTab"
            :tabs="[
              { label: 'Basic Info', value: 'basic' },
              { label: 'WiFi Status', value: 'wifi' },
              { label: 'Modem Status', value: 'modem' }
            ]"
            @update:selected="activeTab = $event"
          >
            <template #tab="{ activeValue }">
              <div v-if="activeValue === 'basic'">
                <div class="device-info-grid">
                  <div class="device-info-item">
                    <label>Serial Number</label>
                    <span class="device-info-value">{{ selectedDevice.serial }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>Device Name</label>
                    <span class="device-info-value">{{ selectedDevice.name || 'Unnamed Device' }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>Brand</label>
                    <span class="device-info-value">{{ selectedDevice.deviceModel?.oemname || '-' }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>Model</label>
                    <span class="device-info-value">{{ selectedDevice.deviceModel?.stdname || '-' }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>MAC Address</label>
                    <span class="device-info-value">{{ selectedDevice.primary_mac }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>WAN IP</label>
                    <span class="device-info-value">{{ selectedDevice.wanip || 'Not Available' }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>Public IP</label>
                    <span class="device-info-value">{{ selectedDevice.public_ip || 'Not Available' }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>Firmware Version</label>
                    <span class="device-info-value">{{ selectedDevice.version || 'Unknown' }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>First Connection</label>
                    <span class="device-info-value">{{ formatDate(selectedDevice.firsttime || '') }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>Last Seen</label>
                    <span class="device-info-value">{{ formatDate(selectedDevice.last_seen || '') }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>Created At</label>
                    <span class="device-info-value">{{ formatDate(selectedDevice.created_at || '') }}</span>
                  </div>
                  <div class="device-info-item">
                    <label>Status</label>
                    <div class="device-info-value">
                      <VTag 
                        :color="getStatusColor(selectedDevice.is_online, selectedDevice.is_activate)"
                        outlined
                        size="tiny"
                      >
                        {{ getStatusText(selectedDevice.is_online, selectedDevice.is_activate) }}
                      </VTag>
                    </div>
                  </div>
                </div>
              </div>
              
              <div v-else-if="activeValue === 'wifi'">
                <div v-if="loadingWifi" class="has-text-centered py-6">
                  <VLoader />
                  <p class="mt-4">Loading WiFi status...</p>
                </div>
                
                <div v-else-if="wifiData" class="wifi-status-content">
                  <div class="columns is-multiline">
                    <!-- WiFi Overview -->
                    <div class="column is-12">
                      <VCard>
                        <template #header>
                          <VFlex align-items="center" justify-content="space-between">
                            <h4 class="title is-6">WiFi Access Point Status</h4>
                            <VTag :color="wifiData.ap_enabled ? 'success' : 'danger'" size="small">
                              {{ wifiData.ap_enabled ? 'AP Enabled' : 'AP Disabled' }}
                            </VTag>
                          </VFlex>
                        </template>
                        
                        <div class="wifi-overview">
                          <div class="columns">
                            <div class="column is-3">
                              <div class="stat-item">
                                <span class="stat-value">{{ wifiData.total_radios || 0 }}</span>
                                <span class="stat-label">Total Radios</span>
                              </div>
                            </div>
                            <div class="column is-3">
                              <div class="stat-item">
                                <span class="stat-value">{{ wifiData.enabled_radios || 0 }}</span>
                                <span class="stat-label">Active Radios</span>
                              </div>
                            </div>
                            <div class="column is-3">
                              <div class="stat-item">
                                <span class="stat-value">{{ wifiData.total_clients || 0 }}</span>
                                <span class="stat-label">Connected Clients</span>
                              </div>
                            </div>
                            <div class="column is-3">
                              <div class="stat-item">
                                <span class="stat-value">{{ wifiData.bands_summary || 'N/A' }}</span>
                                <span class="stat-label">Supported Bands</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </VCard>
                    </div>
                    
                    <!-- Radio Details -->
                    <div class="column is-12">
                      <h5 class="title is-6 mb-4">Radio Configuration Details</h5>
                    </div>
                    
                    <!-- Individual Radio Cards -->
                    <div 
                      v-for="(radio, index) in wifiData.radios" 
                      :key="`radio-${index}`" 
                      class="column is-6"
                    >
                      <VCard>
                        <template #header>
                          <VFlex align-items="center" justify-content="space-between">
                            <h6 class="title is-6">{{ radio.band }} Radio #{{ index + 1 }}</h6>
                            <VTag :color="radio.enabled ? 'success' : 'danger'" size="tiny">
                              {{ radio.enabled ? 'Enabled' : 'Disabled' }}
                            </VTag>
                          </VFlex>
                        </template>
                        
                        <div class="radio-info">
                          <div class="info-item">
                            <label>Radio Name:</label>
                            <span>{{ radio.name || `radio_${radio.band}` }}</span>
                          </div>
                          <div class="info-item">
                            <label>Band:</label>
                            <span>{{ radio.band }}</span>
                          </div>
                          <div class="info-item">
                            <label>Channel:</label>
                            <span>{{ radio.channel }}</span>
                          </div>
                          <div class="info-item">
                            <label>TX Power:</label>
                            <span>{{ radio.txpower }} dBm</span>
                          </div>
                          <div class="info-item">
                            <label>Total Connected Clients:</label>
                            <span>{{ radio.connected_clients || 0 }}</span>
                          </div>
                          <div class="info-item">
                            <label>Status:</label>
                            <span>{{ radio.enabled ? 'Enabled' : 'Disabled' }}</span>
                          </div>
                        </div>
                        
                        <!-- WiFi SSIDs for this radio -->
                        <div v-if="radio.ssids && radio.ssids.length > 0" class="mt-4">
                          <h6 class="title is-7 mb-3">Network SSIDs</h6>
                          <div class="interfaces-grid">
                            <div 
                              v-for="(ssid, ssidIndex) in radio.ssids" 
                              :key="`ssid-${index}-${ssidIndex}`"
                              class="interface-card"
                            >
                              <div class="interface-header">
                                <strong>{{ ssid.ssid || 'Unnamed Network' }}</strong>
                                <VTag :color="ssid.enabled ? 'success' : 'danger'" size="tiny">
                                  {{ ssid.enabled ? 'Active' : 'Inactive' }}
                                </VTag>
                              </div>
                              
                              <div class="interface-details">
                                <div class="interface-item">
                                  <span class="interface-label">Index:</span>
                                  <span class="interface-value">{{ ssid.ssid_index }}</span>
                                </div>
                                <div class="interface-item">
                                  <span class="interface-label">Encryption:</span>
                                  <span class="interface-value">{{ ssid.encryption || 'Open' }}</span>
                                </div>
                                <div class="interface-item">
                                  <span class="interface-label">Status:</span>
                                  <span class="interface-value">{{ ssid.status || 'down' }}</span>
                                </div>
                                <div class="interface-item">
                                  <span class="interface-label">Clients:</span>
                                  <span class="interface-value">{{ ssid.connected_clients || 0 }}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div v-else class="mt-4">
                          <div class="has-text-centered py-3" style="background: var(--fade-grey-light-6); border-radius: 6px;">
                            <p class="has-text-grey-light" style="font-size: 0.85rem;">No SSIDs configured</p>
                          </div>
                        </div>
                      </VCard>
                    </div>
                    
                    <!-- No Radios Message -->
                    <div v-if="!wifiData.radios || wifiData.radios.length === 0" class="column is-12">
                      <VCard>
                        <div class="has-text-centered py-6">
                          <p class="has-text-grey">No WiFi radios configured</p>
                        </div>
                      </VCard>
                    </div>
                  </div>
                </div>
                
                <div v-else class="has-text-centered py-6">
                  <VPlaceholderSection
                    title="WiFi Status Unavailable"
                    subtitle="WiFi status information is not available for this device"
                  >
                    <template #action>
                      <VButton @click="loadWiFiData" outlined>
                        <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
                        Retry
                      </VButton>
                    </template>
                  </VPlaceholderSection>
                </div>
              </div>
              
              <div v-else-if="activeValue === 'modem'">
                <div v-if="loadingModem" class="has-text-centered py-6">
                  <VLoader />
                  <p class="mt-4">Loading Modem status...</p>
                </div>
                
                <div v-else-if="modemData" class="modem-status-content">
                  <div class="columns is-multiline">
                    <!-- Modem Basic Info -->
                    <div class="column is-12">
                      <h4 class="title is-6 mb-4">Modem Configuration</h4>
                    </div>
                    
                    <!-- SIM Card Status -->
                    <div class="column is-6">
                      <VCard>
                        <template #header>
                          <VFlex align-items="center" justify-content="space-between">
                            <h5 class="title is-6">SIM Card Status</h5>
                            <VTag :color="modemData.sim_status === 'ready' ? 'success' : 'warning'" size="tiny">
                              {{ modemData.sim_status || 'Unknown' }}
                            </VTag>
                          </VFlex>
                        </template>
                        
                        <div class="wifi-info">
                          <div class="info-item">
                            <label>Active Slot:</label>
                            <span>SIM {{ modemData.active_sim || '1' }}</span>
                          </div>
                          <div class="info-item">
                            <label>ICCID:</label>
                            <span>{{ modemData.iccid || 'Not available' }}</span>
                          </div>
                          <div class="info-item">
                            <label>IMSI:</label>
                            <span>{{ modemData.imsi || 'Not available' }}</span>
                          </div>
                          <div class="info-item">
                            <label>Phone Number:</label>
                            <span>{{ modemData.phone_number || 'Not available' }}</span>
                          </div>
                        </div>
                      </VCard>
                    </div>
                    
                    <!-- Network Info -->
                    <div class="column is-6">
                      <VCard>
                        <template #header>
                          <VFlex align-items="center" justify-content="space-between">
                            <h5 class="title is-6">Network Information</h5>
                            <VTag :color="modemData.network_type ? 'success' : 'danger'" size="tiny">
                              {{ modemData.network_type || 'Disconnected' }}
                            </VTag>
                          </VFlex>
                        </template>
                        
                        <div class="wifi-info">
                          <div class="info-item">
                            <label>Operator:</label>
                            <span>{{ modemData.operator || 'Unknown' }}</span>
                          </div>
                          <div class="info-item">
                            <label>Signal Strength:</label>
                            <span>{{ modemData.signal_strength ? `${modemData.signal_strength} dBm` : 'N/A' }}</span>
                          </div>
                          <div class="info-item">
                            <label>Network Type:</label>
                            <span>{{ modemData.network_type || 'Unknown' }}</span>
                          </div>
                          <div class="info-item">
                            <label>IP Address:</label>
                            <span>{{ modemData.ip_address || 'Not assigned' }}</span>
                          </div>
                        </div>
                      </VCard>
                    </div>
                    
                    <!-- Signal Quality Metrics -->
                    <div class="column is-12">
                      <VCard>
                        <template #header>
                          <VFlex align-items="center" justify-content="space-between">
                            <h5 class="title is-6">Signal Quality Metrics</h5>
                            <VTag :color="modemData.status === 'Connected' ? 'success' : 'warning'" size="tiny">
                              {{ modemData.status || 'Unknown' }}
                            </VTag>
                          </VFlex>
                        </template>
                        
                        <div class="columns">
                          <div class="column is-3">
                            <div class="signal-metric">
                              <div class="metric-header">
                                <span class="metric-label">RSSI (dBm)</span>
                              </div>
                              <div class="metric-value" :class="getSignalQualityClass(modemData.rssi, 'rssi')">
                                {{ modemData.rssi || 'N/A' }}
                              </div>
                            </div>
                          </div>
                          <div class="column is-3">
                            <div class="signal-metric">
                              <div class="metric-header">
                                <span class="metric-label">RSRP (dBm)</span>
                              </div>
                              <div class="metric-value" :class="getSignalQualityClass(modemData.rsrp, 'rsrp')">
                                {{ modemData.rsrp || 'N/A' }}
                              </div>
                            </div>
                          </div>
                          <div class="column is-3">
                            <div class="signal-metric">
                              <div class="metric-header">
                                <span class="metric-label">RSRQ (dB)</span>
                              </div>
                              <div class="metric-value" :class="getSignalQualityClass(modemData.rsrq, 'rsrq')">
                                {{ modemData.rsrq || 'N/A' }}
                              </div>
                            </div>
                          </div>
                          <div class="column is-3">
                            <div class="signal-metric">
                              <div class="metric-header">
                                <span class="metric-label">SNR (dB)</span>
                              </div>
                              <div class="metric-value" :class="getSignalQualityClass(modemData.snr, 'snr')">
                                {{ modemData.snr !== undefined ? modemData.snr : 'N/A' }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </VCard>
                    </div>

                    <!-- Device Information -->
                    <div class="column is-6">
                      <VCard>
                        <template #header>
                          <h5 class="title is-6">Device Information</h5>
                        </template>
                        
                        <div class="wifi-info">
                          <div class="info-item">
                            <label>IMEI:</label>
                            <span>{{ modemData.imei || 'Not available' }}</span>
                          </div>
                          <div class="info-item">
                            <label>APN Name:</label>
                            <span>{{ modemData.apn_name || 'Not configured' }}</span>
                          </div>
                          <div class="info-item">
                            <label>Last Update:</label>
                            <span>{{ formatDate(modemData.last_update || selectedDevice?.last_seen || '') }}</span>
                          </div>
                        </div>
                      </VCard>
                    </div>
                    
                    <!-- Connection Status -->
                    <div class="column is-6">
                      <VCard>
                        <template #header>
                          <h5 class="title is-6">Connection Status</h5>
                        </template>
                        
                        <div class="wifi-info">
                          <div class="info-item">
                            <label>Connection Status:</label>
                            <VTag :color="modemData.status === 'Connected' ? 'success' : 'warning'" size="small">
                              {{ modemData.status || 'Unknown' }}
                            </VTag>
                          </div>
                          <div class="info-item">
                            <label>Network Type:</label>
                            <span>{{ (modemData.network_type || '').toUpperCase() || 'Unknown' }}</span>
                          </div>
                          <div class="info-item">
                            <label>Operator:</label>
                            <span>{{ getOperatorName(modemData.operator) || 'Unknown' }}</span>
                          </div>
                        </div>
                      </VCard>
                    </div>
                    
                    <!-- Data Usage -->
                    <div class="column is-12">
                      <VCard>
                        <template #header>
                          <h5 class="title is-6">Data Usage Statistics</h5>
                        </template>
                        
                        <div class="columns">
                          <div class="column is-3">
                            <div class="stat-item">
                              <span class="stat-value">{{ modemData.data_uploaded ? formatBytes(modemData.data_uploaded) : '0 B' }}</span>
                              <span class="stat-label">Data Uploaded</span>
                            </div>
                          </div>
                          <div class="column is-3">
                            <div class="stat-item">
                              <span class="stat-value">{{ modemData.data_downloaded ? formatBytes(modemData.data_downloaded) : '0 B' }}</span>
                              <span class="stat-label">Data Downloaded</span>
                            </div>
                          </div>
                          <div class="column is-3">
                            <div class="stat-item">
                              <span class="stat-value">{{ modemData.connection_time || '0h 0m' }}</span>
                              <span class="stat-label">Connection Time</span>
                            </div>
                          </div>
                          <div class="column is-3">
                            <div class="stat-item">
                              <span class="stat-value">{{ formatDate(modemData.last_updated || selectedDevice?.last_seen || '') }}</span>
                              <span class="stat-label">Last Updated</span>
                            </div>
                          </div>
                        </div>
                      </VCard>
                    </div>
                  </div>
                </div>
                
                <div v-else class="has-text-centered py-6">
                  <VPlaceholderSection
                    title="Modem Status Unavailable"
                    subtitle="Modem status information is not available for this device"
                  >
                    <template #action>
                      <VButton @click="loadModemData" outlined>
                        <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
                        Retry
                      </VButton>
                    </template>
                  </VPlaceholderSection>
                </div>
              </div>
            </template>
          </VTabs>
        </div>
      </template>
    </VModal>

    <!-- Device Trust Manager Modal -->
    <DeviceTrustManager
      v-if="selectedDevice"
      :device="selectedDevice"
      :open="trustDialogOpen"
      @close="trustDialogOpen = false"
      @updated="handleTrustUpdated"
    />
  </div>
</template>

<style lang="scss" scoped>
.model-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  .model-brand {
    color: var(--dark-text);
    font-weight: 600;
  }

  .model-name {
    color: var(--muted-grey);
    font-size: 0.85rem;
  }
}

// Device Info Grid Styles
.device-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
}

.device-info-item {
  padding: 1rem;
  background: var(--fade-grey-light-6);
  border-radius: var(--radius);
  border: 1px solid var(--fade-grey-light-3);
  
  label {
    display: block;
    font-weight: 600;
    color: var(--muted-grey);
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .device-info-value {
    color: var(--dark-text);
    font-weight: 500;
    word-break: break-all;
    font-size: 0.95rem;
  }
}

// WiFi Status Styles
.wifi-status-content {
  .wifi-info {
    padding: 1rem;
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--fade-grey-light-3);
      
      &:last-child {
        border-bottom: none;
      }
      
      label {
        font-weight: 600;
        color: var(--dark-text);
        font-size: 0.85rem;
        min-width: 120px;
      }
      
      span {
        color: var(--muted-grey);
        font-size: 0.9rem;
      }
    }
  }
  
  .stat-item {
    text-align: center;
    padding: 1rem;
    
    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }
    
    .stat-label {
      display: block;
      font-size: 0.75rem;
      color: var(--muted-grey);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
  }
}

// Signal Quality Metrics Styles
.signal-metric {
  text-align: center;
  padding: 1rem;
  border-radius: var(--radius);
  background: var(--fade-grey-light-6);
  
  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    
    .metric-label {
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--dark-text);
    }
    
    .metric-unit {
      font-size: 0.75rem;
      color: var(--muted-grey);
      font-weight: 600;
    }
  }
  
  .metric-value {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    
    &.signal-excellent {
      color: #00b894; // Green
    }
    
    &.signal-good {
      color: #00cec9; // Teal  
    }
    
    &.signal-fair {
      color: #fdcb6e; // Yellow
    }
    
    &.signal-poor {
      color: #e17055; // Red
    }
    
    &.signal-unknown {
      color: var(--muted-grey);
    }
  }
  
  .metric-description {
    font-size: 0.75rem;
    color: var(--muted-grey);
    font-weight: 500;
  }
}

// Radio Info Styles
.radio-info {
  padding: 1rem;
  
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--fade-grey-light-3);
    
    &:last-child {
      border-bottom: none;
    }
    
    label {
      font-weight: 600;
      color: var(--dark-text);
      font-size: 0.85rem;
      min-width: 120px;
    }
    
    span {
      color: var(--muted-grey);
      font-size: 0.9rem;
    }
  }
}

// SSID Cards Styles (formerly Interface Cards)
.interfaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.interface-card {
  background: var(--fade-grey-light-8);
  border: 1px solid var(--fade-grey-light-4);
  border-radius: 6px;
  padding: 0.75rem;
  
  .interface-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    
    strong {
      color: var(--dark-text);
      font-size: 0.9rem;
      font-weight: 600;
    }
  }
  
  .interface-details {
    .interface-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.25rem 0;
      
      .interface-label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--muted-grey);
        min-width: 80px;
      }
      
      .interface-value {
        font-size: 0.85rem;
        color: var(--dark-text);
        font-weight: 500;
      }
    }
  }
}

:deep(.dark) {
  .device-info-item {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
    
    label {
      color: var(--dark-light-text);
    }
    
    .device-info-value {
      color: var(--dark-dark-text);
    }
  }
  
  .model-info {
    .model-brand {
      color: var(--dark-dark-text);
    }
    
    .model-name {
      color: var(--dark-light-text);
    }
  }
  
  .wifi-status-content {
    .info-item {
      border-bottom-color: var(--dark-sidebar-light-2);
      
      label {
        color: var(--dark-dark-text);
      }
      
      span {
        color: var(--dark-light-text);
      }
    }
  }
  
  .interface-card {
    background: var(--dark-sidebar-light-8);
    border-color: var(--dark-sidebar-light-4);
    
    .interface-header strong {
      color: var(--dark-dark-text);
    }
    
    .interface-details .interface-item {
      .interface-label {
        color: var(--dark-light-text);
      }
      
      .interface-value {
        color: var(--dark-dark-text);
      }
    }
  }
}
</style>