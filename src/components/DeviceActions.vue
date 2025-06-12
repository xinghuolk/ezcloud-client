<template>
  <div class="device-actions">
    <el-dropdown 
      @command="handleCommand" 
      trigger="click"
      :disabled="loading"
    >
      <el-button 
        type="primary" 
        size="small"
        :loading="loading"
      >
        Actions
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="details" :icon="View">
            View Details
          </el-dropdown-item>
          <el-dropdown-item 
            command="wifi" 
            :icon="Connection"
            :disabled="!device.is_online"
          >
            WiFi Config
          </el-dropdown-item>
          <el-dropdown-item 
            command="sim_switch" 
            :icon="Refresh"
            :disabled="!device.is_online"
          >
            Switch SIM
          </el-dropdown-item>
          <el-dropdown-item 
            command="reboot" 
            :icon="RefreshRight"
            :disabled="!device.is_online"
          >
            Reboot Device
          </el-dropdown-item>
          <el-dropdown-item 
            command="logs" 
            :icon="Document"
            :disabled="!device.is_online"
          >
            Collect Logs
          </el-dropdown-item>
          <el-dropdown-item 
            command="unbind" 
            :icon="Delete"
            divided
          >
            Unbind Device
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- WiFi配置对话框 -->
    <WiFiConfigDialog 
      v-model="wifiDialogVisible"
      :device="device"
      @success="handleOperationSuccess"
    />

    <!-- SIM卡切换对话框 -->
    <el-dialog 
      v-model="simSwitchDialogVisible" 
      title="Switch SIM Card" 
      width="400px"
    >
      <el-form :model="simSwitchForm" label-width="120px">
        <el-form-item label="Target Slot">
          <el-radio-group v-model="simSwitchForm.slot">
            <el-radio :value="1">Slot 1</el-radio>
            <el-radio :value="2">Slot 2</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-alert
            title="Warning"
            type="warning"
            description="Switching SIM card will temporarily interrupt network connection."
            show-icon
            :closable="false"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="simSwitchDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="handleSIMSwitch"
          :loading="simSwitchLoading"
        >
          Switch
        </el-button>
      </template>
    </el-dialog>

    <!-- 日志收集对话框 -->
    <el-dialog 
      v-model="logsDialogVisible" 
      title="Collect Device Logs" 
      width="500px"
    >
      <el-form :model="logsForm" label-width="120px">
        <el-form-item label="Log Types">
          <el-checkbox-group v-model="logsForm.types">
            <el-checkbox value="system">System Logs</el-checkbox>
            <el-checkbox value="kernel">Kernel Logs</el-checkbox>
            <el-checkbox value="wireless">Wireless Logs</el-checkbox>
            <el-checkbox value="network">Network Logs</el-checkbox>
            <el-checkbox value="application">Application Logs</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="Duration">
          <el-select v-model="logsForm.duration" placeholder="Select duration">
            <el-option label="Last 1 hour" :value="1" />
            <el-option label="Last 6 hours" :value="6" />
            <el-option label="Last 24 hours" :value="24" />
            <el-option label="Last 7 days" :value="168" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="logsDialogVisible = false">Cancel</el-button>
        <el-button 
          type="primary" 
          @click="handleCollectLogs"
          :loading="logsLoading"
        >
          Collect
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  View,
  Connection,
  Refresh,
  RefreshRight,
  Document,
  Delete
} from '@element-plus/icons-vue'
import { deviceApi } from '@/api'
import type { Device } from '@/api/types'
import WiFiConfigDialog from './WiFiConfigDialog.vue'

interface Props {
  device: Device
}

const props = defineProps<Props>()

const emit = defineEmits<{
  success: [message: string]
  details: [device: Device]
  unbind: [device: Device]
}>()

// 状态管理
const loading = ref(false)
const wifiDialogVisible = ref(false)
const simSwitchDialogVisible = ref(false)
const simSwitchLoading = ref(false)
const logsDialogVisible = ref(false)
const logsLoading = ref(false)

// 表单数据
const simSwitchForm = reactive({
  slot: 1
})

const logsForm = reactive({
  types: ['system', 'kernel'],
  duration: 24
})

// 处理命令
const handleCommand = (command: string) => {
  switch (command) {
    case 'details':
      emit('details', props.device)
      break
    case 'wifi':
      wifiDialogVisible.value = true
      break
    case 'sim_switch':
      simSwitchDialogVisible.value = true
      break
    case 'reboot':
      handleReboot()
      break
    case 'logs':
      logsDialogVisible.value = true
      break
    case 'unbind':
      handleUnbind()
      break
  }
}

// 设备重启
const handleReboot = async () => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to reboot this device? The device will be temporarily unavailable.',
      'Confirm Reboot',
      {
        confirmButtonText: 'Reboot',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )

    loading.value = true
    const response = await deviceApi.rebootDevice(props.device.id)
    
    if (response.success) {
      ElMessage.success('Reboot command sent successfully')
      emit('success', 'Device reboot initiated')
    } else {
      ElMessage.error(response.message || 'Failed to send reboot command')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error rebooting device:', error)
      ElMessage.error('Failed to reboot device')
    }
  } finally {
    loading.value = false
  }
}

// SIM卡切换
const handleSIMSwitch = async () => {
  try {
    simSwitchLoading.value = true
    const response = await deviceApi.switchSIM(props.device.id, simSwitchForm.slot)
    
    if (response.success) {
      ElMessage.success('SIM switch command sent successfully')
      simSwitchDialogVisible.value = false
      emit('success', 'SIM card switch initiated')
    } else {
      ElMessage.error(response.message || 'Failed to send SIM switch command')
    }
  } catch (error) {
    console.error('Error switching SIM:', error)
    ElMessage.error('Failed to switch SIM card')
  } finally {
    simSwitchLoading.value = false
  }
}

// 收集日志
const handleCollectLogs = async () => {
  if (logsForm.types.length === 0) {
    ElMessage.warning('Please select at least one log type')
    return
  }

  try {
    logsLoading.value = true
    const response = await deviceApi.collectLogs(props.device.id, {
      types: logsForm.types,
      duration: logsForm.duration
    })
    
    if (response.success) {
      ElMessage.success('Log collection command sent successfully')
      logsDialogVisible.value = false
      emit('success', 'Log collection initiated')
    } else {
      ElMessage.error(response.message || 'Failed to send log collection command')
    }
  } catch (error) {
    console.error('Error collecting logs:', error)
    ElMessage.error('Failed to collect logs')
  } finally {
    logsLoading.value = false
  }
}

// 解绑设备
const handleUnbind = async () => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to unbind this device? This action cannot be undone.',
      'Confirm Unbind',
      {
        confirmButtonText: 'Unbind',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )

    emit('unbind', props.device)
  } catch (error) {
    // User cancelled
  }
}

// 操作成功回调
const handleOperationSuccess = (message: string) => {
  emit('success', message)
}
</script>

<style scoped>
.device-actions {
  display: inline-block;
}

.el-dropdown-menu__item.is-disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.el-dropdown-menu__item.is-disabled:hover {
  background-color: transparent;
}
</style> 