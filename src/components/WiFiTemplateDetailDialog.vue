<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="WiFi Template Details"
    width="70%"
    :close-on-click-modal="false"
  >
    <div v-if="template" class="template-details">
      <!-- 基础信息 -->
      <el-card class="detail-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">Basic Information</span>
            <el-tag :type="template.is_active ? 'success' : 'info'">
              {{ template.is_active ? 'Active' : 'Inactive' }}
            </el-tag>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Template Name">
            <span class="template-name">{{ template.name }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Country Code">
            <el-tag type="info">{{ template.country }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Description" :span="2">
            <span class="description">{{ template.description || 'No description' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Created At">
            <span class="date">{{ formatDate(template.created_at) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Updated At">
            <span class="date">{{ formatDate(template.updated_at) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 射频配置 -->
      <el-card class="detail-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">Radio Configuration</span>
            <el-tag type="primary">{{ radioConfigs.length }} Radio(s)</el-tag>
          </div>
        </template>
        
        <div v-if="radioConfigs.length === 0" class="empty-state">
          <el-empty description="No radio configurations" />
        </div>
        
        <div
          v-for="radio in radioConfigs"
          :key="radio.id"
          class="radio-config-card"
        >
          <div class="config-header">
            <el-tag :type="getBandTagType(radio.band)" size="large">
              {{ radio.band }} Radio
            </el-tag>
            <el-tag :type="radio.enabled ? 'success' : 'info'" size="small">
              {{ radio.enabled ? 'Enabled' : 'Disabled' }}
            </el-tag>
          </div>
          
          <el-descriptions :column="4" size="small" border>
            <el-descriptions-item label="Channel">
              <el-tag size="small">{{ radio.channel }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="TX Power">
              <span>{{ radio.txpower }} dBm</span>
            </el-descriptions-item>
            <el-descriptions-item label="HT Mode">
              <el-tag size="small" type="warning">{{ radio.htmode }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Status">
              <el-tag :type="radio.enabled ? 'success' : 'info'" size="small">
                {{ radio.enabled ? 'Enabled' : 'Disabled' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>

      <!-- SSID配置 -->
      <el-card class="detail-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">SSID Configuration</span>
            <el-tag type="primary">{{ ssidConfigs.length }} SSID(s)</el-tag>
          </div>
        </template>
        
        <div v-if="ssidConfigs.length === 0" class="empty-state">
          <el-empty description="No SSID configurations" />
        </div>
        
        <!-- 按频段分组显示SSID -->
        <div
          v-for="band in availableBands"
          :key="band"
          class="band-group"
        >
          <div class="band-header">
            <el-tag :type="getBandTagType(band)" size="large">
              {{ band }} SSIDs
            </el-tag>
          </div>
          
          <div class="ssid-grid">
            <div
              v-for="ssid in getSSIDsByBand(band)"
              :key="ssid.id"
              class="ssid-config-card"
            >
              <div class="ssid-header">
                <div class="ssid-info">
                  <span class="ssid-name">{{ ssid.ssid }}</span>
                  <el-tag size="small" type="info">Index {{ ssid.ssid_index }}</el-tag>
                </div>
                <el-tag :type="ssid.enabled ? 'success' : 'info'" size="small">
                  {{ ssid.enabled ? 'Enabled' : 'Disabled' }}
                </el-tag>
              </div>
              
              <el-descriptions :column="1" size="small" border>
                <el-descriptions-item label="Encryption">
                  <el-tag size="small" :type="getEncryptionTagType(ssid.encryption)">
                    {{ getEncryptionLabel(ssid.encryption) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="Password" v-if="ssid.encryption !== 'none'">
                  <span class="password">{{ ssid.password ? '••••••••' : 'Not set' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="Visibility">
                  <el-tag size="small" :type="ssid.hidden ? 'warning' : 'success'">
                    {{ ssid.hidden ? 'Hidden' : 'Visible' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="Isolation">
                  <el-tag size="small" :type="ssid.isolate ? 'danger' : 'success'">
                    {{ ssid.isolate ? 'Isolated' : 'Normal' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 统计信息 -->
      <el-card class="detail-section" shadow="never">
        <template #header>
          <span class="section-title">Statistics</span>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="Total Radios" :value="radioConfigs.length" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="Total SSIDs" :value="ssidConfigs.length" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="Enabled SSIDs" :value="enabledSSIDCount" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="Hidden SSIDs" :value="hiddenSSIDCount" />
          </el-col>
        </el-row>
      </el-card>
    </div>

    <div v-else class="loading-state">
      <el-skeleton :rows="10" animated />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:modelValue', false)">Close</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WiFiTemplate, WiFiRadioConfig, WiFiSSIDConfig } from '@/api/wifi-templates'

interface Props {
  modelValue: boolean
  template?: WiFiTemplate | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const radioConfigs = computed(() => props.template?.radioConfigs || [])
const ssidConfigs = computed(() => props.template?.ssidConfigs || [])

const availableBands = computed(() => {
  const bands = new Set(radioConfigs.value.map(r => r.band))
  return Array.from(bands).sort()
})

const enabledSSIDCount = computed(() => {
  return ssidConfigs.value.filter(s => s.enabled).length
})

const hiddenSSIDCount = computed(() => {
  return ssidConfigs.value.filter(s => s.hidden).length
})

// 方法
const getBandTagType = (band: string) => {
  switch (band) {
    case '2.4G': return 'success'
    case '5G': return 'warning'
    case '6G': return 'danger'
    default: return 'info'
  }
}

const getEncryptionTagType = (encryption: string) => {
  switch (encryption) {
    case 'none': return 'danger'
    case 'psk2': return 'warning'
    case 'sae': return 'success'
    case 'psk2+sae': return 'primary'
    default: return 'info'
  }
}

const getEncryptionLabel = (encryption: string) => {
  switch (encryption) {
    case 'none': return 'Open'
    case 'psk2': return 'WPA2-PSK'
    case 'sae': return 'WPA3-SAE'
    case 'psk2+sae': return 'WPA2/WPA3 Mixed'
    default: return encryption
  }
}

const getSSIDsByBand = (band: string) => {
  return ssidConfigs.value
    .filter(s => s.band === band)
    .sort((a, b) => a.ssid_index - b.ssid_index)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}
</script>

<style scoped>
.template-details {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.template-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.description {
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.date {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.radio-config-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  background-color: var(--el-bg-color-page);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.band-group {
  margin-bottom: 24px;
}

.band-header {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ssid-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.ssid-config-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 16px;
  background-color: var(--el-bg-color-page);
}

.ssid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ssid-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ssid-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.password {
  font-family: monospace;
  color: var(--el-text-color-secondary);
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.loading-state {
  padding: 20px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

:deep(.el-statistic__head) {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-color-primary);
}
</style> 