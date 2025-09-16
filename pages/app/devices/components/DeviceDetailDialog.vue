<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue'
import type { Device } from '/@src/api/types'
import { deviceApi } from '/@src/api'
import { formatDateTime } from '/@src/utils/date-formatter'

const props = defineProps<{
  open: boolean
  device: Device | null
}>()

const emit = defineEmits<{
  'close': []
}>()

// State
const activeTab = ref('basic')
const wifiData = ref<any>(null)
const modemData = ref<any>(null)
const loadingWifi = ref(false)
const loadingModem = ref(false)

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

// Load WiFi data for selected device
const loadWiFiData = async () => {
  if (!props.device) return
  
  loadingWifi.value = true
  
  try {
    const response = await deviceApi.getDeviceWiFiStatus(props.device.id)
    
    if (response.success && response.data) {
      const rawData = response.data as any
      
      if (rawData && rawData.radios) {
        const transformedData = {
          ...rawData,
          total_radios: rawData.radios.length,
          enabled_radios: rawData.radios.filter((r: any) => r.enabled).length,
          total_clients: rawData.radios.reduce((sum: number, r: any) => sum + (r.connected_clients || 0), 0),
          bands_summary: [...new Set(rawData.radios.map((r: any) => r.band))].join(', ')
        }
        
        wifiData.value = transformedData
      } else {
        wifiData.value = { radios: [], ap_enabled: false }
      }
    } else {
      wifiData.value = null
    }
  } catch (error) {
    console.error('Failed to load WiFi data:', error)
    wifiData.value = null
  } finally {
    loadingWifi.value = false
  }
}

// Load Modem data for selected device
const loadModemData = async () => {
  if (!props.device) return
  
  loadingModem.value = true
  
  try {
    const response = await deviceApi.getDeviceModemStatus(props.device.id)
    
    if (response.success && response.data) {
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
        rssi: rawData.rssi || null,
        rsrp: rawData.rsrp || null,
        rsrq: rawData.rsrq || null,
        snr: rawData.snr !== undefined ? rawData.snr : null,
        status: rawData.status || null,
        imei: rawData.imei || null,
        apn_name: rawData.apn_name || null,
        last_update: rawData.last_update || null
      }
      
      modemData.value = mappedData
    } else {
      modemData.value = null
    }
  } catch (error) {
    console.error('Failed to load Modem data:', error)
    modemData.value = null
  } finally {
    loadingModem.value = false
  }
}

// Watch for active tab changes to load data
watch(() => activeTab.value, (newTab) => {
  if (!props.device) return
  
  if (newTab === 'wifi') {
    loadWiFiData()
  } else if (newTab === 'modem') {
    loadModemData()
  }
})

// Watch for dialog open to reset data
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    activeTab.value = 'basic'
    wifiData.value = null
    modemData.value = null
  }
})

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <VModal 
    :open="open" 
    title="Device Details" 
    size="large" 
    actions="right" 
    cancelLabel="Close" 
    @close="handleClose"
  >
    <template #content>
      <div v-if="device">
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
                  <span class="device-info-value">{{ device.serial }}</span>
                </div>
                <div class="device-info-item">
                  <label>Device Name</label>
                  <span class="device-info-value">{{ device.name || 'Unnamed Device' }}</span>
                </div>
                <div class="device-info-item">
                  <label>Model</label>
                  <span class="device-info-value">{{ device.deviceModel?.oemname || '-' }}</span>
                </div>
                <div class="device-info-item">
                  <label>MAC Address</label>
                  <span class="device-info-value">{{ device.primary_mac }}</span>
                </div>
                <div class="device-info-item">
                  <label>WAN IP</label>
                  <span class="device-info-value">{{ device.wanip || 'Not Available' }}</span>
                </div>
                <div class="device-info-item">
                  <label>Public IP</label>
                  <span class="device-info-value">{{ device.public_ip || 'Not Available' }}</span>
                </div>
                <div class="device-info-item">
                  <label>Firmware Version</label>
                  <span class="device-info-value">{{ device.version || 'Unknown' }}</span>
                </div>
                <div class="device-info-item">
                  <label>First Connection</label>
                  <VDateTimeSplit v-if="device.firsttime" :date-string="device.firsttime" class="device-info-value" />
                  <span v-else class="device-info-value common-text-light">Never</span>
                </div>
                <div class="device-info-item">
                  <label>Last Seen</label>
                  <VDateTimeSplit v-if="device.last_seen" :date-string="device.last_seen" class="device-info-value" />
                  <span v-else class="device-info-value common-text-light">Never</span>
                </div>
                <div class="device-info-item">
                  <label>Created At</label>
                  <VDateTimeSplit v-if="device.created_at" :date-string="device.created_at" class="device-info-value" />
                  <span v-else class="device-info-value common-text-light">Never</span>
                </div>
                <div class="device-info-item">
                  <label>Status</label>
                  <div class="device-info-value">
                    <VTag 
                      :color="getStatusColor(device.is_online, device.is_activate)"
                      outlined
                      size="tiny"
                    >
                      {{ getStatusText(device.is_online, device.is_activate) }}
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
                          <VTag :color="wifiData.ap_enabled ? 'success' : 'danger'" size="tiny">
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
                  
                  <!-- SIM Card Information -->
                  <div class="column is-6">
                    <VCard>
                      <template #header>
                        <VFlex align-items="center" justify-content="space-between">
                          <h5 class="title is-6">SIM Card Information</h5>
                          <VTag :color="modemData.sim_status === 'ready' ? 'success' : 'warning'" size="tiny">
                            {{ modemData.sim_status || 'Unknown' }}
                          </VTag>
                        </VFlex>
                      </template>
                      
                      <div class="radio-info">
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
                      </div>
                    </VCard>
                  </div>
                  
                  <!-- Network Information -->
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
                      
                      <div class="radio-info">
                        <div class="info-item">
                          <label>Phone Number:</label>
                          <span>{{ modemData.phone_number || 'Not available' }}</span>
                        </div>
                        <div class="info-item">
                          <label>Operator:</label>
                          <span>{{ getOperatorName(modemData.operator) || 'Unknown' }}</span>
                        </div>
                        <div class="info-item">
                          <label>Network Type:</label>
                          <span>{{ (modemData.network_type || '').toUpperCase() || 'Unknown' }}</span>
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
                              <span class="metric-label">SNR (dB)</span>
                            </div>
                            <div class="metric-value" :class="getSignalQualityClass(modemData.snr, 'snr')">
                              {{ modemData.snr !== undefined ? modemData.snr : 'N/A' }}
                            </div>
                          </div>
                        </div>
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
</template>

<style lang="scss" scoped>
.device-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
  
  .device-info-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--light-text);
    }
    
    .device-info-value {
      font-size: 0.95rem;
      color: var(--dark-text);
    }
  }
}

.wifi-overview {
  .stat-item {
    text-align: center;
    padding: 1rem;
    
    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }
    
    .stat-label {
      font-size: 0.85rem;
      color: var(--light-text);
    }
  }
}

.radio-info, .modem-info {
  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--fade-grey-light-3);
    
    &:last-child {
      border-bottom: none;
    }
    
    label {
      font-weight: 600;
      color: var(--light-text);
    }
    
    span {
      color: var(--dark-text);
    }
  }
}

.interfaces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  
  .interface-card {
    border: 1px solid var(--fade-grey-light-3);
    border-radius: 8px;
    padding: 0.75rem;
    
    .interface-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--fade-grey-light-3);
    }
    
    .interface-details {
      .interface-item {
        display: flex;
        justify-content: space-between;
        padding: 0.25rem 0;
        font-size: 0.85rem;
        
        .interface-label {
          color: var(--light-text);
        }
        
        .interface-value {
          color: var(--dark-text);
          font-weight: 500;
        }
      }
    }
  }
}

.signal-metric {
  text-align: center;
  padding: 1rem;
  background: var(--fade-grey-light-2);
  border-radius: 8px;
  
  .metric-header {
    margin-bottom: 0.5rem;
    
    .metric-label {
      font-size: 0.85rem;
      color: var(--light-text);
      font-weight: 600;
    }
  }
  
  .metric-value {
    font-size: 1.25rem;
    font-weight: bold;
    
    &.signal-excellent {
      color: var(--success);
    }
    
    &.signal-good {
      color: var(--info);
    }
    
    &.signal-fair {
      color: var(--warning);
    }
    
    &.signal-poor {
      color: var(--danger);
    }
    
    &.signal-unknown {
      color: var(--light-text);
    }
  }
}
</style>