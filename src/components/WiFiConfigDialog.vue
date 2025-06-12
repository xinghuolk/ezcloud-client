<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="WiFi Configuration" 
    width="600px"
    @closed="resetForm"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
      <!-- 模板选择 -->
      <div>
        <el-form-item label="WiFi Template" prop="template_id">
          <el-select 
            v-model="form.template_id" 
            placeholder="Select a WiFi template"
            style="width: 100%"
            :loading="templatesLoading"
          >
            <el-option
              v-for="template in templates"
              :key="template.id"
              :label="template.name"
              :value="template.id"
            >
              <div class="template-option">
                <span>{{ template.name }}</span>
                <small class="template-desc">{{ template.description }}</small>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 模板参数覆盖 -->
        <div v-if="selectedTemplate" class="template-override">
          <h4>Template Override (Optional)</h4>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="2.4G SSID">
                <el-input 
                  v-model="form.override.ssid_2g" 
                  placeholder="Leave empty to use template"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="2.4G Password">
                <el-input 
                  v-model="form.override.password_2g" 
                  type="password"
                  placeholder="Leave empty to use template"
                  show-password
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="5G SSID">
                <el-input 
                  v-model="form.override.ssid_5g" 
                  placeholder="Leave empty to use template"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="5G Password">
                <el-input 
                  v-model="form.override.password_5g" 
                  type="password"
                  placeholder="Leave empty to use template"
                  show-password
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">Cancel</el-button>
      <el-button 
        type="primary" 
        @click="handleSubmit"
        :loading="submitLoading"
      >
        Apply Configuration
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { deviceApi, wifiTemplateApi } from '@/api'
import type { Device, WiFiTemplate } from '@/api/types'

interface Props {
  modelValue: boolean
  device: Device
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
}>()

// 响应式数据
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const templatesLoading = ref(false)
const templates = ref<WiFiTemplate[]>([])

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单数据
const form = reactive({
  template_id: undefined as number | undefined,
  override: {
    ssid_2g: '',
    password_2g: '',
    ssid_5g: '',
    password_5g: ''
  }
})

// 表单验证规则
const rules: FormRules = {
  template_id: [
    { required: true, message: 'Please select a WiFi template', trigger: 'change' }
  ]
}



// 计算属性
const selectedTemplate = computed(() => {
  if (!form.template_id) return null
  return templates.value.find(t => t.id === form.template_id)
})

// 监听模板变化
watch(() => form.template_id, () => {
  formRef.value?.clearValidate()
})

// 获取WiFi模板列表
const fetchTemplates = async () => {
  try {
    templatesLoading.value = true
    const response = await wifiTemplateApi.getTemplates()
    if (response.success) {
      templates.value = response.data.items
    }
  } catch (error) {
    console.error('Error fetching WiFi templates:', error)
    ElMessage.error('Failed to load WiFi templates')
  } finally {
    templatesLoading.value = false
  }
}

// 提交配置
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    const valid = await formRef.value.validate()
    if (!valid) return

    submitLoading.value = true

    const configParams = {
      template_id: form.template_id,
      custom_config: Object.keys(form.override).some(key => form.override[key as keyof typeof form.override])
        ? form.override
        : undefined
    }

    const response = await deviceApi.updateDeviceWiFi(props.device.id, configParams)

    if (response.success) {
      ElMessage.success('WiFi configuration applied successfully')
      dialogVisible.value = false
      emit('success', 'WiFi configuration updated')
    } else {
      ElMessage.error(response.message || 'Failed to apply WiFi configuration')
    }
  } catch (error) {
    console.error('Error applying WiFi configuration:', error)
    ElMessage.error('Failed to apply WiFi configuration')
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(form, {
    template_id: undefined,
    override: {
      ssid_2g: '',
      password_2g: '',
      ssid_5g: '',
      password_5g: ''
    }
  })
  formRef.value?.clearValidate()
}

// 生命周期
onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped>
.template-option {
  display: flex;
  flex-direction: column;
}

.template-desc {
  color: #909399;
  font-size: 12px;
}

.template-override {
  margin-top: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.template-override h4 {
  margin: 0 0 16px 0;
  color: #606266;
  font-size: 14px;
}

h4 {
  margin: 20px 0 16px 0;
  color: #303133;
  font-size: 16px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}
</style> 