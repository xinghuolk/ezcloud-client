<template>
  <div class="device-bind">
    <div class="page-header">
      <h2>Bind New Device</h2>
      <p class="page-description">
        Enter your device serial number to bind it to your account. You can find the serial number on your device label or packaging.
      </p>
    </div>

    <el-row justify="center">
      <el-col :span="12">
        <el-card class="bind-card">
          <template #header>
            <div class="card-header">
              <h3>Device Information</h3>
            </div>
          </template>
          
          <el-form 
            :model="bindForm" 
            :rules="bindRules" 
            ref="bindFormRef"
            label-width="140px"
            size="large"
          >
            <el-form-item label="Serial Number" prop="serial">
                             <el-input 
                 v-model="bindForm.serial" 
                 placeholder="Enter device serial number"
                 clearable
                 :prefix-icon="VideoPlay"
               >
                 <template #append>
                   <el-button @click="handleScanSerial" :icon="Iphone">
                     Scan
                   </el-button>
                 </template>
               </el-input>
              <div class="help-text">
                The serial number is usually printed on a label on your device
              </div>
            </el-form-item>
            
            <el-form-item label="Device Name" prop="name">
              <el-input 
                v-model="bindForm.name" 
                placeholder="Enter a friendly name for your device (optional)"
                clearable
                :prefix-icon="Edit"
              />
              <div class="help-text">
                Give your device a memorable name like "Living Room Router" or "Office Gateway"
              </div>
            </el-form-item>

            <el-form-item>
              <el-button 
                type="primary" 
                @click="handleBindDevice"
                :loading="bindLoading"
                size="large"
                style="width: 100%"
              >
                <el-icon><Link /></el-icon>
                Bind Device
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近绑定的设备 -->
    <div v-if="recentDevices.length > 0" class="recent-devices">
      <h3>Recently Bound Devices</h3>
      <el-row :gutter="20">
        <el-col 
          v-for="device in recentDevices" 
          :key="device.id" 
          :span="8"
        >
          <el-card class="device-card" shadow="hover">
            <div class="device-info">
              <div class="device-icon">
                <el-icon size="24"><Monitor /></el-icon>
              </div>
              <div class="device-details">
                <h4>{{ device.name || 'Unnamed Device' }}</h4>
                <p class="device-serial">{{ device.serial }}</p>
                <div class="device-status">
                  <el-tag 
                    :type="device.is_online ? 'success' : 'danger'" 
                    size="small"
                  >
                    {{ device.is_online ? 'Online' : 'Offline' }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 绑定成功对话框 -->
    <el-dialog 
      v-model="successDialogVisible" 
      title="Device Bound Successfully!" 
      width="500px"
      :show-close="false"
      :close-on-click-modal="false"
    >
      <div class="success-content">
        <div class="success-icon">
          <el-icon size="48" color="#67C23A"><SuccessFilled /></el-icon>
        </div>
        <h3>Congratulations!</h3>
        <p>Your device has been successfully bound to your account.</p>
        
        <div v-if="boundDevice" class="bound-device-info">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Device Name">
              {{ boundDevice.name || 'Unnamed Device' }}
            </el-descriptions-item>
            <el-descriptions-item label="Serial Number">
              {{ boundDevice.serial }}
            </el-descriptions-item>
            <el-descriptions-item label="Model">
              {{ boundDevice.deviceModel?.oemname }} {{ boundDevice.deviceModel?.stdname }}
            </el-descriptions-item>
            <el-descriptions-item label="MAC Address">
              {{ boundDevice.primary_mac }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="handleBindAnother">Bind Another Device</el-button>
        <el-button type="primary" @click="goToDeviceList">View My Devices</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { 
  VideoPlay, 
  Edit, 
  Link, 
  Iphone, 
  Monitor, 
  SuccessFilled 
} from '@element-plus/icons-vue'
import { deviceApi } from '@/api'
import type { Device, DeviceBindParams } from '@/api/types'

const router = useRouter()

// 响应式数据
const bindLoading = ref(false)
const successDialogVisible = ref(false)
const recentDevices = ref<Device[]>([])
const boundDevice = ref<Device | null>(null)

// 表单引用
const bindFormRef = ref<FormInstance>()

// 绑定表单
const bindForm = reactive<DeviceBindParams & { name?: string }>({
  serial: '',
  name: ''
})

// 表单验证规则
const bindRules: FormRules = {
  serial: [
    { required: true, message: 'Please enter device serial number', trigger: 'blur' },
    { min: 3, max: 100, message: 'Serial number length should be 3-100 characters', trigger: 'blur' },
    { 
      pattern: /^[A-Za-z0-9\-_]+$/, 
      message: 'Serial number can only contain letters, numbers, hyphens and underscores', 
      trigger: 'blur' 
    }
  ],
  name: [
    { max: 100, message: 'Device name should not exceed 100 characters', trigger: 'blur' }
  ]
}

// 方法定义
const handleBindDevice = async () => {
  if (!bindFormRef.value) return
  
  try {
    const valid = await bindFormRef.value.validate()
    if (!valid) return
    
    bindLoading.value = true
    const response = await deviceApi.bindDevice(bindForm)
    if (response.success) {
      boundDevice.value = response.data
      successDialogVisible.value = true
      resetForm()
      fetchRecentDevices()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    console.error('Error binding device:', error)
    ElMessage.error('Failed to bind device')
  } finally {
    bindLoading.value = false
  }
}

const handleScanSerial = () => {
  ElMessage.info('QR code scanning feature will be available in future updates')
}

const handleBindAnother = () => {
  successDialogVisible.value = false
  boundDevice.value = null
}

const goToDeviceList = () => {
  router.push('/devices')
}

const resetForm = () => {
  Object.assign(bindForm, {
    serial: '',
    name: ''
  })
  bindFormRef.value?.clearValidate()
}

const fetchRecentDevices = async () => {
  try {
    const response = await deviceApi.getDevices({ 
      page: 1, 
      limit: 3 
    })
    if (response.success) {
      recentDevices.value = response.data.devices.slice(0, 3)
    }
  } catch (error) {
    console.error('Error fetching recent devices:', error)
  }
}

// 生命周期
onMounted(() => {
  fetchRecentDevices()
})
</script>

<style scoped>
.device-bind {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h2 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 28px;
}

.page-description {
  color: #606266;
  font-size: 16px;
  margin: 0;
  line-height: 1.6;
}

.bind-card {
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}

.recent-devices {
  margin-top: 60px;
}

.recent-devices h3 {
  color: #303133;
  margin-bottom: 20px;
  font-size: 20px;
}

.device-card {
  border-radius: 8px;
  transition: transform 0.3s ease;
}

.device-card:hover {
  transform: translateY(-2px);
}

.device-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.device-icon {
  background-color: #f0f9ff;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409EFF;
}

.device-details h4 {
  margin: 0 0 5px 0;
  color: #303133;
  font-size: 16px;
}

.device-serial {
  margin: 0 0 8px 0;
  color: #909399;
  font-size: 12px;
}

.device-status {
  margin: 0;
}

.success-content {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  margin-bottom: 20px;
}

.success-content h3 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 24px;
}

.success-content p {
  color: #606266;
  font-size: 16px;
  margin: 0 0 20px 0;
}

.bound-device-info {
  margin-top: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
}

:deep(.el-input-group__append) {
  border-left: 1px solid #dcdfe6;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  width: 120px;
}
</style> 