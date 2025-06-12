<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="isEdit ? 'Edit WiFi Template' : 'Create WiFi Template'"
    width="80%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="140px"
      label-position="left"
    >
      <!-- 基础信息 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <span class="section-title">Basic Information</span>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Template Name" prop="name">
              <el-input
                v-model="formData.name"
                placeholder="Enter template name"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Country Code" prop="country">
              <el-select
                v-model="formData.country"
                placeholder="Select country"
                style="width: 100%"
              >
                <el-option
                  v-for="country in countryOptions"
                  :key="country.value"
                  :label="country.label"
                  :value="country.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="Description" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="Enter template description (optional)"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="Status">
          <el-switch
            v-model="formData.is_active"
            active-text="Active"
            inactive-text="Inactive"
          />
        </el-form-item>
      </el-card>

      <!-- 射频配置 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">Radio Configuration</span>
            <el-button
              type="primary"
              size="small"
              icon="Plus"
              @click="addRadioConfig"
            >
              Add Radio
            </el-button>
          </div>
        </template>
        
        <div v-if="formData.radioConfigs.length === 0" class="empty-state">
          <el-empty description="No radio configurations" />
        </div>
        
        <div
          v-for="(radio, index) in formData.radioConfigs"
          :key="`radio-${index}`"
          class="radio-config-item"
        >
          <div class="config-header">
            <el-tag :type="getBandTagType(radio.band)" size="large">
              {{ radio.band }} Radio
            </el-tag>
            <el-button
              type="danger"
              size="small"
              icon="Delete"
              circle
              @click="removeRadioConfig(index)"
            />
          </div>
          
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item
                :label="'Band'"
                :prop="`radioConfigs.${index}.band`"
                :rules="[{ required: true, message: 'Band is required' }]"
              >
                <el-select
                  v-model="radio.band"
                  placeholder="Select band"
                  @change="onRadioBandChange(index)"
                >
                  <el-option label="2.4G" value="2.4G" />
                  <el-option label="5G" value="5G" />
                  <el-option label="6G" value="6G" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item
                :label="'Channel'"
                :prop="`radioConfigs.${index}.channel`"
                :rules="[{ required: true, message: 'Channel is required' }]"
              >
                <el-select
                  v-model="radio.channel"
                  placeholder="Select channel"
                >
                  <el-option
                    v-for="channel in getChannelOptions(radio.band)"
                    :key="channel"
                    :label="channel"
                    :value="channel"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item
                :label="'TX Power'"
                :prop="`radioConfigs.${index}.txpower`"
                :rules="[{ required: true, message: 'TX Power is required' }]"
              >
                <el-input-number
                  v-model="radio.txpower"
                  :min="1"
                  :max="30"
                  placeholder="dBm"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item
                :label="'HT Mode'"
                :prop="`radioConfigs.${index}.htmode`"
                :rules="[{ required: true, message: 'HT Mode is required' }]"
              >
                <el-select
                  v-model="radio.htmode"
                  placeholder="Select mode"
                >
                  <el-option
                    v-for="mode in getHtModeOptions(radio.band)"
                    :key="mode"
                    :label="mode"
                    :value="mode"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item>
            <el-switch
              v-model="radio.enabled"
              active-text="Enabled"
              inactive-text="Disabled"
            />
          </el-form-item>
        </div>
      </el-card>

      <!-- SSID配置 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">SSID Configuration</span>
            <el-button
              type="primary"
              size="small"
              icon="Plus"
              @click="addSSIDConfig"
            >
              Add SSID
            </el-button>
          </div>
        </template>
        
        <div v-if="formData.ssidConfigs.length === 0" class="empty-state">
          <el-empty description="No SSID configurations" />
        </div>
        
        <div
          v-for="(ssid, index) in formData.ssidConfigs"
          :key="`ssid-${index}`"
          class="ssid-config-item"
        >
          <div class="config-header">
            <div class="ssid-info">
              <el-tag :type="getBandTagType(ssid.band)" size="small">
                {{ ssid.band }}
              </el-tag>
              <span class="ssid-name">{{ ssid.ssid || 'Unnamed SSID' }}</span>
              <el-tag size="small" type="info">Index {{ ssid.ssid_index }}</el-tag>
            </div>
            <el-button
              type="danger"
              size="small"
              icon="Delete"
              circle
              @click="removeSSIDConfig(index)"
            />
          </div>
          
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item
                :label="'Band'"
                :prop="`ssidConfigs.${index}.band`"
                :rules="[{ required: true, message: 'Band is required' }]"
              >
                <el-select
                  v-model="ssid.band"
                  placeholder="Select band"
                >
                  <el-option
                    v-for="radio in formData.radioConfigs"
                    :key="radio.band"
                    :label="radio.band"
                    :value="radio.band"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item
                :label="'SSID Index'"
                :prop="`ssidConfigs.${index}.ssid_index`"
                :rules="[{ required: true, message: 'SSID Index is required' }]"
              >
                <el-select
                  v-model="ssid.ssid_index"
                  placeholder="Select index"
                >
                  <el-option
                    v-for="idx in [0, 1, 2, 3]"
                    :key="idx"
                    :label="`Index ${idx}`"
                    :value="idx"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item
                :label="'SSID Name'"
                :prop="`ssidConfigs.${index}.ssid`"
                :rules="[{ required: true, message: 'SSID Name is required' }]"
              >
                <el-input
                  v-model="ssid.ssid"
                  placeholder="Enter SSID name"
                  maxlength="32"
                />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item
                :label="'Encryption'"
                :prop="`ssidConfigs.${index}.encryption`"
                :rules="[{ required: true, message: 'Encryption is required' }]"
              >
                <el-select
                  v-model="ssid.encryption"
                  placeholder="Select encryption"
                >
                  <el-option label="WPA2-PSK" value="psk2" />
                  <el-option label="WPA3-SAE" value="sae" />
                  <el-option label="WPA2/WPA3 Mixed" value="psk2+sae" />
                  <el-option label="Open" value="none" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item
                :label="'Password'"
                :prop="`ssidConfigs.${index}.password`"
                :rules="getPasswordRules(ssid.encryption)"
              >
                <el-input
                  v-model="ssid.password"
                  type="password"
                  placeholder="Enter password"
                  :disabled="ssid.encryption === 'none'"
                  show-password
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <div class="switch-group">
                <el-form-item>
                  <el-switch
                    v-model="ssid.enabled"
                    active-text="Enabled"
                    inactive-text="Disabled"
                  />
                </el-form-item>
                <el-form-item>
                  <el-switch
                    v-model="ssid.hidden"
                    active-text="Hidden"
                    inactive-text="Visible"
                  />
                </el-form-item>
                <el-form-item>
                  <el-switch
                    v-model="ssid.isolate"
                    active-text="Isolated"
                    inactive-text="Normal"
                  />
                </el-form-item>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:modelValue', false)">Cancel</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? 'Update' : 'Create' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { wifiTemplateApi, type WiFiTemplate, type WiFiTemplateCreateData, type WiFiRadioConfig, type WiFiSSIDConfig } from '@/api/wifi-templates'

interface Props {
  modelValue: boolean
  template?: WiFiTemplate | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const isEdit = computed(() => !!props.template?.id)

// 表单数据
const formData = reactive<WiFiTemplateCreateData>({
  name: '',
  description: '',
  country: 'CN',
  is_active: true,
  radioConfigs: [],
  ssidConfigs: []
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: 'Template name is required', trigger: 'blur' },
    { min: 2, max: 50, message: 'Length should be 2 to 50 characters', trigger: 'blur' }
  ],
  country: [
    { required: true, message: 'Country is required', trigger: 'change' }
  ]
}

// 国家选项
const countryOptions = [
  { label: 'China (CN)', value: 'CN' },
  { label: 'United States (US)', value: 'US' },
  { label: 'European Union (EU)', value: 'EU' },
  { label: 'Japan (JP)', value: 'JP' },
  { label: 'Korea (KR)', value: 'KR' }
]

// 获取频段标签类型
const getBandTagType = (band: string) => {
  switch (band) {
    case '2.4G': return 'success'
    case '5G': return 'warning'
    case '6G': return 'danger'
    default: return 'info'
  }
}

// 获取信道选项
const getChannelOptions = (band: string) => {
  switch (band) {
    case '2.4G':
      return ['auto', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
    case '5G':
      return ['auto', '36', '40', '44', '48', '52', '56', '60', '64', '149', '153', '157', '161', '165']
    case '6G':
      return ['auto', '1', '5', '9', '13', '17', '21', '25', '29', '33', '37', '41', '45', '49']
    default:
      return ['auto']
  }
}

// 获取HT模式选项
const getHtModeOptions = (band: string) => {
  switch (band) {
    case '2.4G':
      return ['HT20', 'HT40']
    case '5G':
      return ['HT20', 'HT40', 'HT80', 'HT160']
    case '6G':
      return ['HT20', 'HT40', 'HT80', 'HT160', 'HT320']
    default:
      return ['HT20']
  }
}

// 获取密码验证规则
const getPasswordRules = (encryption: string) => {
  if (encryption === 'none') {
    return []
  }
  return [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 8, max: 63, message: 'Password length should be 8 to 63 characters', trigger: 'blur' }
  ]
}

// 添加射频配置
const addRadioConfig = () => {
  const existingBands = formData.radioConfigs.map(r => r.band)
  const availableBands = ['2.4G', '5G', '6G'].filter(band => !existingBands.includes(band as any))
  
  if (availableBands.length === 0) {
    ElMessage.warning('All radio bands are already configured')
    return
  }
  
  const newRadio: Omit<WiFiRadioConfig, 'id' | 'template_id' | 'created_at' | 'updated_at'> = {
    band: availableBands[0] as any,
    channel: 'auto',
    txpower: 20,
    htmode: 'HT20',
    enabled: true
  }
  
  formData.radioConfigs.push(newRadio)
}

// 移除射频配置
const removeRadioConfig = (index: number) => {
  const radio = formData.radioConfigs[index]
  
  // 移除相关的SSID配置
  formData.ssidConfigs = formData.ssidConfigs.filter(ssid => ssid.band !== radio.band)
  
  formData.radioConfigs.splice(index, 1)
}

// 射频频段变化处理
const onRadioBandChange = (index: number) => {
  const radio = formData.radioConfigs[index]
  
  // 重置信道和HT模式
  radio.channel = 'auto'
  radio.htmode = getHtModeOptions(radio.band)[0]
}

// 添加SSID配置
const addSSIDConfig = () => {
  if (formData.radioConfigs.length === 0) {
    ElMessage.warning('Please add radio configuration first')
    return
  }
  
  const newSSID: Omit<WiFiSSIDConfig, 'id' | 'template_id' | 'created_at' | 'updated_at'> = {
    band: formData.radioConfigs[0].band,
    ssid_index: 0,
    ssid: '',
    password: '',
    encryption: 'psk2',
    hidden: false,
    enabled: true,
    isolate: false
  }
  
  formData.ssidConfigs.push(newSSID)
}

// 移除SSID配置
const removeSSIDConfig = (index: number) => {
  formData.ssidConfigs.splice(index, 1)
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    description: '',
    country: 'CN',
    is_active: true,
    radioConfigs: [],
    ssidConfigs: []
  })
  
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 填充表单数据
const fillFormData = (template: WiFiTemplate) => {
  Object.assign(formData, {
    name: template.name,
    description: template.description || '',
    country: template.country,
    is_active: template.is_active,
    radioConfigs: template.radioConfigs?.map(radio => ({
      band: radio.band,
      channel: radio.channel,
      txpower: radio.txpower,
      htmode: radio.htmode,
      enabled: radio.enabled
    })) || [],
    ssidConfigs: template.ssidConfigs?.map(ssid => ({
      band: ssid.band,
      ssid_index: ssid.ssid_index,
      ssid: ssid.ssid,
      password: ssid.password || '',
      encryption: ssid.encryption,
      hidden: ssid.hidden,
      enabled: ssid.enabled,
      isolate: ssid.isolate
    })) || []
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // 验证射频配置
    if (formData.radioConfigs.length === 0) {
      ElMessage.error('At least one radio configuration is required')
      return
    }
    
    // 验证SSID配置
    if (formData.ssidConfigs.length === 0) {
      ElMessage.error('At least one SSID configuration is required')
      return
    }
    
    // 验证频段一致性
    const radioBands = new Set(formData.radioConfigs.map(r => r.band))
    const ssidBands = new Set(formData.ssidConfigs.map(s => s.band))
    const invalidSSIDs = formData.ssidConfigs.filter(s => !radioBands.has(s.band))
    
    if (invalidSSIDs.length > 0) {
      ElMessage.error('SSID configurations reference non-existent radio bands')
      return
    }
    
    // 验证SSID索引唯一性
    const ssidKeys = formData.ssidConfigs.map(s => `${s.band}-${s.ssid_index}`)
    const uniqueKeys = new Set(ssidKeys)
    if (ssidKeys.length !== uniqueKeys.size) {
      ElMessage.error('Duplicate SSID index found for the same band')
      return
    }
    
    submitting.value = true
    
    if (isEdit.value && props.template?.id) {
      await wifiTemplateApi.updateTemplate(props.template.id, formData)
      ElMessage.success('WiFi template updated successfully')
    } else {
      await wifiTemplateApi.createTemplate(formData)
      ElMessage.success('WiFi template created successfully')
    }
    
    emit('success')
    emit('update:modelValue', false)
    
  } catch (error: any) {
    console.error('Submit error:', error)
    ElMessage.error(error.message || 'Operation failed')
  } finally {
    submitting.value = false
  }
}

// 监听对话框显示状态
watch(() => props.modelValue, (visible) => {
  if (visible) {
    if (props.template) {
      fillFormData(props.template)
    } else {
      resetForm()
    }
  }
})
</script>

<style scoped>
.form-section {
  margin-bottom: 20px;
}

.form-section :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.radio-config-item,
.ssid-config-item {
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
  margin-bottom: 16px;
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

.switch-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.switch-group .el-form-item {
  margin-bottom: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.dialog-footer {
  text-align: right;
}
</style> 