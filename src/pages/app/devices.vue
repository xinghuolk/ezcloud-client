<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useDeviceStore } from '/@src/stores/devices'
import { useUserSession } from '/@src/stores/user-session'
import type { Device, DeviceQuery } from '/@src/api/types'
import RemoteAccessButton from '/@src/components/RemoteAccessButton.vue'
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
const selectedDevices = ref<Device[]>([])
const selectedDevice = ref<Device | null>(null)
const activeTab = ref('basic')

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

// Methods
const fetchDevices = async () => {
  loading.value = true
  try {
    await deviceStore.fetchDevices(filterForm)
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
  const details = await deviceStore.fetchDeviceDetails(device.id)
  if (details) {
    selectedDevice.value = details
    detailsDialogOpen.value = true
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
  // 远程访问状态变化处理
  console.log(`设备 ${device.serial} 远程访问状态更新:`, status)
  // 这里可以添加额外的状态处理逻辑，如通知、日志记录等
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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

// Lifecycle
onMounted(() => {
  fetchDevices()
})

useHead({
  title: 'Device Management - EzCloud',
})
</script>

<template>
  <div class="page-content-inner">
    <!-- Page Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <div>
          <h1 class="title is-3">Device Management</h1>
          <p class="subtitle is-6">Manage your 5G gateway devices</p>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="columns is-multiline mb-6">
      <div class="column is-4">
        <VCard class="has-text-centered">
          <h3 class="title is-4 text-primary">{{ deviceCount }}</h3>
          <p class="subtitle is-6">Total Devices</p>
        </VCard>
      </div>
      <div class="column is-4">
        <VCard class="has-text-centered">
          <h3 class="title is-4 text-success">{{ onlineCount }}</h3>
          <p class="subtitle is-6">Online Devices</p>
        </VCard>
      </div>
      <div class="column is-4">
        <VCard class="has-text-centered">
          <h3 class="title is-4 text-danger">{{ offlineCount }}</h3>
          <p class="subtitle is-6">Offline Devices</p>
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
            <VButton color="primary" @click="handleSearch">
              Search
            </VButton>
          </div>
          <div class="control">
            <VButton @click="handleReset">
              Reset
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
          serial: { label: 'Serial Number', searchable: true, sortable: true },
          name: { label: 'Device Name', searchable: true },
          model: { label: 'Model', searchable: true },
          status: { label: 'Status', searchable: true },
          network: { label: 'Network' },
          remoteAccess: { label: 'Remote Access' },
          lastSeen: { label: 'Last Seen', sortable: true },
          actions: { label: 'Actions', align: 'end' }
        }"
        :data="devices"
        @selection-change="handleSelectionChange"
      >
        <template #default="wrapperState">
          <VFlexTable rounded selectable>
            <template #body-cell="{ row: device, column }">
              <template v-if="column.key === 'serial'">
                <span class="item-name dark-inverted">
                  {{ device.serial }}
                </span>
              </template>

              <template v-if="column.key === 'name'">
                <span>{{ device.name || 'Unnamed Device' }}</span>
              </template>

              <template v-if="column.key === 'model'">
                <div v-if="device.deviceModel">
                  <strong>{{ device.deviceModel.oemname }}</strong><br>
                  <small class="text-light">{{ device.deviceModel.stdname }}</small>
                </div>
                <span v-else>-</span>
              </template>

              <template v-if="column.key === 'status'">
                <VTag 
                  :color="getStatusColor(device.is_online, device.is_activate)"
                  size="tiny"
                  outlined
                >
                  {{ getStatusText(device.is_online, device.is_activate) }}
                </VTag>
              </template>

              <template v-if="column.key === 'network'">
                <div class="network-info">
                  <div v-if="device.wanip">WAN: {{ device.wanip }}</div>
                  <div v-if="device.public_ip">Public: {{ device.public_ip }}</div>
                  <small v-if="device.primary_mac">{{ device.primary_mac }}</small>
                </div>
              </template>

              <template v-if="column.key === 'remoteAccess'">
                <RemoteAccessButton
                  :device="device"
                  :show-status-indicators="false"
                  @status-change="handleRemoteAccessStatusChange"
                />
              </template>

              <template v-if="column.key === 'lastSeen'">
                <span v-if="device.last_seen">{{ formatDate(device.last_seen) }}</span>
                <span v-else>Never</span>
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
                    <a class="dropdown-item is-media" @click="handleReboot(device)">
                      <div class="icon">
                        <iconify-icon icon="lucide:refresh-cw" />
                      </div>
                      <div class="meta">
                        <span>Reboot</span>
                      </div>
                    </a>
                    <a class="dropdown-item is-media" @click="handleSIMSwitch(device, 1)">
                      <div class="icon">
                        <iconify-icon icon="lucide:sim-card" />
                      </div>
                      <div class="meta">
                        <span>Switch to Slot 1</span>
                      </div>
                    </a>
                    <a class="dropdown-item is-media" @click="handleSIMSwitch(device, 2)">
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
    <VModal :open="bindDialogOpen" title="Bind Device" @close="bindDialogOpen = false">
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
        <VButton @click="bindDialogOpen = false">Cancel</VButton>
        <VButton color="primary" @click="handleBindDevice">
          Bind Device
        </VButton>
      </template>
    </VModal>

    <!-- Batch Operations Modal -->
    <VModal :open="batchDialogOpen" title="Batch Operations" @close="batchDialogOpen = false">
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
        <VButton @click="batchDialogOpen = false">Cancel</VButton>
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
    <VModal :open="detailsDialogOpen" title="Device Details" size="large" @close="detailsDialogOpen = false">
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
                <div class="columns is-multiline">
                  <div class="column is-6">
                    <VField>
                      <VLabel>Serial Number</VLabel>
                      <VControl>
                        <VInput :value="selectedDevice.serial" readonly />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-6">
                    <VField>
                      <VLabel>Device Name</VLabel>
                      <VControl>
                        <VInput :value="selectedDevice.name || 'Unnamed Device'" readonly />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-6">
                    <VField>
                      <VLabel>Brand</VLabel>
                      <VControl>
                        <VInput :value="selectedDevice.deviceModel?.oemname || '-'" readonly />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-6">
                    <VField>
                      <VLabel>Model</VLabel>
                      <VControl>
                        <VInput :value="selectedDevice.deviceModel?.stdname || '-'" readonly />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-6">
                    <VField>
                      <VLabel>MAC Address</VLabel>
                      <VControl>
                        <VInput :value="selectedDevice.primary_mac" readonly />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-6">
                    <VField>
                      <VLabel>Status</VLabel>
                      <VControl>
                        <VTag 
                          :color="getStatusColor(selectedDevice.is_online, selectedDevice.is_activate)"
                          outlined
                        >
                          {{ getStatusText(selectedDevice.is_online, selectedDevice.is_activate) }}
                        </VTag>
                      </VControl>
                    </VField>
                  </div>
                </div>
              </div>
              
              <div v-else-if="activeValue === 'wifi'">
                <VPlaceholderSection
                  title="WiFi Status"
                  subtitle="WiFi status information will be displayed here"
                />
              </div>
              
              <div v-else-if="activeValue === 'modem'">
                <VPlaceholderSection
                  title="Modem Status"
                  subtitle="Modem status information will be displayed here"
                />
              </div>
            </template>
          </VTabs>
        </div>
      </template>
      
      <template #action>
        <VButton @click="detailsDialogOpen = false">Close</VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
.page-content-inner {
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    > div:first-child {
      .title {
        color: var(--dark-text);
        margin-bottom: 0.5rem;
        line-height: 1.2;
      }

      .subtitle {
        color: var(--muted-grey);
        margin-top: 0;
        line-height: 1.4;
      }
    }
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
  }
}

.network-info {
  font-size: 0.8rem;
  line-height: 1.3;
  
  div {
    margin-bottom: 0.2rem;
  }
  
  small {
    color: var(--muted-grey);
  }
}

.text-primary {
  color: var(--primary) !important;
}

.text-success {
  color: var(--success) !important;
}

.text-danger {
  color: var(--danger) !important;
}

.text-light {
  color: var(--muted-grey);
}

:deep(.flex-table-item) {
  padding: 1rem 0.75rem;
}

:deep(.dropdown-item) {
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>