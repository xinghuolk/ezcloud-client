<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useFirmwareStore } from '/@src/stores/firmware'
import { modelApi } from '/@src/api'
import type { FirmwareVersion, FirmwareQuery, DeviceModel, CreateFirmwareParams } from '/@src/api/types'
import type { VTagColor } from '/@src/components/base/VTag.vue'
import { useFormErrorHandler } from '/@src/composables/use-error-handler'

definePage({
  meta: {
    requiresAuth: true,
    requiresAdmin: true
  }
})

const firmwareStore = useFirmwareStore()

// Error handling
const { createFormErrors, clearFormErrors, setFieldError, handleError, showSuccess } = useFormErrorHandler()
const uploadFormErrors = createFormErrors()

// 状态定义
const deviceModels = ref<DeviceModel[]>([])
const selectedFirmware = ref<FirmwareVersion | null>(null)

// 对话框状态
const uploadDialogOpen = ref(false)
const detailDialogOpen = ref(false)
const compatibilityDialogOpen = ref(false)
const successDialogOpen = ref(false)
const publishConfirmOpen = ref(false)
const archiveConfirmOpen = ref(false)
const selectedFirmwareForPublish = ref<FirmwareVersion | null>(null)
const selectedFirmwareForArchive = ref<FirmwareVersion | null>(null)

// Delete confirmation
const deleteConfirmOpen = ref(false)
const selectedFirmwareForDelete = ref<FirmwareVersion | null>(null)

// Remove test device confirmation
const removeTestDeviceConfirmOpen = ref(false)
const selectedDeviceSerialForRemove = ref<string>('')

// 测试相关状态
const testManageDialogOpen = ref(false)
const testProgressDialogOpen = ref(false)
const selectedFirmwareForTest = ref<FirmwareVersion | null>(null)
const addTestDevicesDialogOpen = ref(false)
const testDeviceSerials = ref('')
const startTestConfirmOpen = ref(false)
const finishTestConfirmOpen = ref(false)

// 测试进度轮询
let testProgressPollInterval: number | null = null
let testDevicesPollInterval: number | null = null

// 搜索表单
const searchForm = reactive<FirmwareQuery>({
  page: 1,
  limit: 20,
  search: '',
  status: undefined,
  device_model_id: undefined
})

// 上传表单
const uploadForm = reactive<CreateFirmwareParams & { file: File | null }>({
  version: '',
  release_notes: '',
  device_model_ids: [],
  file: null
})

// 文件上传相关
const uploadProgress = ref(0)
const fileInputRef = ref<HTMLInputElement>()

// 搜索防抖
let searchTimeout: NodeJS.Timeout | null = null

// 计算属性
const statusColorMap: Record<string, VTagColor> = {
  'DRAFT': 'warning',
  'TESTING': 'info',
  'PUBLISHED': 'success',
  'ARCHIVED': 'light'
}

const statusTextMap: Record<string, string> = {
  'DRAFT': 'Draft',
  'TESTING': 'Testing',
  'PUBLISHED': 'Published', 
  'ARCHIVED': 'Archived'
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}


// 计算测试持续时间
const calculateTestDuration = (startTime: string, endTime?: string): string => {
  if (!startTime) return '-'
  
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const duration = end.getTime() - start.getTime()
  
  if (duration < 0) return '-'
  
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// 获取状态颜色
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'danger'
    case 'verifying':
      return 'warning'
    case 'testing':
      return 'info'
    case 'installing':
      return 'primary'
    case 'downloading':
      return 'primary'
    case 'pending':
      return 'light'
    default:
      return 'info'
  }
}

// 获取状态显示文本
const getStatusDisplayText = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'downloading':
      return 'Downloading'
    case 'installing':
      return 'Installing'
    case 'testing':
      return 'Testing'
    case 'verifying':
      return 'Verifying'
    case 'success':
      return 'Success'
    case 'failed':
      return 'Failed'
    default:
      return status
  }
}

// 当前选中固件的测试进度数据
const currentTestProgress = computed(() => {
  if (!selectedFirmwareForTest.value?.id) return null
  const progress = firmwareStore.testProgress.get(selectedFirmwareForTest.value.id)
  return progress || {
    total: 0,
    pending: 0,
    downloading: 0,
    installing: 0,
    testing: 0,
    verifying: 0,
    success: 0,
    failed: 0,
    inProgress: 0,
    completed: 0,
    successRate: 0
  }
})

// 获取固件列表
const fetchFirmwareList = async () => {
  await firmwareStore.fetchFirmwareList(searchForm)
}

// 获取设备型号列表
const fetchDeviceModels = async () => {
  try {
    const response = await modelApi.getModels({ page: 1, limit: 100 })
    if (response.success) {
      deviceModels.value = response.data.models
    }
  } catch (error) {
    console.error('Failed to fetch device models:', error)
  }
}

// 搜索防抖处理
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    searchForm.page = 1
    fetchFirmwareList()
  }, 300)
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    page: 1,
    limit: 20,
    search: '',
    status: undefined,
    device_model_id: undefined
  })
  fetchFirmwareList()
}

// 打开上传对话框
const openUploadDialog = () => {
  Object.assign(uploadForm, {
    version: '',
    release_notes: '',
    device_model_ids: [],
    file: null
  })
  uploadProgress.value = 0
  uploadDialogOpen.value = true
}

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    uploadForm.file = file
    
    console.log('File selected:', {
      filename: file.name,
      fileSize: file.size
    })
  }
}

// 上传固件
const handleUpload = async () => {
  try {
    clearFormErrors(uploadFormErrors)
    
    if (!uploadForm.file) {
      setFieldError(uploadFormErrors, 'file', 'Please select firmware file')
      return
    }
    
    if (!uploadForm.version.trim()) {
      setFieldError(uploadFormErrors, 'version', 'Please enter version number')
      return
    }
    
    if (uploadForm.device_model_ids.length === 0) {
      setFieldError(uploadFormErrors, 'device_model_ids', 'Please select compatible device models')
      return
    }

    console.log('Uploading firmware:', {
      file: uploadForm.file.name,
      version: uploadForm.version,
      device_model_ids: uploadForm.device_model_ids
    })

    // 直接使用原文件，让后端负责文件命名
    const result = await firmwareStore.uploadFirmware(uploadForm.file, {
      version: uploadForm.version,
      release_notes: uploadForm.release_notes,
      device_model_ids: uploadForm.device_model_ids
    })
    
    if (result) {
      uploadDialogOpen.value = false
      // 重置表单
      uploadForm.file = null
      uploadForm.version = ''
      uploadForm.release_notes = ''
      uploadForm.device_model_ids = []
      // 显示成功确认对话框
      successDialogOpen.value = true
    }
  } catch (error) {
    console.error('Upload error:', error)
    handleError(error, { fallbackMessage: 'Upload failed. Please try again.' })
  }
}

// 查看固件详情
const viewDetails = async (firmware: FirmwareVersion) => {
  selectedFirmware.value = firmware
  detailDialogOpen.value = true
}

// 显示发布确认对话框
const showPublishConfirm = (firmware: FirmwareVersion) => {
  selectedFirmwareForPublish.value = firmware
  publishConfirmOpen.value = true
}

// 显示归档确认对话框
const showArchiveConfirm = (firmware: FirmwareVersion) => {
  selectedFirmwareForArchive.value = firmware
  archiveConfirmOpen.value = true
}

// 处理发布对话框关闭
const handlePublishClose = () => {
  publishConfirmOpen.value = false
  selectedFirmwareForPublish.value = null
}

// 处理归档对话框关闭
const handleArchiveClose = () => {
  archiveConfirmOpen.value = false
  selectedFirmwareForArchive.value = null
}

// 确认发布固件
const confirmPublish = async () => {
  if (!selectedFirmwareForPublish.value) return
  
  const success = await firmwareStore.updateFirmwareStatus(selectedFirmwareForPublish.value.id, 'PUBLISHED')
  if (success) {
    publishConfirmOpen.value = false
    selectedFirmwareForPublish.value = null
    // 刷新固件列表显示更新的状态
    await fetchFirmwareList()
    showSuccess('Firmware published successfully!')
  }
}

// 确认归档固件
const confirmArchive = async () => {
  if (!selectedFirmwareForArchive.value) return
  
  const success = await firmwareStore.updateFirmwareStatus(selectedFirmwareForArchive.value.id, 'ARCHIVED')
  if (success) {
    archiveConfirmOpen.value = false
    selectedFirmwareForArchive.value = null
    // 刷新固件列表显示更新的状态
    await fetchFirmwareList()
    showSuccess('Firmware archived successfully!')
  }
}

// 更新固件状态
const updateStatus = async (firmware: FirmwareVersion, newStatus: 'PUBLISHED' | 'ARCHIVED') => {
  if (newStatus === 'PUBLISHED') {
    showPublishConfirm(firmware)
    return
  }
  
  if (newStatus === 'ARCHIVED') {
    showArchiveConfirm(firmware)
    return
  }
}

// 删除固件
const deleteFirmware = (firmware: FirmwareVersion) => {
  if (firmware.status !== 'DRAFT') {
    handleError(new Error('Only draft firmware can be deleted'))
    return
  }
  
  selectedFirmwareForDelete.value = firmware
  deleteConfirmOpen.value = true
}

const confirmDeleteFirmware = async () => {
  if (!selectedFirmwareForDelete.value) return
  
  try {
    await firmwareStore.deleteFirmware(selectedFirmwareForDelete.value.id)
  } finally {
    deleteConfirmOpen.value = false
    selectedFirmwareForDelete.value = null
  }
}

// Handle upload success confirmation
const handleUploadSuccess = async () => {
  successDialogOpen.value = false
  // Refresh firmware list to show newly uploaded firmware
  await fetchFirmwareList()
  showSuccess('Firmware uploaded successfully, list updated!')
}

// 兼容性管理状态
const compatibilityForm = reactive({
  device_model_ids: [] as number[]
})
const loadingCompatibility = ref(false)
const savingCompatibility = ref(false)

// 管理兼容性
const manageCompatibility = async (firmware: FirmwareVersion) => {
  selectedFirmware.value = firmware
  compatibilityDialogOpen.value = true
  
  // 加载当前兼容性设置
  loadingCompatibility.value = true
  
  const models = await firmwareStore.getCompatibility(firmware.id)
  
  if (Array.isArray(models)) {
    const modelIds = models.map(model => model.id)
    compatibilityForm.device_model_ids = modelIds
  } else {
    compatibilityForm.device_model_ids = []
  }
  
  loadingCompatibility.value = false
}

// 保存兼容性设置
const saveCompatibility = async () => {
  if (!selectedFirmware.value) return
  
  const payload = {
    device_model_ids: compatibilityForm.device_model_ids
  }
  
  savingCompatibility.value = true
  const success = await firmwareStore.setCompatibility(selectedFirmware.value.id, payload)
  
  if (success) {
    compatibilityDialogOpen.value = false
    // 刷新固件列表以显示更新的兼容性信息
    await fetchFirmwareList()
  }
  savingCompatibility.value = false
}

// 分页处理已内联到模板中

// 测试管理方法
const manageTestDevices = async (firmware: FirmwareVersion) => {
  selectedFirmwareForTest.value = firmware
  testManageDialogOpen.value = true
  
  // 加载测试设备列表
  await firmwareStore.fetchTestDevices(firmware.id)
  
  // 如果固件在测试中，启动轮询
  if (firmware.status === 'TESTING') {
    startTestDevicesPolling(firmware.id)
  }
}

// 开始轮询测试设备状态
const startTestDevicesPolling = (firmwareId: number) => {
  // 清理之前的轮询
  stopTestDevicesPolling()
  
  // 立即轮询设备状态，每10秒更新一次
  testDevicesPollInterval = window.setInterval(async () => {
    if (testManageDialogOpen.value && selectedFirmwareForTest.value?.id === firmwareId) {
      await firmwareStore.fetchTestDevices(firmwareId)
    } else {
      // 对话框已关闭，停止轮询
      stopTestDevicesPolling()
    }
  }, 10000) // 每10秒轮询一次
}

// 停止轮询测试设备状态
const stopTestDevicesPolling = () => {
  if (testDevicesPollInterval !== null) {
    window.clearInterval(testDevicesPollInterval)
    testDevicesPollInterval = null
  }
}

const viewTestProgress = async (firmware: FirmwareVersion) => {
  selectedFirmwareForTest.value = firmware
  testProgressDialogOpen.value = true
  
  // 加载测试进度
  await firmwareStore.fetchTestProgress(firmware.id)
  
  // 开始轮询测试进度
  startTestProgressPolling(firmware.id)
}

// 开始轮询测试进度
const startTestProgressPolling = (firmwareId: number) => {
  // 清理之前的轮询
  stopTestProgressPolling()
  
  // 60秒后开始，每10秒轮询一次
  setTimeout(() => {
    testProgressPollInterval = window.setInterval(async () => {
      if (testProgressDialogOpen.value && selectedFirmwareForTest.value?.id === firmwareId) {
        await firmwareStore.fetchTestProgress(firmwareId)
        
        // 如果测试已完成（所有设备都完成测试），停止轮询
        const progress = firmwareStore.testProgress.get(firmwareId)
        if (progress && progress.completed === progress.total && progress.total > 0) {
          stopTestProgressPolling()
        }
      } else {
        // 对话框已关闭，停止轮询
        stopTestProgressPolling()
      }
    }, 10000) // 每10秒轮询一次
  }, 60000) // 60秒后开始
}

// 停止轮询测试进度
const stopTestProgressPolling = () => {
  if (testProgressPollInterval !== null) {
    window.clearInterval(testProgressPollInterval)
    testProgressPollInterval = null
  }
}

const showStartTestConfirm = (firmware: FirmwareVersion) => {
  selectedFirmwareForTest.value = firmware
  startTestConfirmOpen.value = true
}

const showFinishTestConfirm = (firmware: FirmwareVersion) => {
  selectedFirmwareForTest.value = firmware
  finishTestConfirmOpen.value = true
}

const openAddTestDevicesDialog = () => {
  testDeviceSerials.value = ''
  addTestDevicesDialogOpen.value = true
}

const addTestDevices = async () => {
  if (!selectedFirmwareForTest.value || !testDeviceSerials.value.trim()) return
  
  const serials = testDeviceSerials.value
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  if (serials.length === 0) {
    handleError(new Error('Please enter at least one device serial'), {
      fallbackMessage: 'Please enter at least one device serial'
    })
    return
  }
  
  try {
    const result = await firmwareStore.addTestDevices(selectedFirmwareForTest.value.id, {
      device_serials: serials
    })
    
    if (result) {
      addTestDevicesDialogOpen.value = false
      testDeviceSerials.value = ''
    }
  } catch (error: any) {
    // 使用统一错误处理架构
    handleError(error, {
      fallbackMessage: 'Failed to add test devices'
    })
  }
}

const removeTestDevice = (serial: string) => {
  selectedDeviceSerialForRemove.value = serial
  removeTestDeviceConfirmOpen.value = true
}

const confirmRemoveTestDevice = async () => {
  if (!selectedFirmwareForTest.value || !selectedDeviceSerialForRemove.value) return
  
  try {
    await firmwareStore.deleteTestDevice(selectedFirmwareForTest.value.id, selectedDeviceSerialForRemove.value)
  } finally {
    removeTestDeviceConfirmOpen.value = false
    selectedDeviceSerialForRemove.value = ''
  }
}

const startTesting = async () => {
  if (!selectedFirmwareForTest.value) return
  
  const result = await firmwareStore.startTesting(selectedFirmwareForTest.value.id)
  if (result) {
    startTestConfirmOpen.value = false
    selectedFirmwareForTest.value = null
    await fetchFirmwareList()
  }
}

const finishTesting = async (force = false) => {
  if (!selectedFirmwareForTest.value) return
  
  const result = await firmwareStore.finishTesting(selectedFirmwareForTest.value.id, force)
  if (result) {
    finishTestConfirmOpen.value = false
    selectedFirmwareForTest.value = null
    await fetchFirmwareList()
  }
}

// 监听搜索输入
watch(() => searchForm.search, handleSearch)
watch(() => searchForm.status, () => {
  searchForm.page = 1
  fetchFirmwareList()
})
watch(() => searchForm.device_model_id, () => {
  searchForm.page = 1
  fetchFirmwareList()
})

// Watch for pagination limit changes
watch(() => searchForm.limit, () => {
  searchForm.page = 1
  fetchFirmwareList()
})

// 初始化
onMounted(() => {
  fetchFirmwareList()
  fetchDeviceModels()
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopTestProgressPolling()
  stopTestDevicesPolling()
})
</script>

<template>
  <div class="common-page-layout">
    <!-- 页面头部 -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">Firmware Management</h1>
          <p class="subtitle is-6">Manage device firmware versions and compatibility</p>
        </div>
      </div>
    </div>

    <!-- 固件列表 -->
    <VCard>
      <!-- Filter Section -->
      <div class="card-content">
        <div class="columns">
          <div class="column is-3">
            <VField>
              <VLabel>Search Firmware</VLabel>
              <VControl>
                <VInput
                  v-model="searchForm.search"
                  placeholder="Search version or release notes"
                  icon="lucide:search"
                />
              </VControl>
            </VField>
          </div>
          
          <div class="column is-2">
            <VField>
              <VLabel>Status Filter</VLabel>
              <VControl>
                <VSelect v-model="searchForm.status" placeholder="All Status">
                  <VOption value="">All Status</VOption>
                  <VOption value="DRAFT">Draft</VOption>
                  <VOption value="TESTING">Testing</VOption>
                  <VOption value="PUBLISHED">Published</VOption>
                  <VOption value="ARCHIVED">Archived</VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>
          
          <div class="column is-3">
            <VField>
              <VLabel>Device Model</VLabel>
              <VControl>
                <VSelect v-model="searchForm.device_model_id" placeholder="All Models">
                  <VOption value="">All Models</VOption>
                  <VOption 
                    v-for="model in deviceModels" 
                    :key="model.id" 
                    :value="model.id"
                  >
                    {{ model.stdname }}
                  </VOption>
                  <VOption v-if="deviceModels.length === 0" value="" disabled>
                    Loading models...
                  </VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>
          
          <div class="column is-4">
            <VField>
              <VLabel>&nbsp;</VLabel>
              <VControl>
                <div class="field is-grouped">
                  <div class="control">
                    <VButton @click="resetSearch">
                      Reset
                    </VButton>
                  </div>
                  <div class="control">
                    <VButton color="primary" @click="openUploadDialog">
                      Upload Firmware
                    </VButton>
                  </div>
                </div>
              </VControl>
            </VField>
          </div>
        </div>
      </div>

      <!-- Firmware Table -->
      <VFlexTableWrapper
        :columns="{
          version: { 
            label: 'Version',
            searchable: true,
            sortable: true,
            bold: true
          },
          file_name: { 
            label: 'File Name',
            searchable: true,
            grow: true
          },
          file_size: { 
            label: 'File Size'
          },
          compatible_models: { 
            label: 'Compatible Devices',
            grow: true
          },
          status: { 
            label: 'Status',
            sortable: true
          },
          uploader: { 
            label: 'Uploader',
            sortable: true
          },
          created_at: { 
            label: 'Upload Time',
            sortable: true
          },
          actions: { 
            label: 'Actions',
            align: 'end'
          }
        }"
        :data="firmwareStore.firmwareList"
      >
        <template #default="wrapperState">
          <VFlexTableToolbar>
            <template #right>
              <VField>
                <VControl>
                  <VSelect v-model="searchForm.limit" class="is-rounded">
                    <VOption :value="10">10 per page</VOption>
                    <VOption :value="20">20 per page</VOption>
                    <VOption :value="50">50 per page</VOption>
                  </VSelect>
                </VControl>
              </VField>
            </template>
          </VFlexTableToolbar>

          <VFlexTable rounded>
            <template #body>
              <!-- 加载状态 -->
              <div v-if="firmwareStore.loading" class="flex-list-inner">
                <div v-for="key in 5" :key="key" class="flex-table-item">
                  <VFlexTableCell><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="60px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="100px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ align: 'end' }"><VPlaceload width="120px" /></VFlexTableCell>
                </div>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="!firmwareStore.loading && (!firmwareStore.firmwareList || firmwareStore.firmwareList.length === 0)" class="flex-list-inner">
                <VPlaceholderSection
                  title="No Firmware Found"
                  subtitle="Click the 'Upload Firmware' button above to start adding firmware versions"
                  class="my-6"
                />
              </div>
            </template>

            <template #body-cell="{ row: firmware, column }">
              <template v-if="column.key === 'version'">
                <strong>{{ firmware.version }}</strong>
              </template>

              <template v-if="column.key === 'file_name'">
                <span class="has-text-grey">{{ firmware.file_name }}</span>
              </template>

              <template v-if="column.key === 'file_size'">
                {{ formatFileSize(firmware.file_size) }}
              </template>

              <template v-if="column.key === 'compatible_models'">
                <div class="compatibility-tags">
                  <div class="tags">
                    <VTag 
                      v-for="model in firmware.compatible_models?.slice(0, 2)" 
                      :key="model.id"
                      size="tiny"
                    >
                      {{ model.stdname }}
                    </VTag>
                    <VTag 
                      v-if="(firmware.compatible_models?.length || 0) > 2"
                      size="tiny"
                      color="light"
                    >
                      +{{ (firmware.compatible_models?.length || 0) - 2 }}
                    </VTag>
                  </div>
                </div>
              </template>

              <template v-if="column.key === 'status'">
                <VTag 
                  :color="statusColorMap[firmware.status]"
                  class="status-tag"
                >
                  {{ statusTextMap[firmware.status] }}
                </VTag>
              </template>

              <template v-if="column.key === 'uploader'">
                {{ firmware.uploader?.username || 'Unknown' }}
              </template>

              <template v-if="column.key === 'created_at'">
                <VDateTimeSplit :date-string="firmware.created_at" />
              </template>

              <template v-if="column.key === 'actions'">
                <VDropdown icon="lucide:more-vertical">
                  <template #content>
                    <a 
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="viewDetails(firmware)"
                    >
                      <iconify-icon icon="lucide:eye" class="mr-2" />
                      View Details
                    </a>
                    <a 
                      v-if="firmware.status === 'DRAFT'"
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="manageCompatibility(firmware)"
                    >
                      <iconify-icon icon="lucide:settings" class="mr-2" />
                      Compatibility Settings
                    </a>
                    <span 
                      v-else
                      class="dropdown-item is-disabled"
                      title="Only DRAFT firmware can modify compatibility settings"
                    >
                      <iconify-icon icon="lucide:settings" class="mr-2" />
                      Compatibility Settings (Locked)
                    </span>
                    <hr class="dropdown-divider" v-if="firmware.status !== 'ARCHIVED'">
                    <!-- 测试管理选项 -->
                    <a 
                      v-if="firmware.status === 'DRAFT' || firmware.status === 'TESTING'"
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="manageTestDevices(firmware)"
                    >
                      <iconify-icon icon="lucide:users" class="mr-2" />
                      Manage Test Devices
                    </a>
                    <a 
                      v-if="firmware.status === 'TESTING'"
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="viewTestProgress(firmware)"
                    >
                      <iconify-icon icon="lucide:activity" class="mr-2" />
                      View Test Progress
                    </a>
                    <hr class="dropdown-divider" v-if="firmware.status === 'DRAFT' || firmware.status === 'TESTING'">
                    <!-- 状态流转选项 -->
                    <a 
                      v-if="firmware.status === 'DRAFT'"
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="showStartTestConfirm(firmware)"
                    >
                      <iconify-icon icon="lucide:play-circle" class="mr-2" />
                      Start Testing
                    </a>
                    <a 
                      v-if="firmware.status === 'DRAFT'"
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="updateStatus(firmware, 'PUBLISHED')"
                    >
                      <iconify-icon icon="lucide:upload" class="mr-2" />
                      Publish Directly
                    </a>
                    <a 
                      v-if="firmware.status === 'TESTING'"
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="showFinishTestConfirm(firmware)"
                    >
                      <iconify-icon icon="lucide:check-circle" class="mr-2" />
                      Finish Testing
                    </a>
                    <a 
                      v-if="firmware.status === 'PUBLISHED'"
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="updateStatus(firmware, 'ARCHIVED')"
                    >
                      <iconify-icon icon="lucide:archive" class="mr-2" />
                      Archive
                    </a>
                    <hr class="dropdown-divider" v-if="firmware.status === 'DRAFT'">
                    <a 
                      v-if="firmware.status === 'DRAFT'"
                      href="#" 
                      class="dropdown-item has-text-danger"
                      @click.prevent="deleteFirmware(firmware)"
                    >
                      <iconify-icon icon="lucide:trash-2" class="mr-2" />
                      Delete
                    </a>
                  </template>
                </VDropdown>
              </template>
            </template>
          </VFlexTable>
        </template>
      </VFlexTableWrapper>

      <!-- Pagination -->
      <VFlexPagination
        v-if="firmwareStore.pagination.total > 0"
        v-model:current-page="searchForm.page"
        :item-per-page="firmwareStore.pagination.limit"
        :total-items="firmwareStore.pagination.total"
        :max-links-displayed="7"
        no-router
        @update:current-page="(page) => { searchForm.page = page; fetchFirmwareList() }"
      />
    </VCard>

    <!-- 上传固件对话框 -->
    <VModal 
      :open="uploadDialogOpen"
      title="Upload Firmware"
      size="medium"
      actions="right"
      @close="uploadDialogOpen = false"
    >
      <template #content>
        <form @submit.prevent="handleUpload">
          <VField>
            <VLabel>Firmware File *</VLabel>
            <VControl>
              <input
                ref="fileInputRef"
                type="file"
                accept=".bin,.img,.tar.gz"
                @change="handleFileSelect"
                required
              />
            </VControl>
            <p class="help">Supports .bin, .img, .tar.gz files, maximum 100MB</p>
          </VField>
          
          <VField>
            <VLabel>Version *</VLabel>
            <VControl>
              <VInput 
                v-model="uploadForm.version"
                placeholder="Enter version (e.g. EV4060, EV6260)"
                required
              />
            </VControl>
            <p class="help">Please enter version manually following the standard format: EV + version numbers (e.g. EV4060, EV6260)</p>
          </VField>
          
          <VField>
            <VLabel>Compatible Device Models *</VLabel>
            <VControl>
              <VSelect 
                v-model="uploadForm.device_model_ids"
                placeholder="Select compatible device models"
                multiple
                required
              >
                <VOption 
                  v-for="model in deviceModels" 
                  :key="model.id" 
                  :value="model.id"
                >
                  {{ model.stdname }} ({{ model.oemname }})
                </VOption>
              </VSelect>
            </VControl>
            <p class="help">Multiple device models can be selected</p>
          </VField>
          
          <VField>
            <VLabel>Release Notes</VLabel>
            <VControl>
              <VTextarea 
                v-model="uploadForm.release_notes"
                placeholder="Describe the contents of this update..."
                rows="4"
              />
            </VControl>
          </VField>
        </form>
      </template>
      
      <template #action>
        <VButton 
          color="primary"
          :loading="firmwareStore.uploading"
          @click="handleUpload"
          type="submit"
        >
          Upload
        </VButton>        
      </template>
    </VModal>

    <!-- 固件详情对话框 -->
    <VModal 
      :open="detailDialogOpen"
      title="Firmware Details"
      size="large"
      actions="right"
      cancelLabel="Close"
      @close="detailDialogOpen = false"
    >
      <template #content>
        <div v-if="selectedFirmware" class="firmware-details">
          <div class="columns">
            <div class="column is-6">
              <VField>
                <VLabel>Version</VLabel>
                <div class="content">
                  <strong>{{ selectedFirmware.version }}</strong>
                </div>
              </VField>
              
              <VField>
                <VLabel>Status</VLabel>
                <div class="content">
                  <VTag :color="statusColorMap[selectedFirmware.status]">
                    {{ statusTextMap[selectedFirmware.status] }}
                  </VTag>
                </div>
              </VField>
              
              <VField>
                <VLabel>File Size</VLabel>
                <div class="content">
                  {{ formatFileSize(selectedFirmware.file_size) }}
                </div>
              </VField>
            </div>
            
            <div class="column is-6">
              <VField>
                <VLabel>MD5 Checksum</VLabel>
                <div class="content">
                  <code>{{ selectedFirmware.checksum_md5 }}</code>
                </div>
              </VField>
              
              <VField>
                <VLabel>Uploader</VLabel>
                <div class="content">
                  {{ selectedFirmware.uploader?.username || 'Unknown' }}
                </div>
              </VField>
              
              <VField>
                <VLabel>Upload Time</VLabel>
                <div class="content">
                  <VDateTimeSplit :date-string="selectedFirmware.created_at" />
                </div>
              </VField>
            </div>
          </div>
          
          <VField>
            <VLabel>Compatible Device Models</VLabel>
            <div class="content">
              <div class="tags">
                <VTag 
                  v-for="model in selectedFirmware.compatible_models" 
                  :key="model.id"
                >
                  {{ model.stdname }} ({{ model.oemname }})
                </VTag>
              </div>
            </div>
          </VField>
          
          <VField v-if="selectedFirmware.release_notes">
            <VLabel>Release Notes</VLabel>
            <div class="content">
              <div class="box">
                <pre style="white-space: pre-wrap;">{{ selectedFirmware.release_notes }}</pre>
              </div>
            </div>
          </VField>
        </div>
      </template>
    </VModal>

    <!-- 兼容性管理对话框 -->
    <VModal 
      :open="compatibilityDialogOpen"
      title="Compatibility Management"
      size="medium"
      actions="right"
      @close="compatibilityDialogOpen = false"
    >
      <template #content>
        <div v-if="selectedFirmware">
          <div class="mb-4">
            <strong>Firmware Version:</strong> {{ selectedFirmware.version }}
            <br>
            <strong>Status:</strong> {{ statusTextMap[selectedFirmware.status] || selectedFirmware.status }}
          </div>
          
          <div v-if="selectedFirmware.status !== 'DRAFT'" class="notification is-warning">
            <iconify-icon icon="lucide:lock" class="mr-2" />
            Compatibility settings can only be modified for DRAFT firmware. This firmware is in {{ statusTextMap[selectedFirmware.status] || selectedFirmware.status }} status.
          </div>
          
          <div v-if="loadingCompatibility" class="loading-placeholder">
            <VPlaceload />
            <VPlaceloadText :lines="3" />
          </div>
          
          <div v-else>
            <VField>
              <VLabel>Compatible Device Models *</VLabel>
              <VControl>
                <VSelect 
                  v-model="compatibilityForm.device_model_ids"
                  placeholder="Select compatible device models"
                  multiple
                  required
                  :disabled="selectedFirmware.status !== 'DRAFT'"
                >
                  <VOption 
                    v-for="model in deviceModels" 
                    :key="model.id" 
                    :value="model.id"
                  >
                    {{ model.stdname }} ({{ model.oemname }})
                  </VOption>
                </VSelect>
              </VControl>
              <p class="help">
                <span v-if="selectedFirmware.status === 'DRAFT'">
                  Select device models that can use this firmware version. Devices can only upgrade to firmware compatible with their model.
                </span>
                <span v-else class="has-text-warning">
                  <iconify-icon icon="lucide:lock" class="mr-1" />
                  Compatibility settings are locked for {{ statusTextMap[selectedFirmware.status] || selectedFirmware.status }} firmware.
                </span>
              </p>
            </VField>
            
            <div v-if="compatibilityForm.device_model_ids.length > 0" class="compatibility-preview">
              <div class="subtitle">Selected Device Models:</div>
              <div class="tags">
                <VTag 
                  v-for="modelId in compatibilityForm.device_model_ids" 
                  :key="modelId"
                  color="primary"
                >
                  {{ deviceModels.find(m => m.id === modelId)?.stdname }}
                </VTag>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="primary"
          :loading="savingCompatibility"
          :disabled="loadingCompatibility || compatibilityForm.device_model_ids.length === 0 || selectedFirmware?.status !== 'DRAFT'"
          @click="saveCompatibility"
        >
          Save
        </VButton>
      </template>
    </VModal>

    <!-- Upload Success Dialog -->
    <VModal 
      :open="successDialogOpen"
      title="Upload Successful"
      size="small"
      actions="center"
      @close="handleUploadSuccess"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:check-circle" 
            class="has-text-success"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Firmware uploaded successfully!</h3>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="success"
          @click="handleUploadSuccess"
        >
          OK
        </VButton>
      </template>
    </VModal>

    <!-- Publish Confirmation Dialog -->
    <VModal 
      :open="publishConfirmOpen"
      title="Confirm Publish"
      size="small"
      actions="center"
      @close="handlePublishClose"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:upload" 
            class="has-text-primary"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Publish Firmware</h3>
          <p class="subtitle is-6" v-if="selectedFirmwareForPublish">
            Are you sure you want to publish firmware version <strong>{{ selectedFirmwareForPublish.version }}</strong>?
          </p>
          <p class="has-text-grey">
            Published firmware will be available for device updates.
          </p>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="primary"
          @click="confirmPublish"
        >
          Publish
        </VButton>
      </template>
    </VModal>

    <!-- Archive Confirmation Dialog -->
    <VModal 
      :open="archiveConfirmOpen"
      title="Confirm Archive"
      size="small"
      actions="center"
      @close="handleArchiveClose"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:archive" 
            class="has-text-warning"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Archive Firmware</h3>
          <p class="subtitle is-6" v-if="selectedFirmwareForArchive">
            Are you sure you want to archive firmware version <strong>{{ selectedFirmwareForArchive.version }}</strong>?
          </p>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="warning"
          @click="confirmArchive"
        >
          Archive
        </VButton>
      </template>
    </VModal>

    <!-- 测试设备管理对话框 -->
    <VModal 
      :open="testManageDialogOpen"
      title="Manage Test Devices"
      size="large"
      actions="right"
      cancelLabel="Close"
      @close="() => { testManageDialogOpen = false; stopTestDevicesPolling() }"
    >
      <template #content>
        <div v-if="selectedFirmwareForTest">
          <div class="mb-4">
            <strong>Firmware Version:</strong> {{ selectedFirmwareForTest.version }}
          </div>
          
          <div class="mb-4">
            <VButton color="primary" @click="openAddTestDevicesDialog">
              <iconify-icon icon="lucide:plus" class="mr-2" />
              Add Test Devices
            </VButton>
          </div>
          
          <div v-if="firmwareStore.testLoading" class="loading-placeholder">
            <VPlaceload />
            <VPlaceloadText :lines="4" />
          </div>
          
          <div v-else>
            <table class="table is-fullwidth" v-if="selectedFirmwareForTest && (firmwareStore.testDevices.get(selectedFirmwareForTest.id)?.length || 0) > 0">
              <thead>
                <tr>
                  <th>Device Serial</th>
                  <th>Device Name</th>
                  <th>Status</th>
                  <th>Test Started</th>
                  <th>Test Duration</th>
                  <th>Test Result</th>
                  <th>Added By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="testDevice in (selectedFirmwareForTest ? (firmwareStore.testDevices.get(selectedFirmwareForTest.id) || []) : [])" :key="testDevice.device_serial">
                  <td>{{ testDevice.device_serial }}</td>
                  <td>{{ testDevice.device?.name || '-' }}</td>
                  <td>
                    <VTag :color="getStatusColor(testDevice.test_status) as VTagColor">
                      {{ getStatusDisplayText(testDevice.test_status) }}
                    </VTag>
                  </td>
                  <td>
                    <VDateTimeSplit v-if="testDevice.test_started_at" :date-string="testDevice.test_started_at" size="small" />
                    <span v-else>-</span>
                  </td>
                  <td>
                    <span v-if="testDevice.test_started_at">
                      {{ calculateTestDuration(testDevice.test_started_at, testDevice.test_completed_at) }}
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td>
                    <span v-if="testDevice.test_result">
                      {{ testDevice.test_result.message || '-' }}
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td>{{ testDevice.addedBy?.username || '-' }}</td>
                  <td>
                    <VButton 
                      v-if="testDevice.test_status === 'pending'"
                      color="danger" 
                      size="medium"
                      @click="removeTestDevice(testDevice.device_serial)"
                    >
                      Remove
                    </VButton>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <VPlaceholderSection
              v-else
              title="No Test Devices"
              subtitle="Add devices to test this firmware version"
              class="my-6"
            />
          </div>
        </div>
      </template>
    </VModal>

    <!-- 添加测试设备对话框 -->
    <VModal 
      :open="addTestDevicesDialogOpen"
      title="Add Test Devices"
      size="medium"
      actions="right"
      @close="addTestDevicesDialogOpen = false"
    >
      <template #content>
        <VField>
          <VLabel>Device Serial Numbers</VLabel>
          <VControl>
            <VTextarea 
              v-model="testDeviceSerials"
              placeholder="Enter device serial numbers, one per line"
              rows="6"
            />
          </VControl>
          <p class="help">Enter one device serial per line. Only online devices can be added for testing.</p>
        </VField>
      </template>
      
      <template #action>
        <VButton 
          color="primary"
          :loading="firmwareStore.testLoading"
          @click="addTestDevices"
        >
          Add Devices
        </VButton>
      </template>
    </VModal>

    <!-- 测试进度对话框 -->
    <VModal 
      :open="testProgressDialogOpen"
      title="Test Progress"
      size="medium"
      actions="right"
      cancelLabel="Close"
      @close="() => { testProgressDialogOpen = false; stopTestProgressPolling() }"
    >
      <template #content>
        <div v-if="selectedFirmwareForTest">
          <div class="mb-4">
            <strong>Firmware Version:</strong> {{ selectedFirmwareForTest.version }}
          </div>
          
          <div v-if="currentTestProgress && currentTestProgress.total > 0" class="test-progress">
            <div class="progress-stats">
              <div class="columns is-multiline">
                <div class="column is-6">
                  <div class="stat-item">
                    <span class="label">Total Devices:</span>
                    <span class="value">{{ currentTestProgress.total }}</span>
                  </div>
                </div>
                <div class="column is-6">
                  <div class="stat-item">
                    <span class="label">In Progress:</span>
                    <span class="value">{{ currentTestProgress.inProgress }}</span>
                  </div>
                </div>
                <div class="column is-6">
                  <div class="stat-item">
                    <span class="label">Success:</span>
                    <span class="value has-text-success">{{ currentTestProgress.success }}</span>
                  </div>
                </div>
                <div class="column is-6">
                  <div class="stat-item">
                    <span class="label">Failed:</span>
                    <span class="value has-text-danger">{{ currentTestProgress.failed }}</span>
                  </div>
                </div>
              </div>
              
              <div class="progress-bar">
                <progress 
                  class="progress is-primary" 
                  :value="currentTestProgress.completed" 
                  :max="currentTestProgress.total"
                >
                  {{ Math.round((currentTestProgress.completed / Math.max(currentTestProgress.total, 1)) * 100) }}%
                </progress>
              </div>
              
              <div class="success-rate" v-if="currentTestProgress && currentTestProgress.completed > 0">
                <strong>Success Rate:</strong> {{ Number(currentTestProgress.successRate || 0).toFixed(1) }}%
              </div>
              
              <!-- 详细状态分解 -->
              <div class="status-breakdown mt-4" v-if="currentTestProgress.total > 0">
                <h6 class="subtitle is-6 mb-3">Status Breakdown:</h6>
                <div class="columns is-multiline">
                  <div class="column is-4" v-if="currentTestProgress.pending > 0">
                    <div class="stat-item small">
                      <span class="label">
                        <VTag color="light" size="tiny">Pending</VTag>
                      </span>
                      <span class="value">{{ currentTestProgress.pending }}</span>
                    </div>
                  </div>
                  <div class="column is-4" v-if="currentTestProgress.downloading > 0">
                    <div class="stat-item small">
                      <span class="label">
                        <VTag color="primary" size="tiny">Downloading</VTag>
                      </span>
                      <span class="value">{{ currentTestProgress.downloading }}</span>
                    </div>
                  </div>
                  <div class="column is-4" v-if="currentTestProgress.installing > 0">
                    <div class="stat-item small">
                      <span class="label">
                        <VTag color="primary" size="tiny">Installing</VTag>
                      </span>
                      <span class="value">{{ currentTestProgress.installing }}</span>
                    </div>
                  </div>
                  <div class="column is-4" v-if="currentTestProgress.testing > 0">
                    <div class="stat-item small">
                      <span class="label">
                        <VTag color="info" size="tiny">Testing</VTag>
                      </span>
                      <span class="value">{{ currentTestProgress.testing }}</span>
                    </div>
                  </div>
                  <div class="column is-4" v-if="currentTestProgress && 'verifying' in currentTestProgress && currentTestProgress.verifying > 0">
                    <div class="stat-item small">
                      <span class="label">
                        <VTag color="warning" size="tiny">Verifying</VTag>
                      </span>
                      <span class="value">{{ 'verifying' in currentTestProgress ? currentTestProgress.verifying : 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else>
            <VPlaceholderSection
              title="No Test Data"
              subtitle="Test progress will appear here once testing begins"
              class="my-6"
            />
          </div>
        </div>
      </template>
    </VModal>

    <!-- 开始测试确认对话框 -->
    <VModal 
      :open="startTestConfirmOpen"
      title="Start Testing"
      size="small"
      actions="center"
      @close="startTestConfirmOpen = false"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:play-circle" 
            class="has-text-info"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Start Firmware Testing</h3>
          <p class="subtitle is-6" v-if="selectedFirmwareForTest">
            Start testing firmware version <strong>{{ selectedFirmwareForTest.version }}</strong>?
          </p>
          <p class="has-text-grey">
            Only test devices will be able to access this firmware version.
          </p>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="info"
          @click="startTesting"
        >
          Start Testing
        </VButton>
      </template>
    </VModal>

    <!-- 完成测试确认对话框 -->
    <VModal 
      :open="finishTestConfirmOpen"
      title="Finish Testing"
      size="small"
      actions="center"
      @close="finishTestConfirmOpen = false"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:check-circle" 
            class="has-text-success"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Finish Testing and Publish</h3>
          <p class="subtitle is-6" v-if="selectedFirmwareForTest">
            Finish testing and publish firmware version <strong>{{ selectedFirmwareForTest.version }}</strong>?
          </p>
          <div v-if="selectedFirmwareForTest && firmwareStore.testProgress.get(selectedFirmwareForTest.id)?.inProgress && firmwareStore.testProgress.get(selectedFirmwareForTest.id)!.inProgress > 0" class="notification is-warning">
            <p><strong>Warning:</strong> There are still {{ selectedFirmwareForTest ? firmwareStore.testProgress.get(selectedFirmwareForTest.id)?.inProgress : 0 }} devices in testing.</p>
          </div>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="success"
          @click="finishTesting(false)"
        >
          Finish Testing
        </VButton>
        <VButton 
          v-if="selectedFirmwareForTest && firmwareStore.testProgress.get(selectedFirmwareForTest.id)?.inProgress && firmwareStore.testProgress.get(selectedFirmwareForTest.id)!.inProgress > 0"
          color="warning"
          @click="finishTesting(true)"
        >
          Force Finish
        </VButton>
      </template>
    </VModal>

    <!-- Delete Firmware Confirmation Modal -->
    <VModal
      :open="deleteConfirmOpen"
      title="Confirm Delete"
      size="small"
      actions="center"
      @close="() => { deleteConfirmOpen = false; selectedFirmwareForDelete = null }"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:trash-2" 
            class="has-text-danger"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Delete Firmware</h3>
          <p class="subtitle is-6" v-if="selectedFirmwareForDelete">
            Are you sure you want to delete firmware version <strong>{{ selectedFirmwareForDelete.version }}</strong>?
          </p>
          <p class="has-text-grey">
            This action cannot be undone.
          </p>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="danger"
          @click="confirmDeleteFirmware"
        >
          Delete Firmware
        </VButton>
      </template>
    </VModal>

    <!-- Remove Test Device Confirmation Modal -->
    <VModal
      :open="removeTestDeviceConfirmOpen"
      title="Remove Test Device"
      size="small"
      actions="center"
      @close="() => { removeTestDeviceConfirmOpen = false; selectedDeviceSerialForRemove = '' }"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:user-x" 
            class="has-text-warning"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Remove Test Device</h3>
          <p class="subtitle is-6" v-if="selectedDeviceSerialForRemove">
            Are you sure you want to remove test device <strong>{{ selectedDeviceSerialForRemove }}</strong>?
          </p>
          <p class="has-text-grey">
            This device will no longer participate in firmware testing.
          </p>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="warning"
          @click="confirmRemoveTestDevice"
        >
          Remove Device
        </VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
:deep(.field.is-grouped) {
  flex-wrap: wrap;
  gap: 0.5rem;
}

.table-container {
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table {
  margin-bottom: 0;
}

.table th {
  background-color: var(--fade-grey-light-2);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--dark-text);
  border-bottom: 2px solid var(--fade-grey-light-6);
}

.table td {
  vertical-align: middle;
  padding: 1rem 0.75rem;
}

.firmware-details .content {
  margin-bottom: 1rem;
}

.firmware-details .box {
  background-color: var(--fade-grey-light-2);
  border: 1px solid var(--fade-grey-light-6);
  border-radius: 6px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tags .tag {
  margin-right: 0 !important;
  margin-bottom: 0.25rem;
}

/* 文件上传区域样式 */
.file-upload-area {
  border: 2px dashed var(--fade-grey-light-6);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-upload-area:hover {
  border-color: var(--primary);
  background-color: var(--fade-grey-light-2);
}

.file-upload-area.has-file {
  border-color: var(--success);
  background-color: var(--success-light);
}



/* 状态标签样式增强 */
.status-tag {
  font-weight: 600;
  font-size: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-radius: 16px;
}

/* 操作按钮组 */
.table-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* 兼容设备标签样式 */
.compatibility-tags {
  max-width: 200px;
}

.compatibility-tags .tag {
  font-size: 0.7rem;
  height: auto;
  padding: 0.25rem 0.5rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .firmware-management {
    padding: 1rem;
  }
  
  .table-container {
    font-size: 0.875rem;
  }
  
  .table td {
    padding: 0.75rem 0.5rem;
  }
  
  .compatibility-tags {
    max-width: 150px;
  }
}

/* 加载状态优化 */
.loading-overlay {
  position: relative;
}

.loading-overlay::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
  z-index: 10;
}

/* 空状态样式 */
.empty-state {
  padding: 4rem 2rem;
  text-align: center;
}

.empty-state .title {
  color: var(--light-text);
  margin-bottom: 0.5rem;
}

.empty-state .subtitle {
  color: var(--light-text-light);
}

/* 模态框内容区域 */
.modal-form-section {
  margin-bottom: 1.5rem;
}

.modal-form-section:last-child {
  margin-bottom: 0;
}

/* 文件信息显示 */
.file-info {
  background: var(--fade-grey-light-2);
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid var(--primary);
}

.file-info .title {
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.file-info .subtitle {
  font-size: 0.8rem;
  color: var(--light-text);
}

/* 进度条样式 */
.upload-progress {
  margin-top: 1rem;
}

.upload-progress .progress {
  height: 8px;
  border-radius: 4px;
}

/* 兼容性选择器增强 */
.compatibility-selector {
  margin-top: 1rem;
}

.compatibility-preview {
  background: var(--fade-grey-light-2);
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.compatibility-preview .subtitle {
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: var(--dark-text);
}

/* 测试相关样式 */
.test-progress {
  padding: 1rem;
}

.progress-stats {
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--fade-grey-light-6);
}

.stat-item .label {
  font-weight: 600;
  color: var(--dark-text);
}

.stat-item .value {
  font-size: 1.1rem;
  font-weight: 700;
}

.progress-bar {
  margin: 1.5rem 0;
}

.progress-bar .progress {
  height: 20px;
}

.success-rate {
  text-align: center;
  font-size: 1.1rem;
  color: var(--dark-text);
}

.test-device-table {
  margin-top: 1rem;
}

.test-device-table .tag {
  font-weight: 600;
}

</style>