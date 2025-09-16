import { ref } from 'vue'
import type { Device } from '/@src/api/types'

export const useDeviceDialogs = () => {
  // 对话框状态
  const bindDialogOpen = ref(false)
  const detailsDialogOpen = ref(false)
  const batchDialogOpen = ref(false)
  const trustDialogOpen = ref(false)
  const rebootConfirmOpen = ref(false)
  const unbindConfirmOpen = ref(false)
  
  // 选中的设备
  const selectedDevice = ref<Device | null>(null)
  const selectedDeviceForReboot = ref<Device | null>(null)
  const selectedDeviceForUnbind = ref<Device | null>(null)
  const selectedDevicesForBatch = ref<Device[]>([])
  
  // 批量操作相关
  const batchOperation = ref('')
  const batchOperationParams = ref<any>({})
  
  // 统一的方法
  const openDetailsDialog = (device: Device) => {
    selectedDevice.value = device
    detailsDialogOpen.value = true
  }
  
  const openRebootConfirm = (device: Device) => {
    selectedDeviceForReboot.value = device
    rebootConfirmOpen.value = true
  }
  
  const openUnbindConfirm = (device: Device) => {
    selectedDeviceForUnbind.value = device
    unbindConfirmOpen.value = true
  }
  
  const openBatchDialog = (devices: Device[], operation: string, params?: any) => {
    selectedDevicesForBatch.value = devices
    batchOperation.value = operation
    batchOperationParams.value = params || {}
    batchDialogOpen.value = true
  }
  
  const openTrustDialog = (device: Device) => {
    selectedDevice.value = device
    trustDialogOpen.value = true
  }
  
  const openBindDialog = () => {
    bindDialogOpen.value = true
  }
  
  const closeDetailsDialog = () => {
    detailsDialogOpen.value = false
    selectedDevice.value = null
  }
  
  const closeRebootConfirm = () => {
    rebootConfirmOpen.value = false
    selectedDeviceForReboot.value = null
  }
  
  const closeUnbindConfirm = () => {
    unbindConfirmOpen.value = false
    selectedDeviceForUnbind.value = null
  }
  
  const closeBatchDialog = () => {
    batchDialogOpen.value = false
    selectedDevicesForBatch.value = []
    batchOperation.value = ''
    batchOperationParams.value = {}
  }
  
  const closeTrustDialog = () => {
    trustDialogOpen.value = false
    selectedDevice.value = null
  }
  
  const closeBindDialog = () => {
    bindDialogOpen.value = false
  }
  
  const closeAllDialogs = () => {
    bindDialogOpen.value = false
    detailsDialogOpen.value = false
    batchDialogOpen.value = false
    trustDialogOpen.value = false
    rebootConfirmOpen.value = false
    unbindConfirmOpen.value = false
    selectedDevice.value = null
    selectedDeviceForReboot.value = null
    selectedDeviceForUnbind.value = null
    selectedDevicesForBatch.value = []
    batchOperation.value = ''
    batchOperationParams.value = {}
  }
  
  return {
    // 状态
    bindDialogOpen,
    detailsDialogOpen,
    batchDialogOpen,
    trustDialogOpen,
    rebootConfirmOpen,
    unbindConfirmOpen,
    selectedDevice,
    selectedDeviceForReboot,
    selectedDeviceForUnbind,
    selectedDevicesForBatch,
    batchOperation,
    batchOperationParams,
    // 打开方法
    openDetailsDialog,
    openRebootConfirm,
    openUnbindConfirm,
    openBatchDialog,
    openTrustDialog,
    openBindDialog,
    // 关闭方法
    closeDetailsDialog,
    closeRebootConfirm,
    closeUnbindConfirm,
    closeBatchDialog,
    closeTrustDialog,
    closeBindDialog,
    closeAllDialogs
  }
}