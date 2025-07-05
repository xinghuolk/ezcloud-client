<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '/@src/stores/devices'
import { useUserSession } from '/@src/stores/user-session'
import { Notyf } from 'notyf'
import type { Device, DeviceQuery } from '/@src/api/types'
import RemoteAccessButton from '/@src/components/RemoteAccessButton.vue'

definePage({
  meta: {
    requiresAuth: true
  }
})

const router = useRouter()
const deviceStore = useDeviceStore()
const userSession = useUserSession()
const notyf = new Notyf()

// State
const loading = ref(false)
const bindLoading = ref(false)
const batchLoading = ref(false)
const selectedDevices = ref<Device[]>([])
const selectedDevice = ref<Device | null>(null)

// Dialog controls
const bindDialogVisible = ref(false)
const detailsDialogVisible = ref(false)
const showBatchOperationDialog = ref(false)
const activeTab = ref('basic')

// Filter form
const filterForm = reactive<DeviceQuery>({
  page: 1,
  limit: 20,
  search: '',
  is_online: undefined,
  is_activate: undefined,
  oemname: '',
  stdname: ''
})

// Bind form
const bindForm = reactive({
  serial: '',
  name: ''
})

// Batch operation form
const batchForm = reactive({
  operation: ''
})

// Validation errors
const bindErrors = ref({
  serial: ''
})

// Computed
const isAdmin = computed(() => userSession.isAdmin)
const deviceList = computed(() => deviceStore.devices)
const pagination = computed(() => deviceStore.pagination)

// Methods
const validateBindForm = () => {
  bindErrors.value = { serial: '' }
  let isValid = true

  if (!bindForm.serial) {
    bindErrors.value.serial = 'Please enter serial number'
    isValid = false
  } else if (bindForm.serial.length < 3 || bindForm.serial.length > 100) {
    bindErrors.value.serial = 'Serial number length should be 3-100 characters'
    isValid = false
  }

  return isValid
}

const fetchDevices = async () => {
  loading.value = true
  try {
    await deviceStore.fetchDevices({
      page: filterForm.page,
      limit: filterForm.limit,
      search: filterForm.search || undefined,
      is_online: filterForm.is_online,
      is_activate: filterForm.is_activate,
      oemname: filterForm.oemname || undefined,
      stdname: filterForm.stdname || undefined
    })
  } catch (error) {
    console.error('Error fetching devices:', error)
    notyf.error('Failed to fetch devices')
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
  try {
    const deviceDetails = await deviceStore.fetchDeviceDetails(device.id)
    if (deviceDetails) {
      selectedDevice.value = deviceDetails
      detailsDialogVisible.value = true
    }
  } catch (error) {
    console.error('Error fetching device details:', error)
    notyf.error('Failed to fetch device details')
  }
}

const handleBindDevice = async () => {
  if (!validateBindForm()) {
    return
  }

  bindLoading.value = true
  try {
    const success = await deviceStore.bindDevice(bindForm.serial)
    
    if (success) {
      notyf.success('Device bound successfully')
      bindDialogVisible.value = false
      resetBindForm()
      fetchDevices()
    }
  } catch (error) {
    console.error('Error binding device:', error)
  } finally {
    bindLoading.value = false
  }
}

const handleUnbind = async (device: Device) => {
  try {
    const success = await deviceStore.unbindDevice(device.id)
    if (success) {
      notyf.success('Device unbound successfully')
      fetchDevices()
    }
  } catch (error) {
    console.error('Error unbinding device:', error)
  }
}

const handleBatchOperation = async () => {
  if (!batchForm.operation || selectedDevices.value.length === 0) return

  batchLoading.value = true
  try {
    let operationType = batchForm.operation
    let params = {}

    if (batchForm.operation === 'sim_slot_1') {
      operationType = 'sim_switch'
      params = { slot: 1 }
    } else if (batchForm.operation === 'sim_slot_2') {
      operationType = 'sim_switch'
      params = { slot: 2 }
    }

    const success = await deviceStore.batchOperation(
      selectedDevices.value.map((d: Device) => d.id),
      operationType as any,
      params
    )

    if (success) {
      notyf.success('Batch operation initiated successfully')
      showBatchOperationDialog.value = false
      batchForm.operation = ''
      selectedDevices.value = []
    }
  } catch (error) {
    console.error('Error executing batch operation:', error)
  } finally {
    batchLoading.value = false
  }
}

const handleOperationSuccess = (message: string) => {
  notyf.success(message)
  fetchDevices()
}

const resetBindForm = () => {
  Object.assign(bindForm, {
    serial: '',
    name: ''
  })
  bindErrors.value = { serial: '' }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const onPageChange = (page: number) => {
  filterForm.page = page
  fetchDevices()
}

const onPageSizeChange = (size: number) => {
  filterForm.limit = size
  filterForm.page = 1
  fetchDevices()
}

// Lifecycle
onMounted(() => {
  fetchDevices()
})

useHead({
  title: 'Device Management - EzCloud'
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <h1 class="title is-3">Device Management</h1>
        <div class="header-actions">
          <VButton 
            color="primary" 
            raised
            @click="bindDialogVisible = true"
          >
            <iconify-icon icon="lucide:plus" class="mr-2" />
            Bind Device
          </VButton>
          <VButton 
            @click="handleRefresh"
            :loading="loading"
          >
            <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
            Refresh
          </VButton>
          <VButton 
            v-if="selectedDevices.length > 0"
            color="warning"
            @click="showBatchOperationDialog = true"
          >
            <iconify-icon icon="lucide:settings" class="mr-2" />
            Batch Operations ({{ selectedDevices.length }})
          </VButton>
        </div>
      </div>
    </div>

    <!-- Filter Section -->
    <VCard radius="smooth" class="mb-6">
      <h3 class="title is-6 mb-4">Search & Filter</h3>
      <div class="common-filter-form">
        <div class="columns is-multiline">
          <div class="column is-3">
            <VField>
              <VLabel>Search</VLabel>
              <VControl>
                <VInput
                  v-model="filterForm.search"
                  placeholder="Search by serial, MAC, name or IP"
                  @keyup.enter="handleSearch"
                />
                <iconify-icon icon="lucide:search" class="form-icon" />
              </VControl>
            </VField>
          </div>
          
          <div class="column is-2">
            <VField>
              <VLabel>Online Status</VLabel>
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
          
          <div class="column is-1">
            <VField>
              <VLabel>&nbsp;</VLabel>
              <VControl>
                <VButton color="primary" @click="handleSearch">Search</VButton>
              </VControl>
            </VField>
          </div>
        </div>
        
        <div class="buttons">
          <VButton @click="handleReset">Reset Filters</VButton>
        </div>
      </div>
    </VCard>

    <!-- Device Table -->
    <VCard radius="smooth">
      <VFlexTableWrapper
        :columns="[
          { key: 'serial', label: 'Serial Number', width: '120px' },
          { key: 'name', label: 'Device Name', width: '150px' },
          { key: 'model', label: 'Model', width: '200px' },
          { key: 'status', label: 'Status', width: '120px' },
          { key: 'network', label: 'Network', width: '160px' },
          { key: 'last_seen', label: 'Last Seen', width: '140px' },
          { key: 'actions', label: 'Actions', width: '120px' }
        ]"
        :data="deviceList"
        :loading="loading"
        selectable
        @selection-change="handleSelectionChange"
      >
        <template #default="{ row: device }">
          <VFlexTableCell>
            <span class="device-serial">{{ device.serial }}</span>
          </VFlexTableCell>
          
          <VFlexTableCell>
            <span>{{ device.name || 'Unnamed Device' }}</span>
          </VFlexTableCell>
          
          <VFlexTableCell>
            <div v-if="device.deviceModel" class="model-info">
              <strong>{{ device.deviceModel.oemname }}</strong>
              <br>
              <small class="model-stdname">{{ device.deviceModel.stdname }}</small>
            </div>
            <span v-else>-</span>
          </VFlexTableCell>
          
          <VFlexTableCell>
            <div class="status-indicators">
              <VTag 
                :color="device.is_online ? 'success' : 'danger'"
                outlined
                size="small"
              >
                {{ device.is_online ? 'Online' : 'Offline' }}
              </VTag>
              <VTag 
                :color="device.is_activate ? 'success' : 'light'"
                outlined
                size="small"
              >
                {{ device.is_activate ? 'Activated' : 'Not Activated' }}
              </VTag>
            </div>
          </VFlexTableCell>
          
          <VFlexTableCell>
            <div class="network-info">
              <div v-if="device.wanip">WAN: {{ device.wanip }}</div>
              <div v-if="device.public_ip">Public: {{ device.public_ip }}</div>
              <div v-if="device.primary_mac">MAC: {{ device.primary_mac }}</div>
            </div>
          </VFlexTableCell>
          
          <VFlexTableCell>
            <span>{{ formatDate(device.last_seen) }}</span>
          </VFlexTableCell>
          
          <VFlexTableCell>
            <VDropdown class="is-right">
              <template #button>
                <VButton size="small" outlined>
                  <iconify-icon icon="lucide:more-horizontal" />
                </VButton>
              </template>
              
              <template #content>
                <a 
                  class="dropdown-item"
                  @click="handleViewDetails(device)"
                >
                  <iconify-icon icon="lucide:eye" class="mr-2" />
                  View Details
                </a>
                <a 
                  class="dropdown-item"
                  @click="router.push(`/app/devices/${device.id}`)"
                >
                  <iconify-icon icon="lucide:edit" class="mr-2" />
                  Edit
                </a>
                <a 
                  class="dropdown-item"
                  @click="handleUnbind(device)"
                >
                  <iconify-icon icon="lucide:unlink" class="mr-2" />
                  Unbind
                </a>
              </template>
            </VDropdown>
          </VFlexTableCell>
        </template>
      </VFlexTableWrapper>

      <!-- Pagination -->
      <VFlexPagination
        v-if="pagination.total > 0"
        v-model:current-page="filterForm.page"
        :item-per-page="pagination.limit"
        :total-items="pagination.total"
        :max-links-displayed="5"
        @update:current-page="onPageChange"
      />
    </VCard>

    <!-- Bind Device Modal -->
    <VModal
      :open="bindDialogVisible"
      title="Bind Device"
      size="small"
      actions="right"
      @close="bindDialogVisible = false"
    >
      <template #content>
        <form @submit.prevent="handleBindDevice">
          <VField>
            <VLabel>Serial Number *</VLabel>
            <VControl>
              <VInput
                v-model="bindForm.serial"
                placeholder="Enter device serial number"
                :class="{ 'is-danger': bindErrors.serial }"
              />
              <p v-if="bindErrors.serial" class="help is-danger">
                {{ bindErrors.serial }}
              </p>
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
        </form>
      </template>
      
      <template #action>
        <VButton @click="bindDialogVisible = false">Cancel</VButton>
        <VButton 
          color="primary" 
          :loading="bindLoading"
          @click="handleBindDevice"
        >
          Bind Device
        </VButton>
      </template>
    </VModal>

    <!-- Batch Operation Modal -->
    <VModal
      :open="showBatchOperationDialog"
      title="Batch Operations"
      size="small"
      actions="right"
      @close="showBatchOperationDialog = false"
    >
      <template #content>
        <VMessage color="info" class="mb-4">
          Selected {{ selectedDevices.length }} devices for batch operation
        </VMessage>
        
        <VField>
          <VLabel>Operation</VLabel>
          <VControl>
            <VSelect v-model="batchForm.operation" placeholder="Select operation">
              <VOption value="reboot">Reboot Devices</VOption>
              <VOption value="logs">Collect Logs</VOption>
              <VOption value="sim_slot_1">Switch to Slot 1</VOption>
              <VOption value="sim_slot_2">Switch to Slot 2</VOption>
            </VSelect>
          </VControl>
        </VField>
      </template>
      
      <template #action>
        <VButton @click="showBatchOperationDialog = false">Cancel</VButton>
        <VButton 
          color="primary" 
          :loading="batchLoading"
          :disabled="!batchForm.operation"
          @click="handleBatchOperation"
        >
          Execute
        </VButton>
      </template>
    </VModal>

    <!-- Device Details Modal -->
    <VModal
      :open="detailsDialogVisible"
      title="Device Details"
      size="big"
      actions="right"
      @close="detailsDialogVisible = false"
    >
      <template #content>
        <div v-if="selectedDevice" class="device-details">
          <VTabs v-model="activeTab">
            <div class="tabs is-boxed">
              <ul>
                <li :class="{ 'is-active': activeTab === 'basic' }">
                  <a @click="activeTab = 'basic'">Basic Info</a>
                </li>
                <li :class="{ 'is-active': activeTab === 'network' }">
                  <a @click="activeTab = 'network'">Network</a>
                </li>
                <li :class="{ 'is-active': activeTab === 'status' }">
                  <a @click="activeTab = 'status'">Status</a>
                </li>
              </ul>
            </div>
            
            <div class="tab-content">
              <div v-show="activeTab === 'basic'" class="tab-pane">
                <div class="device-info-grid">
                  <div class="info-item">
                    <label>Serial Number</label>
                    <span>{{ selectedDevice.serial }}</span>
                  </div>
                  <div class="info-item">
                    <label>Device Name</label>
                    <span>{{ selectedDevice.name || 'Unnamed Device' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Brand</label>
                    <span>{{ selectedDevice.deviceModel?.oemname || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Model</label>
                    <span>{{ selectedDevice.deviceModel?.stdname || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Device Type</label>
                    <span>{{ selectedDevice.deviceModel?.devtype || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <label>MAC Address</label>
                    <span>{{ selectedDevice.primary_mac }}</span>
                  </div>
                  <div class="info-item">
                    <label>Online Status</label>
                    <VTag :color="selectedDevice.is_online ? 'success' : 'danger'">
                      {{ selectedDevice.is_online ? 'Online' : 'Offline' }}
                    </VTag>
                  </div>
                  <div class="info-item">
                    <label>Activation Status</label>
                    <VTag :color="selectedDevice.is_activate ? 'success' : 'light'">
                      {{ selectedDevice.is_activate ? 'Activated' : 'Not Activated' }}
                    </VTag>
                  </div>
                  <div class="info-item">
                    <label>Version</label>
                    <span>{{ selectedDevice.version || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <label>First Connect</label>
                    <span>{{ formatDate(selectedDevice.firsttime) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Last Seen</label>
                    <span>{{ formatDate(selectedDevice.last_seen) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Created At</label>
                    <span>{{ formatDate(selectedDevice.created_at) }}</span>
                  </div>
                </div>
              </div>
              
              <div v-show="activeTab === 'network'" class="tab-pane">
                <div class="device-info-grid">
                  <div class="info-item">
                    <label>WAN IP</label>
                    <span>{{ selectedDevice.wanip || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Public IP</label>
                    <span>{{ selectedDevice.public_ip || '-' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Primary MAC</label>
                    <span>{{ selectedDevice.primary_mac }}</span>
                  </div>
                </div>
              </div>
              
              <div v-show="activeTab === 'status'" class="tab-pane">
                <div class="status-section">
                  <h4>WiFi Status</h4>
                  <div v-if="selectedDevice.wifiStatus && selectedDevice.wifiStatus.length > 0">
                    <div 
                      v-for="wifi in selectedDevice.wifiStatus" 
                      :key="wifi.interface"
                      class="wifi-item"
                    >
                      <div class="wifi-header">
                        <span class="wifi-interface">{{ wifi.interface }}</span>
                        <VTag :color="wifi.status === 'up' ? 'success' : 'danger'" size="small">
                          {{ wifi.status }}
                        </VTag>
                      </div>
                      <div class="wifi-details">
                        <span v-if="wifi.ssid">SSID: {{ wifi.ssid }}</span>
                        <span v-if="wifi.channel">Channel: {{ wifi.channel }}</span>
                        <span>Clients: {{ wifi.connected_clients }}</span>
                      </div>
                    </div>
                  </div>
                  <p v-else>No WiFi status data available</p>
                  
                  <h4>Modem Status</h4>
                  <div v-if="selectedDevice.modemStatus">
                    <div class="modem-info">
                      <div v-if="selectedDevice.modemStatus.operator">
                        Operator: {{ selectedDevice.modemStatus.operator }}
                      </div>
                      <div v-if="selectedDevice.modemStatus.network_type">
                        Network: {{ selectedDevice.modemStatus.network_type }}
                      </div>
                      <div v-if="selectedDevice.modemStatus.rssi">
                        Signal: {{ selectedDevice.modemStatus.rssi }} dBm
                      </div>
                    </div>
                  </div>
                  <p v-else>No modem status data available</p>
                </div>
              </div>
            </div>
          </VTabs>
        </div>
      </template>
      
      <template #action>
        <VButton @click="detailsDialogVisible = false">Close</VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>

.device-details {
  .tab-content {
    padding: 1.5rem 0;
  }

  .status-section {
    h4 {
      color: var(--dark-text);
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .wifi-item {
      padding: 1rem;
      background: var(--fade-grey-light-6);
      border-radius: var(--radius);
      border: 1px solid var(--fade-grey-light-3);
      margin-bottom: 1rem;

      .wifi-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;

        .wifi-interface {
          font-weight: 600;
          color: var(--dark-text);
        }
      }

      .wifi-details {
        display: flex;
        gap: 1rem;
        font-size: 0.85rem;
        color: var(--muted-grey);

        span {
          flex: 1;
        }
      }
    }

    .modem-info {
      padding: 1rem;
      background: var(--fade-grey-light-6);
      border-radius: var(--radius);
      border: 1px solid var(--fade-grey-light-3);

      div {
        margin-bottom: 0.5rem;
        color: var(--dark-text);

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

.is-dark {
  .wifi-item,
  .modem-info {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
  }
}

@media only screen and (max-width: 767px) {
  .wifi-details {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>