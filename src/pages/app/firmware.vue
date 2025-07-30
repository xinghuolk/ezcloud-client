<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useFirmwareStore } from '/@src/stores/firmware'
import { modelApi } from '/@src/api'
import type { FirmwareVersion, FirmwareQuery, DeviceModel, CreateFirmwareParams } from '/@src/api/types'
import type { VTagColor } from '/@src/components/base/VTag.vue'
import { Notyf } from 'notyf'

definePage({
  meta: {
    requiresAuth: true,
    requiresAdmin: true
  }
})

const notyf = new Notyf()
const firmwareStore = useFirmwareStore()

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
  'PUBLISHED': 'success',
  'ARCHIVED': 'light'
}

const statusTextMap: Record<string, string> = {
  'DRAFT': 'Draft',
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
    uploadForm.file = target.files[0]
  }
}

// 上传固件
const handleUpload = async () => {
  try {
    if (!uploadForm.file) {
      notyf.error('Please select firmware file')
      return
    }
    
    if (!uploadForm.version.trim()) {
      notyf.error('Please enter version number')
      return
    }
    
    if (uploadForm.device_model_ids.length === 0) {
      notyf.error('Please select compatible device models')
      return
    }

    console.log('Uploading firmware:', {
      file: uploadForm.file.name,
      version: uploadForm.version,
      device_model_ids: uploadForm.device_model_ids
    })

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
    notyf.error('Upload failed. Please try again.')
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
    notyf.success('Firmware published successfully!')
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
    notyf.success('Firmware archived successfully!')
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
const deleteFirmware = async (firmware: FirmwareVersion) => {
  if (firmware.status !== 'DRAFT') {
    notyf.error('Only draft firmware can be deleted')
    return
  }
  
  if (!confirm(`Are you sure you want to delete firmware version ${firmware.version}?`)) {
    return
  }
  
  await firmwareStore.deleteFirmware(firmware.id)
}

// Handle upload success confirmation
const handleUploadSuccess = async () => {
  successDialogOpen.value = false
  // Refresh firmware list to show newly uploaded firmware
  await fetchFirmwareList()
  notyf.success('Firmware uploaded successfully, list updated!')
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
  compatibilityForm.device_model_ids = models.map(model => model.id)
  loadingCompatibility.value = false
}

// 保存兼容性设置
const saveCompatibility = async () => {
  if (!selectedFirmware.value) return
  
  savingCompatibility.value = true
  const success = await firmwareStore.setCompatibility(selectedFirmware.value.id, {
    device_model_ids: compatibilityForm.device_model_ids
  })
  
  if (success) {
    compatibilityDialogOpen.value = false
    // 刷新固件列表以显示更新的兼容性信息
    await fetchFirmwareList()
  }
  savingCompatibility.value = false
}

// 分页处理
const handlePageChange = (page: number) => {
  searchForm.page = page
  fetchFirmwareList()
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

// 初始化
onMounted(() => {
  fetchFirmwareList()
  fetchDeviceModels()
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
                  <VSelect v-model="wrapperState.limit" class="is-rounded">
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
                      v-for="model in firmware.compatibleModels?.slice(0, 2)" 
                      :key="model.id"
                      size="small"
                    >
                      {{ model.stdname }}
                    </VTag>
                    <VTag 
                      v-if="(firmware.compatibleModels?.length || 0) > 2"
                      size="small"
                      color="light"
                    >
                      +{{ (firmware.compatibleModels?.length || 0) - 2 }}
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
                {{ new Date(firmware.created_at).toLocaleDateString() }}
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
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="manageCompatibility(firmware)"
                    >
                      <iconify-icon icon="lucide:settings" class="mr-2" />
                      Compatibility Settings
                    </a>
                    <hr class="dropdown-divider" v-if="firmware.status !== 'ARCHIVED'">
                    <a 
                      v-if="firmware.status === 'DRAFT'"
                      href="#" 
                      class="dropdown-item"
                      @click.prevent="updateStatus(firmware, 'PUBLISHED')"
                    >
                      <iconify-icon icon="lucide:upload" class="mr-2" />
                      Publish
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
        v-if="firmwareStore.pagination.total > firmwareStore.pagination.limit"
        v-model:current-page="firmwareStore.pagination.page"
        :item-per-page="firmwareStore.pagination.limit"
        :total-items="firmwareStore.pagination.total"
        :max-links-displayed="7"
        no-router
        @update:current-page="handlePageChange"
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
                placeholder="e.g. EV6260, 1.0.1"
                required
              />
            </VControl>
            <p class="help">Enter firmware version number (e.g. EV6260, 1.0.1)</p>
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
        <VButton @click="uploadDialogOpen = false">
          Cancel
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
                  {{ new Date(selectedFirmware.created_at).toLocaleString() }}
                </div>
              </VField>
            </div>
          </div>
          
          <VField>
            <VLabel>Compatible Device Models</VLabel>
            <div class="content">
              <div class="tags">
                <VTag 
                  v-for="model in selectedFirmware.compatibleModels" 
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
          </div>
          
          <div v-if="loadingCompatibility" class="loading-placeholder">
            <VPlaceload />
            <VPlaceloadText lines="2" />
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
                Select device models that can use this firmware version. Devices can only upgrade to firmware compatible with their model.
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
          :disabled="loadingCompatibility || compatibilityForm.device_model_ids.length === 0"
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


</style>