<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import type { Device } from '/@src/api/types'
import RemoteAccessButton from '/@src/components/RemoteAccessButton.vue'
import { formatDateTime } from '/@src/utils/date-formatter'
import { useUserSession } from '/@src/stores/user-session'

const props = defineProps<{
  devices: Device[]
  loading: boolean
  pagination: {
    page: number
    limit: number
    total: number
  }
  filterLimit: number
}>()

const emit = defineEmits<{
  'selection-change': [devices: Device[]]
  'page-change': [page: number]
  'limit-change': [limit: number]
  'view-details': [device: Device]
  'manage-trust': [device: Device]
  'reboot': [device: Device]
  'unbind': [device: Device]
  'remote-access-status-change': [device: Device, status: any]
}>()

const userSession = useUserSession()

// Helper methods
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

const getOwnershipType = (device: Device) => {
  if (device.ownership?.isOwner) {
    return { type: 'owned', text: 'Owned', color: 'primary' }
  } else if (device.ownership?.isTrusted) {
    return { type: 'trusted', text: 'Trusted', color: 'info' }
  } else if (!device.ownership?.isOwner && !device.ownership?.isTrusted) {
    return { type: 'unbound', text: 'Unbound', color: 'warning' }
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

const canOperateDevice = (device: Device) => {
  return device.ownership?.isOwner || device.ownership?.isTrusted
}

// Event handlers
const handleSelectionChange = (selection: Device[]) => {
  emit('selection-change', selection)
}

const handlePageChange = (newPage: number) => {
  emit('page-change', newPage)
}

const handleLimitChange = (newLimit: number) => {
  emit('limit-change', newLimit)
}

const handleViewDetails = (device: Device) => {
  emit('view-details', device)
}

const handleManageTrust = (device: Device) => {
  emit('manage-trust', device)
}

const handleReboot = (device: Device) => {
  emit('reboot', device)
}

const handleUnbind = (device: Device) => {
  emit('unbind', device)
}

const handleRemoteAccessStatusChange = (device: Device, status: any) => {
  emit('remote-access-status-change', device, status)
}
</script>

<template>
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
      version: { 
        label: 'Version',
        sortable: true,
        searchable: true,
        align: 'center'
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
    :limit="filterLimit"
    @selection-change="handleSelectionChange"
  >
    <template #default="wrapperState">
      <VFlexTableToolbar>
        <template #right>
          <VField>
            <VControl>
              <VSelect :model-value="filterLimit" @update:model-value="handleLimitChange" class="is-rounded">
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
        <!-- Loading state -->
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
          
          <!-- Empty state -->
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
            </div>
            <span v-else class="common-text-light">-</span>
          </template>

          <template v-if="column.key === 'version'">
            <VTag 
              v-if="device.version"
              color="info"
              outlined
              rounded
              size="tiny"
              class="version-tag"
            >
              {{ device.version }}
            </VTag>
            <span v-else class="common-text-light">-</span>
          </template>

          <template v-if="column.key === 'ownership'">
            <VTag
              :color="getOwnershipType(device).color as any"
              outlined
              rounded
              size="tiny"
              v-tooltip="getOwnershipTooltip(device)"
            >
              {{ getOwnershipType(device).text }}
            </VTag>
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
            <VButton
              v-else
              size="medium"
              disabled
              v-tooltip="'Only device owners and trustees can operate'"
            >
              <iconify-icon icon="lucide:lock" class="mr-1" />
            </VButton>
          </template>

          <template v-if="column.key === 'lastSeen'">
            <div class="last-seen-info">
              <div v-if="device.last_seen" class="last-seen-content">
                <VDateTimeSplit :date-string="device.last_seen" />
              </div>
              <div v-else class="last-seen-content">
                <div class="last-seen-date common-text-light">Never</div>
              </div>
            </div>
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
                  v-if="canOperateDevice(device) && device.is_online"
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
                  v-if="canOperateDevice(device) && !device.is_online"
                  class="dropdown-item is-media is-disabled" 
                  style="cursor: not-allowed; opacity: 0.5;"
                  title="Device must be online to reboot"
                >
                  <div class="icon">
                    <iconify-icon icon="lucide:refresh-cw" />
                  </div>
                  <div class="meta">
                    <span>Reboot (Offline)</span>
                  </div>
                </a>
                <!-- TODO: [v2.1] SIM卡切换功能 - 需完成设备兼容性测试后启用 -->
                <hr class="dropdown-divider">
                <a 
                  v-if="device.ownership?.isOwner" 
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
    v-if="pagination.total > 0"
    v-model:current-page="pagination.page"
    :item-per-page="filterLimit"
    :total-items="pagination.total"
    :max-links-displayed="7"
    no-router
    @update:current-page="handlePageChange"
  />
</template>

<style lang="scss" scoped>
.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-brand {
  font-size: 0.85rem;
}

.version-tag {
  font-family: 'Fira Code Variable', monospace;
  font-size: 0.75rem;
}

.common-network-info {
  font-size: 0.85rem;
  line-height: 1.3;
}

.last-seen-info {
  .last-seen-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .last-seen-date {
    font-size: 0.85rem;
  }
}
</style>