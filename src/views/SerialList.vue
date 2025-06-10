<template>
  <div class="serial-list">
    <!-- 页面头部 -->
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <h3>Serial Number Management</h3>
          <div class="header-actions">
            <el-button type="primary" @click="handleGenerate" :loading="serialsStore.generating">
              <el-icon><Setting /></el-icon>
              Batch Generate
            </el-button>
            <el-button @click="handleRefresh" :loading="serialsStore.loading">
              <el-icon><Refresh /></el-icon>
              Refresh
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 统计信息 -->
      <div class="stats-row">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="Total Serials" :value="serialsStore.totalSerials" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="Unused" :value="serialsStore.unusedCount" value-style="color: #67C23A" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="Bound" :value="serialsStore.boundCount" value-style="color: #E6A23C" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="Activated" :value="serialsStore.activatedCount" value-style="color: #409EFF" />
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 主要内容区域 -->
    <el-row :gutter="20" class="main-content">
      <!-- 左侧批次列表 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="section-header">
              <h4>Batch List</h4>
              <el-button size="small" @click="refreshBatches">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="batch-list" v-loading="serialsStore.loading">
            <div
              v-for="batch in serialsStore.batches"
              :key="batch.batch_id"
              class="batch-item"
              :class="{ active: serialsStore.currentBatch === batch.batch_id }"
              @click="selectBatch(batch.batch_id)"
            >
              <div class="batch-header">
                <span class="batch-id">{{ batch.batch_id }}</span>
                <el-dropdown @command="handleBatchAction">
                  <el-button size="small" type="text">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="{ action: 'export', batchId: batch.batch_id }">
                        <el-icon><Download /></el-icon>
                        Export Excel
                      </el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'delete', batchId: batch.batch_id }" divided>
                        <el-icon><Delete /></el-icon>
                        Delete Batch
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              <div class="batch-info">
                <div class="model-info">
                  {{ batch.deviceModel?.oemname }} {{ batch.deviceModel?.stdname }}
                </div>
                <div class="batch-stats">
                  <el-tag size="small" type="info">Total: {{ batch.total_count }}</el-tag>
                  <el-tag size="small" type="success">Unused: {{ batch.unused_count }}</el-tag>
                  <el-tag size="small" type="warning">Bound: {{ batch.bound_count }}</el-tag>
                </div>
                <div class="created-time">
                  {{ formatDateTime(batch.created_at) }}
                </div>
              </div>
            </div>
            
            <!-- 批次分页 -->
            <div class="batch-pagination" v-if="serialsStore.batchPagination.totalPages > 1">
              <el-pagination
                small
                layout="prev, pager, next"
                :total="serialsStore.batchPagination.total"
                :page-size="serialsStore.batchPagination.limit"
                :current-page="serialsStore.batchPagination.page"
                @current-change="changeBatchPage"
              />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧序列号列表 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="section-header">
              <h4>Serial Numbers</h4>
              <div class="filter-actions">
                <el-button 
                  v-if="serialsStore.currentBatch" 
                  size="small" 
                  @click="exportCurrentBatch"
                  :loading="exporting"
                >
                  <el-icon><Download /></el-icon>
                  Export
                </el-button>
              </div>
            </div>
          </template>
          
          <!-- 筛选区域 -->
          <div class="filter-bar">
            <el-row :gutter="15">
              <el-col :span="8">
                <el-input
                  v-model="filters.search"
                  placeholder="Search serial, MAC address..."
                  clearable
                  @keyup.enter="applyFilters"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </el-col>
              <el-col :span="6">
                <el-select
                  v-model="filters.status"
                  placeholder="Status"
                  clearable
                  @change="applyFilters"
                >
                  <el-option label="Unused" value="unused" />
                  <el-option label="Bound" value="bound" />
                  <el-option label="Activated" value="activated" />
                </el-select>
              </el-col>
              <el-col :span="10">
                <el-button type="primary" @click="applyFilters">
                  <el-icon><Search /></el-icon>
                  Search
                </el-button>
                <el-button @click="resetFilters">
                  <el-icon><Refresh /></el-icon>
                  Reset
                </el-button>
              </el-col>
            </el-row>
          </div>

          <!-- 序列号表格 -->
          <el-table
            v-loading="serialsStore.loading"
            :data="serialsStore.serials"
            stripe
            height="400"
          >
            <el-table-column prop="serial" label="Serial Number" min-width="180">
              <template #default="{ row }">
                <el-text copyable>{{ row.serial }}</el-text>
              </template>
            </el-table-column>
            <el-table-column label="OEM Name" min-width="120">
              <template #default="{ row }">
                {{ row.deviceModel?.oemname || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="Standard Model" min-width="150">
              <template #default="{ row }">
                {{ row.deviceModel?.stdname || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="mac_start" label="MAC Start" width="140">
              <template #default="{ row }">
                <el-text copyable>{{ row.mac_start }}</el-text>
              </template>
            </el-table-column>
            <el-table-column prop="mac_count" label="MAC Count" width="100" align="center" />
            <el-table-column label="MAC Range" min-width="200">
              <template #default="{ row }">
                <el-text size="small">{{ getMacRange(row) }}</el-text>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="Status" width="100">
              <template #default="{ row }">
                <el-tag 
                  :type="getStatusTagType(row.status)" 
                  size="small"
                >
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="Created" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              layout="total, sizes, prev, pager, next, jumper"
              :total="serialsStore.pagination.total"
              :page-size="serialsStore.pagination.limit"
              :current-page="serialsStore.pagination.page"
              :page-sizes="[20, 50, 100, 200]"
              @size-change="changePage"
              @current-change="changePage"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 生成序列号对话框 -->
    <el-dialog
      v-model="generateDialogVisible"
      title="Batch Generate Serial Numbers"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="generateFormRef"
        :model="generateForm"
        :rules="generateRules"
        label-width="150px"
      >
        <el-form-item label="Device Model" prop="model_id">
          <el-select
            v-model="generateForm.model_id"
            placeholder="Select device model"
            style="width: 100%"
            filterable
            @change="onModelChange"
          >
            <el-option
              v-for="model in models"
              :key="model.id"
              :label="`${model.oemname} ${model.stdname}`"
              :value="model.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Generate Count" prop="count">
          <el-input-number
            v-model="generateForm.count"
            :min="1"
            :max="10000"
            style="width: 100%"
          />
          <div class="form-help">
            <el-text size="small" type="info">Maximum 10,000 serial numbers per batch</el-text>
          </div>
        </el-form-item>

        <el-form-item label="Start MAC Address" prop="mac_start">
          <el-input
            v-model="generateForm.mac_start"
            placeholder="AA:BB:CC:DD:EE:FF"
            @blur="validateMacAddress"
          />
          <div class="form-help">
            <el-text size="small" type="info">Format: XX:XX:XX:XX:XX:XX</el-text>
          </div>
        </el-form-item>

        <el-form-item label="MAC Count" prop="mac_count">
          <el-input-number
            v-model="generateForm.mac_count"
            :min="1"
            :max="8"
            style="width: 100%"
          />
          <div class="form-help">
            <el-text size="small" type="info">Number of MAC addresses per device (1-8)</el-text>
          </div>
        </el-form-item>

        <el-form-item label="MAC Interval" prop="mac_interval">
          <el-input-number
            v-model="generateForm.mac_interval"
            :min="1"
            :max="10"
            style="width: 100%"
          />
          <div class="form-help">
            <el-text size="small" type="info">Interval between MAC addresses</el-text>
          </div>
        </el-form-item>

        <!-- MAC地址范围预览 -->
        <el-form-item label="Preview" v-if="macPreview">
          <div class="mac-preview">
            <el-text size="small">
              Total MAC addresses needed: {{ macPreview.totalMacs }}<br>
              MAC range: {{ macPreview.startMac }} ~ {{ macPreview.endMac }}
            </el-text>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="generateDialogVisible = false">Cancel</el-button>
          <el-button 
            type="primary" 
            @click="submitGenerate"
            :loading="serialsStore.generating"
          >
            Generate
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { 
  Setting, 
  Refresh, 
  Search, 
  Download, 
  Delete, 
  MoreFilled 
} from '@element-plus/icons-vue'
import { useSerialsStore } from '@/stores/serials'
import { useModelsStore } from '@/stores/models'
import { type SerialGenerateRequest } from '@/api/serials'
import { formatDateTime } from '@/utils/date'

// Stores
const serialsStore = useSerialsStore()
const modelsStore = useModelsStore()

// 响应式数据
const generateDialogVisible = ref(false)
const exporting = ref(false)
const generateFormRef = ref<FormInstance>()

// 筛选表单
const filters = reactive({
  search: '',
  status: '',
  model_id: undefined as number | undefined
})

// 生成表单
const generateForm = reactive<SerialGenerateRequest>({
  model_id: 0,
  count: 100,
  mac_start: 'AA:BB:CC:DD:EE:00',
  mac_count: 4,
  mac_interval: 1
})

// 计算属性
const models = computed(() => modelsStore.models)

// MAC地址预览
const macPreview = computed(() => {
  if (!generateForm.count || !generateForm.mac_start || !generateForm.mac_count) {
    return null
  }

  const totalMacs = generateForm.count * generateForm.mac_count * (generateForm.mac_interval || 1)
  const startMac = generateForm.mac_start
  const endMac = calculateEndMac(startMac, totalMacs - 1)

  return {
    totalMacs,
    startMac,
    endMac
  }
})

// 表单验证规则
const generateRules = {
  model_id: [
    { required: true, message: 'Please select a device model', trigger: 'change' }
  ],
  count: [
    { required: true, message: 'Please enter the count', trigger: 'blur' },
    { type: 'number', min: 1, max: 10000, message: 'Count must be between 1 and 10000', trigger: 'blur' }
  ],
  mac_start: [
    { required: true, message: 'Please enter start MAC address', trigger: 'blur' },
    { pattern: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i, message: 'Invalid MAC address format', trigger: 'blur' }
  ],
  mac_count: [
    { required: true, message: 'Please select MAC count', trigger: 'change' },
    { type: 'number', min: 1, max: 8, message: 'MAC count must be between 1 and 8', trigger: 'change' }
  ],
  mac_interval: [
    { required: true, message: 'Please enter MAC interval', trigger: 'blur' },
    { type: 'number', min: 1, max: 10, message: 'MAC interval must be between 1 and 10', trigger: 'blur' }
  ]
}

// 工具函数
const calculateEndMac = (startMac: string, increment: number): string => {
  const hex = startMac.replace(/:/g, '')
  const num = parseInt(hex, 16) + increment
  const endHex = num.toString(16).toUpperCase().padStart(12, '0')
  return endHex.match(/.{2}/g)?.join(':') || startMac
}

const getMacRange = (serial: any): string => {
  const startMac = serial.mac_start
  const totalMacs = serial.mac_count * serial.mac_interval
  const endMac = calculateEndMac(startMac, totalMacs - 1)
  return `${startMac} ~ ${endMac}`
}

const getStatusTagType = (status: string): string => {
  const typeMap: Record<string, string> = {
    'unused': 'success',
    'bound': 'warning', 
    'activated': 'primary'
  }
  return typeMap[status] || ''
}

const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    'unused': 'Unused',
    'bound': 'Bound',
    'activated': 'Activated'
  }
  return labelMap[status] || status
}

// 事件处理函数
const handleGenerate = async () => {
  // 确保型号数据已加载
  if (models.value.length === 0) {
    await modelsStore.fetchModels()
  }
  generateDialogVisible.value = true
}

const handleRefresh = async () => {
  await Promise.all([
    serialsStore.fetchBatches(),
    serialsStore.fetchSerials()
  ])
}

const refreshBatches = async () => {
  await serialsStore.fetchBatches()
}

const selectBatch = async (batchId: string) => {
  await serialsStore.fetchBatchDetail(batchId)
}

const handleBatchAction = async (command: { action: string, batchId: string }) => {
  const { action, batchId } = command
  
  if (action === 'export') {
    await exportBatch(batchId)
  } else if (action === 'delete') {
    await deleteBatch(batchId)
  }
}

const exportBatch = async (batchId: string) => {
  try {
    exporting.value = true
    await serialsStore.exportSerials({ batch_id: batchId })
  } finally {
    exporting.value = false
  }
}

const exportCurrentBatch = async () => {
  if (serialsStore.currentBatch) {
    await exportBatch(serialsStore.currentBatch)
  }
}

const deleteBatch = async (batchId: string) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete batch ${batchId}? This operation cannot be undone.`,
      'Confirm Delete',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    await serialsStore.deleteBatch(batchId)
  } catch (error) {
    // 用户取消删除
  }
}

const applyFilters = async () => {
  await serialsStore.searchSerials(filters)
}

const resetFilters = async () => {
  Object.assign(filters, {
    search: '',
    status: '',
    model_id: undefined
  })
  await serialsStore.resetFilters()
}

const changePage = async (page: number, size?: number) => {
  await serialsStore.changePageAndSize(page, size)
}

const changeBatchPage = async (page: number) => {
  await serialsStore.changeBatchPage(page)
}

const onModelChange = (modelId: number) => {
  const selectedModel = models.value.find(m => m.id === modelId)
  if (selectedModel) {
    // 可以根据型号自动设置一些默认值
    console.log('Selected model:', selectedModel)
  }
}

const validateMacAddress = () => {
  const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i
  if (generateForm.mac_start && !macRegex.test(generateForm.mac_start)) {
    ElMessage.warning('Invalid MAC address format')
  }
}

const submitGenerate = async () => {
  if (!generateFormRef.value) return
  
  const valid = await generateFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    const result = await serialsStore.generateSerials(generateForm)
    if (result) {
      generateDialogVisible.value = false
      // 重置表单
      Object.assign(generateForm, {
        model_id: 0,
        count: 100,
        mac_start: 'AA:BB:CC:DD:EE:00',
        mac_count: 4,
        mac_interval: 1
      })
    }
  } catch (error) {
    // 错误已在store中处理
  }
}

// 生命周期
onMounted(async () => {
  await Promise.all([
    serialsStore.fetchBatches(),
    modelsStore.fetchModels()
  ])
})
</script>

<style scoped>
.serial-list {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-row {
  padding: 20px 0;
}

.main-content {
  min-height: 600px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h4 {
  margin: 0;
  color: #606266;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.filter-bar {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.batch-list {
  max-height: 600px;
  overflow-y: auto;
}

.batch-item {
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.batch-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.batch-item.active {
  border-color: #409eff;
  background-color: #e6f7ff;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.batch-id {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.batch-info {
  font-size: 12px;
}

.model-info {
  color: #606266;
  margin-bottom: 8px;
  font-weight: 500;
}

.batch-stats {
  margin-bottom: 8px;
}

.batch-stats .el-tag {
  margin-right: 8px;
}

.created-time {
  color: #909399;
}

.batch-pagination {
  margin-top: 15px;
  text-align: center;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.mac-preview {
  padding: 10px;
  background: #f0f9ff;
  border-radius: 4px;
  border: 1px solid #b3d8ff;
}

.form-help {
  margin-top: 4px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-statistic__content) {
  font-size: 24px;
}

:deep(.el-statistic__title) {
  font-size: 14px;
  color: #909399;
}
</style> 