<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="Clone WiFi Template"
    width="50%"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div v-if="sourceTemplate" class="clone-dialog">
      <!-- 源模板信息 -->
      <el-card class="source-template" shadow="never">
        <template #header>
          <span class="section-title">Source Template</span>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Template Name">
            <span class="template-name">{{ sourceTemplate.name }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Country">
            <el-tag type="info">{{ sourceTemplate.country }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Radio Bands" :span="2">
            <div class="radio-bands">
              <el-tag
                v-for="radio in sourceTemplate.radioConfigs"
                :key="radio.band"
                :type="getBandTagType(radio.band)"
                size="small"
                style="margin-right: 4px"
              >
                {{ radio.band }}
              </el-tag>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="SSID Count">
            <el-badge :value="sourceTemplate.ssidConfigs?.length || 0" type="primary">
              <el-icon><Connection /></el-icon>
            </el-badge>
          </el-descriptions-item>
          <el-descriptions-item label="Status">
            <el-tag :type="sourceTemplate.is_active ? 'success' : 'info'">
              {{ sourceTemplate.is_active ? 'Active' : 'Inactive' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 新模板配置 -->
      <el-card class="new-template" shadow="never">
        <template #header>
          <span class="section-title">New Template Configuration</span>
        </template>
        
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="120px"
          label-position="left"
        >
          <el-form-item label="Template Name" prop="name">
            <el-input
              v-model="formData.name"
              placeholder="Enter new template name"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
          
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
          
          <el-form-item label="Clone Options">
            <el-checkbox-group v-model="cloneOptions">
              <el-checkbox label="radio" disabled>
                Radio Configurations (Always included)
              </el-checkbox>
              <el-checkbox label="ssid">
                SSID Configurations
              </el-checkbox>
              <el-checkbox label="status">
                Template Status (Active/Inactive)
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-form-item label="Modifications">
            <el-alert
              title="Configuration Preview"
              type="info"
              :closable="false"
              show-icon
            >
              <template #default>
                <div class="clone-preview">
                  <p><strong>Will clone:</strong></p>
                  <ul>
                    <li>{{ sourceTemplate.radioConfigs?.length || 0 }} Radio configurations</li>
                    <li v-if="cloneOptions.includes('ssid')">
                      {{ sourceTemplate.ssidConfigs?.length || 0 }} SSID configurations
                    </li>
                    <li v-else>
                      <span class="text-warning">SSID configurations will be skipped</span>
                    </li>
                    <li v-if="cloneOptions.includes('status')">
                      Template status: {{ sourceTemplate.is_active ? 'Active' : 'Inactive' }}
                    </li>
                    <li v-else>
                      <span class="text-warning">Template will be set as Inactive</span>
                    </li>
                  </ul>
                </div>
              </template>
            </el-alert>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <div v-else class="loading-state">
      <el-skeleton :rows="6" animated />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('update:modelValue', false)">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="handleClone" 
          :loading="cloning"
          :disabled="!sourceTemplate"
        >
          Clone Template
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { wifiTemplateApi, type WiFiTemplate } from '@/api/wifi-templates'

interface Props {
  modelValue: boolean
  sourceTemplate?: WiFiTemplate | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInstance>()
const cloning = ref(false)

// 表单数据
const formData = reactive({
  name: '',
  description: ''
})

// 克隆选项
const cloneOptions = ref(['radio', 'ssid', 'status'])

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: 'Template name is required', trigger: 'blur' },
    { min: 2, max: 50, message: 'Length should be 2 to 50 characters', trigger: 'blur' }
  ]
}

// 获取频段标签类型
const getBandTagType = (band: string) => {
  switch (band) {
    case '2.4G': return 'success'
    case '5G': return 'warning'
    case '6G': return 'danger'
    default: return 'info'
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    name: '',
    description: ''
  })
  
  cloneOptions.value = ['radio', 'ssid', 'status']
  
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 生成默认模板名称
const generateDefaultName = (sourceName: string) => {
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `${sourceName} - Copy (${timestamp})`
}

// 处理克隆
const handleClone = async () => {
  if (!formRef.value || !props.sourceTemplate?.id) return
  
  try {
    await formRef.value.validate()
    
    cloning.value = true
    
    // 准备克隆数据
    const cloneData = {
      source_id: props.sourceTemplate.id,
      name: formData.name,
      description: formData.description || undefined,
      clone_options: {
        include_ssids: cloneOptions.value.includes('ssid'),
        include_status: cloneOptions.value.includes('status')
      }
    }
    
    await wifiTemplateApi.cloneTemplate(cloneData)
    
    ElMessage.success('WiFi template cloned successfully')
    emit('success')
    emit('update:modelValue', false)
    
  } catch (error: any) {
    console.error('Clone error:', error)
    ElMessage.error(error.message || 'Failed to clone template')
  } finally {
    cloning.value = false
  }
}

// 监听对话框显示状态
watch(() => props.modelValue, (visible) => {
  if (visible) {
    resetForm()
    if (props.sourceTemplate) {
      // 生成默认名称
      formData.name = generateDefaultName(props.sourceTemplate.name)
      formData.description = props.sourceTemplate.description 
        ? `Cloned from: ${props.sourceTemplate.description}`
        : `Cloned from template: ${props.sourceTemplate.name}`
    }
  }
})
</script>

<style scoped>
.clone-dialog {
  max-height: 70vh;
  overflow-y: auto;
}

.source-template,
.new-template {
  margin-bottom: 20px;
}

.source-template :deep(.el-card__header),
.new-template :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.template-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.radio-bands {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.clone-preview {
  font-size: 14px;
  line-height: 1.6;
}

.clone-preview ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.clone-preview li {
  margin-bottom: 4px;
}

.text-warning {
  color: var(--el-color-warning);
}

.loading-state {
  padding: 20px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-checkbox.is-disabled .el-checkbox__label) {
  color: var(--el-text-color-regular);
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}
</style> 