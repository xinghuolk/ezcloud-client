<script setup lang="ts">
import type { ModemStatus as ModemStatusType } from '/@src/api/types'
import type { VTagColor } from '/@src/components/base/VTag.vue'

interface Props {
  modemStatus?: ModemStatusType
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modemStatus: undefined,
  showDetails: false
})

// Methods
const getSignalStrength = (rssi: number | undefined): { level: string; color: VTagColor } => {
  if (!rssi) return { level: 'Unknown', color: 'light' }
  
  if (rssi >= -70) return { level: 'Excellent', color: 'success' }
  if (rssi >= -85) return { level: 'Good', color: 'primary' }
  if (rssi >= -100) return { level: 'Fair', color: 'warning' }
  return { level: 'Poor', color: 'danger' }
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (speed: number) => {
  if (speed === 0) return '0 bps'
  const k = 1000
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps']
  const i = Math.floor(Math.log(speed) / Math.log(k))
  return parseFloat((speed / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getNetworkTypeColor = (networkType: string | undefined): VTagColor => {
  if (!networkType) return 'light'
  
  switch (networkType.toLowerCase()) {
    case '5g':
    case 'nr':
      return 'success'
    case '4g':
    case 'lte':
      return 'primary'
    case '3g':
    case 'wcdma':
    case 'umts':
      return 'warning'
    case '2g':
    case 'gsm':
      return 'danger'
    default:
      return 'info'
  }
}
</script>

<template>
  <div class="modem-status">
    <div v-if="!modemStatus" class="no-data">
      <iconify-icon icon="lucide:signal" />
      <span>No modem data</span>
    </div>

    <div v-else-if="!showDetails" class="modem-summary">
      <div class="summary-row">
        <div class="network-info">
          <VTag 
            v-if="modemStatus.network_type" 
            :color="getNetworkTypeColor(modemStatus.network_type)"
            size="tiny"
          >
            {{ modemStatus.network_type }}
          </VTag>
          <span v-if="modemStatus.operator" class="operator">{{ modemStatus.operator }}</span>
        </div>
        <div v-if="modemStatus.rssi" class="signal-info">
          <iconify-icon icon="lucide:signal" />
          <span>{{ modemStatus.rssi }} dBm</span>
        </div>
      </div>
    </div>

    <div v-else class="modem-details">
      <VCard radius="smooth" class="modem-card">
        <div class="modem-header">
          <div class="modem-title">
            <iconify-icon icon="lucide:signal" />
            <span>Modem Status</span>
          </div>
          <div v-if="modemStatus.active_slot" class="active-slot">
            <VTag color="primary" size="tiny">
              Slot {{ modemStatus.active_slot }}
            </VTag>
          </div>
        </div>

        <!-- Network Information -->
        <div class="modem-section">
          <h4>Network Information</h4>
          <div class="info-grid">
            <div v-if="modemStatus.operator" class="info-item">
              <label>Operator:</label>
              <span>{{ modemStatus.operator }}</span>
            </div>
            <div v-if="modemStatus.network_type" class="info-item">
              <label>Network Type:</label>
              <VTag :color="getNetworkTypeColor(modemStatus.network_type)" size="tiny">
                {{ modemStatus.network_type }}
              </VTag>
            </div>
            <div v-if="modemStatus.apn_name" class="info-item">
              <label>APN:</label>
              <span>{{ modemStatus.apn_name }}</span>
            </div>
          </div>
        </div>

        <!-- Signal Quality -->
        <div v-if="modemStatus.rssi || modemStatus.rsrp || modemStatus.rsrq || modemStatus.snr" class="modem-section">
          <h4>Signal Quality</h4>
          <div class="signal-grid">
            <div v-if="modemStatus.rssi" class="signal-item">
              <label>RSSI:</label>
              <div class="signal-value">
                <span>{{ modemStatus.rssi }} dBm</span>
                <VTag :color="getSignalStrength(modemStatus.rssi).color" size="tiny">
                  {{ getSignalStrength(modemStatus.rssi).level }}
                </VTag>
              </div>
            </div>
            <div v-if="modemStatus.rsrp" class="signal-item">
              <label>RSRP:</label>
              <span>{{ modemStatus.rsrp }} dBm</span>
            </div>
            <div v-if="modemStatus.rsrq" class="signal-item">
              <label>RSRQ:</label>
              <span>{{ modemStatus.rsrq }} dB</span>
            </div>
            <div v-if="modemStatus.snr" class="signal-item">
              <label>SNR:</label>
              <span>{{ modemStatus.snr }} dB</span>
            </div>
          </div>
        </div>

        <!-- SIM Information -->
        <div v-if="modemStatus.iccid || modemStatus.imsi || modemStatus.phone_number" class="modem-section">
          <h4>SIM Information</h4>
          <div class="info-grid">
            <div v-if="modemStatus.iccid" class="info-item">
              <label>ICCID:</label>
              <span class="mono-text">{{ modemStatus.iccid }}</span>
            </div>
            <div v-if="modemStatus.imsi" class="info-item">
              <label>IMSI:</label>
              <span class="mono-text">{{ modemStatus.imsi }}</span>
            </div>
            <div v-if="modemStatus.phone_number" class="info-item">
              <label>Phone Number:</label>
              <span>{{ modemStatus.phone_number }}</span>
            </div>
          </div>
        </div>

        <!-- Data Usage -->
        <div class="modem-section">
          <h4>Data Usage</h4>
          <div class="data-grid">
            <div class="data-item">
              <label>RX Bytes:</label>
              <span>{{ formatBytes(modemStatus.rx_bytes) }}</span>
            </div>
            <div class="data-item">
              <label>TX Bytes:</label>
              <span>{{ formatBytes(modemStatus.tx_bytes) }}</span>
            </div>
            <div class="data-item">
              <label>RX Speed:</label>
              <span>{{ formatSpeed(modemStatus.rx_speed) }}</span>
            </div>
            <div class="data-item">
              <label>TX Speed:</label>
              <span>{{ formatSpeed(modemStatus.tx_speed) }}</span>
            </div>
          </div>
        </div>

        <div class="modem-timestamp">
          <iconify-icon icon="lucide:clock" />
          <span>Last updated: {{ new Date(modemStatus.last_update).toLocaleString() }}</span>
        </div>
      </VCard>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modem-status {
  .no-data {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--muted-grey);
    font-size: 0.9rem;

    iconify-icon {
      font-size: 1.1rem;
    }
  }

  .modem-summary {
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;

      .network-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .operator {
          font-weight: 500;
          color: var(--dark-text);
          font-size: 0.85rem;
        }
      }

      .signal-info {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.85rem;
        color: var(--muted-grey);

        iconify-icon {
          font-size: 1rem;
          color: var(--success);
        }
      }
    }
  }

  .modem-details {
    .modem-card {
      padding: 1.5rem;
    }

    .modem-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;

      .modem-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        color: var(--dark-text);
        font-size: 1.1rem;

        iconify-icon {
          font-size: 1.2rem;
          color: var(--primary);
        }
      }
    }

    .modem-section {
      margin-bottom: 1.5rem;

      &:last-of-type {
        margin-bottom: 1rem;
      }

      h4 {
        margin: 0 0 1rem 0;
        color: var(--dark-text);
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        &::before {
          content: '';
          width: 3px;
          height: 1rem;
          background: var(--primary);
          border-radius: var(--radius-small);
        }
      }

      .info-grid,
      .signal-grid,
      .data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;

        .info-item,
        .signal-item,
        .data-item {
          padding: 1rem;
          background: var(--fade-grey-light-6);
          border-radius: var(--radius);
          border: 1px solid var(--fade-grey-light-3);

          label {
            display: block;
            font-size: 0.8rem;
            color: var(--muted-grey);
            margin-bottom: 0.5rem;
            font-weight: 500;
          }

          span {
            color: var(--dark-text);
            font-weight: 500;

            &.mono-text {
              font-family: var(--font-family-monospace);
              font-size: 0.9rem;
            }
          }

          .signal-value {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
          }
        }
      }
    }

    .modem-timestamp {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--muted-grey);
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--fade-grey-light-3);

      iconify-icon {
        font-size: 1rem;
      }
    }
  }
}

.is-dark {
  .info-item,
  .signal-item,
  .data-item {
    background: var(--dark-sidebar-light-6) !important;
    border-color: var(--dark-sidebar-light-12) !important;
  }

  .modem-timestamp {
    border-color: var(--dark-sidebar-light-12) !important;
  }
}

@media only screen and (max-width: 767px) {
  .summary-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .info-grid,
  .signal-grid,
  .data-grid {
    grid-template-columns: 1fr;
  }

  .modem-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .signal-value {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>