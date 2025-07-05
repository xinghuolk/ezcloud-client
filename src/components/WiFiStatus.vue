<script setup lang="ts">
import type { WiFiStatus as WiFiStatusType } from '/@src/api/types'

interface Props {
  wifiStatus?: WiFiStatusType[]
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  wifiStatus: () => [],
  showDetails: false
})

// Methods
const getStatusColor = (status: string) => {
  switch (status) {
    case 'up':
      return 'success'
    case 'down':
      return 'danger'
    case 'error':
      return 'warning'
    default:
      return 'light'
  }
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFrequencyBand = (frequency: string | undefined) => {
  if (!frequency) return 'Unknown'
  if (frequency.includes('2.4')) return '2.4GHz'
  if (frequency.includes('5')) return '5GHz'
  if (frequency.includes('6')) return '6GHz'
  return frequency
}
</script>

<template>
  <div class="wifi-status">
    <div v-if="!wifiStatus || wifiStatus.length === 0" class="no-data">
      <iconify-icon icon="lucide:wifi-off" />
      <span>No WiFi data</span>
    </div>

    <div v-else-if="!showDetails" class="wifi-summary">
      <div 
        v-for="wifi in wifiStatus.slice(0, 2)" 
        :key="wifi.interface"
        class="wifi-item-summary"
      >
        <div class="wifi-interface">
          <iconify-icon icon="lucide:wifi" />
          <span>{{ getFrequencyBand(wifi.frequency) }}</span>
        </div>
        <VTag :color="getStatusColor(wifi.status)" size="tiny">
          {{ wifi.status }}
        </VTag>
        <span class="client-count">{{ wifi.connected_clients }} clients</span>
      </div>
      <div v-if="wifiStatus.length > 2" class="more-indicator">
        +{{ wifiStatus.length - 2 }} more
      </div>
    </div>

    <div v-else class="wifi-details">
      <div 
        v-for="wifi in wifiStatus" 
        :key="wifi.interface"
        class="wifi-item-detail"
      >
        <VCard radius="smooth" class="wifi-card">
          <div class="wifi-header">
            <div class="wifi-title">
              <iconify-icon icon="lucide:wifi" />
              <span class="interface-name">{{ wifi.interface }}</span>
              <VTag :color="getStatusColor(wifi.status)" size="tiny">
                {{ wifi.status }}
              </VTag>
            </div>
            <div class="wifi-frequency">
              {{ getFrequencyBand(wifi.frequency) }}
            </div>
          </div>

          <div class="wifi-info">
            <div v-if="wifi.ssid" class="info-row">
              <label>SSID:</label>
              <span>{{ wifi.ssid }}</span>
            </div>
            <div v-if="wifi.channel" class="info-row">
              <label>Channel:</label>
              <span>{{ wifi.channel }}</span>
            </div>
            <div v-if="wifi.tx_power" class="info-row">
              <label>TX Power:</label>
              <span>{{ wifi.tx_power }} dBm</span>
            </div>
            <div class="info-row">
              <label>Connected Clients:</label>
              <span>{{ wifi.connected_clients }}</span>
            </div>
            <div v-if="wifi.noise_level" class="info-row">
              <label>Noise Level:</label>
              <span>{{ wifi.noise_level }} dBm</span>
            </div>
          </div>

          <div class="wifi-traffic">
            <h4>Traffic Statistics</h4>
            <div class="traffic-grid">
              <div class="traffic-item">
                <label>RX Bytes:</label>
                <span>{{ formatBytes(wifi.rx_bytes) }}</span>
              </div>
              <div class="traffic-item">
                <label>TX Bytes:</label>
                <span>{{ formatBytes(wifi.tx_bytes) }}</span>
              </div>
              <div class="traffic-item">
                <label>RX Packets:</label>
                <span>{{ wifi.rx_packets.toLocaleString() }}</span>
              </div>
              <div class="traffic-item">
                <label>TX Packets:</label>
                <span>{{ wifi.tx_packets.toLocaleString() }}</span>
              </div>
              <div v-if="wifi.error_count > 0" class="traffic-item error">
                <label>Errors:</label>
                <span>{{ wifi.error_count }}</span>
              </div>
            </div>
          </div>

          <div class="wifi-timestamp">
            <iconify-icon icon="lucide:clock" />
            <span>Last updated: {{ new Date(wifi.reported_at).toLocaleString() }}</span>
          </div>
        </VCard>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wifi-status {
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

  .wifi-summary {
    .wifi-item-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.85rem;

      &:last-child {
        margin-bottom: 0;
      }

      .wifi-interface {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-weight: 500;

        iconify-icon {
          font-size: 1rem;
          color: var(--primary);
        }
      }

      .client-count {
        color: var(--muted-grey);
        font-size: 0.8rem;
      }
    }

    .more-indicator {
      font-size: 0.8rem;
      color: var(--muted-grey);
      margin-top: 0.5rem;
    }
  }

  .wifi-details {
    .wifi-item-detail {
      margin-bottom: 1.5rem;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .wifi-card {
      padding: 1.5rem;
    }

    .wifi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      .wifi-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        iconify-icon {
          font-size: 1.2rem;
          color: var(--primary);
        }

        .interface-name {
          font-weight: 600;
          color: var(--dark-text);
          font-family: var(--font-family-monospace);
        }
      }

      .wifi-frequency {
        font-weight: 500;
        color: var(--muted-grey);
        background: var(--fade-grey-light-6);
        padding: 0.25rem 0.5rem;
        border-radius: var(--radius-small);
      }
    }

    .wifi-info {
      margin-bottom: 1.5rem;

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--fade-grey-light-3);

        &:last-child {
          border-bottom: none;
        }

        label {
          font-weight: 500;
          color: var(--muted-grey);
        }

        span {
          color: var(--dark-text);
          font-weight: 500;
        }
      }
    }

    .wifi-traffic {
      margin-bottom: 1rem;

      h4 {
        margin: 0 0 1rem 0;
        color: var(--dark-text);
        font-size: 1rem;
        font-weight: 600;
      }

      .traffic-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.75rem;

        .traffic-item {
          padding: 0.75rem;
          background: var(--fade-grey-light-6);
          border-radius: var(--radius);
          border: 1px solid var(--fade-grey-light-3);

          &.error {
            border-color: var(--danger);
            background: var(--danger-light);
          }

          label {
            display: block;
            font-size: 0.8rem;
            color: var(--muted-grey);
            margin-bottom: 0.25rem;
          }

          span {
            display: block;
            font-weight: 600;
            color: var(--dark-text);
          }
        }
      }
    }

    .wifi-timestamp {
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
  .wifi-frequency {
    background: var(--dark-sidebar-light-6) !important;
  }

  .traffic-item {
    background: var(--dark-sidebar-light-6) !important;
    border-color: var(--dark-sidebar-light-12) !important;

    &.error {
      background: var(--danger-dark) !important;
    }
  }

  .info-row {
    border-color: var(--dark-sidebar-light-12) !important;
  }

  .wifi-timestamp {
    border-color: var(--dark-sidebar-light-12) !important;
  }
}

@media only screen and (max-width: 767px) {
  .traffic-grid {
    grid-template-columns: 1fr;
  }

  .wifi-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>