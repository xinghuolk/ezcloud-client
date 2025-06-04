<template>
  <div class="model-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>设备型号管理</h3>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增型号
          </el-button>
        </div>
      </template>
      
      <!-- 搜索筛选区域 -->
      <div class="search-bar">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-input
              v-model="searchForm.search"
              placeholder="搜索型号名称、厂商、描述"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="4">
            <el-input
              v-model="searchForm.oemname"
              placeholder="厂商名称"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
          </el-col>
          <el-col :span="4">
            <el-select
              v-model="searchForm.devtype"
              placeholder="设备类型"
              clearable
              @change="handleSearch"
            >
              <el-option
                v-for="item in DEVICE_TYPES"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select
              v-model="searchForm.is_active"
              placeholder="状态"
              clearable
              @change="handleSearch"
            >
              <el-option label="启用" :value="true" />
              <el-option label="禁用" :value="false" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="models"
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="ID" width="80" sortable="custom" />
        <el-table-column prop="oemname" label="厂商名称" min-width="120" />
        <el-table-column prop="stdname" label="标准型号名" min-width="150" />
        <el-table-column prop="devtype" label="设备类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getDeviceTypeTagType(row.devtype)">
              {{ getDeviceTypeLabel(row.devtype) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="serialNumberCount" label="序列号数量" width="120" align="center">
          <template #default="{ row }">
            <el-link type="primary" @click="viewSerials(row)">
              {{ row.serialNumberCount || 0 }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleView(row)">详情</el-button>
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="厂商名称" prop="oemname">
          <el-input v-model="form.oemname" placeholder="请输入厂商名称，如：华为、小米" />
        </el-form-item>
        <el-form-item label="标准型号名" prop="stdname">
          <el-input v-model="form.stdname" placeholder="请输入标准型号名，如：HG8045Q、AX6000" />
        </el-form-item>
        <el-form-item label="设备类型" prop="devtype">
          <el-select v-model="form.devtype" placeholder="请选择设备类型" style="width: 100%">
            <el-option
              v-for="item in DEVICE_TYPES"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入型号描述信息"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="状态" prop="is_active">
          <el-radio-group v-model="form.is_active">
            <el-radio :value="true">启用</el-radio>
            <el-radio :value="false">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingId ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="型号详情"
      width="800px"
    >
      <div v-if="currentModel" class="model-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentModel.id }}</el-descriptions-item>
          <el-descriptions-item label="厂商名称">{{ currentModel.oemname }}</el-descriptions-item>
          <el-descriptions-item label="标准型号名">{{ currentModel.stdname }}</el-descriptions-item>
          <el-descriptions-item label="设备类型">
            <el-tag :type="getDeviceTypeTagType(currentModel.devtype)">
              {{ getDeviceTypeLabel(currentModel.devtype) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentModel.is_active ? 'success' : 'danger'">
              {{ currentModel.is_active ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="序列号数量">
            {{ currentModel.serialNumberCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" span="2">
            {{ formatDateTime(currentModel.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" span="2">
            {{ formatDateTime(currentModel.updated_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" span="2">
            {{ currentModel.description || '暂无描述' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useModelsStore } from '@/stores/models'
import { DEVICE_TYPES, getDeviceTypeLabel, type DeviceModel, type ModelCreateParams } from '@/api/models'
import { formatDateTime } from '@/utils/date'

// Store
const modelsStore = useModelsStore()

// 响应式数据
const searchForm = reactive({
  search: '',
  oemname: '',
  devtype: '',
  is_active: undefined as boolean | undefined
})

const form = reactive<ModelCreateParams>({
  oemname: '',
  stdname: '',
  devtype: '',
  description: '',
  is_active: true
})

const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const currentModel = ref<DeviceModel | null>(null)
const formRef = ref<FormInstance>()

// 计算属性
const { models, loading, pagination } = modelsStore
const dialogTitle = computed(() => editingId.value ? '编辑型号' : '新增型号')

// 表单验证规则
const rules = {
  oemname: [
    { required: true, message: '请输入厂商名称', trigger: 'blur' },
    { max: 100, message: '厂商名称长度不能超过100字符', trigger: 'blur' }
  ],
  stdname: [
    { required: true, message: '请输入标准型号名', trigger: 'blur' },
    { max: 100, message: '标准型号名长度不能超过100字符', trigger: 'blur' }
  ],
  devtype: [
    { required: true, message: '请选择设备类型', trigger: 'change' }
  ],
  description: [
    { max: 1000, message: '描述长度不能超过1000字符', trigger: 'blur' }
  ]
}

// 获取设备类型标签样式
const getDeviceTypeTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    'router': 'primary',
    'gateway': 'success',
    'switch': 'warning',
    'modem': 'info',
    'camera': 'danger',
    'sensor': 'primary',
    'controller': 'warning'
  }
  return typeMap[type] || ''
}

// 事件处理函数
const handleAdd = () => {
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: DeviceModel) => {
  editingId.value = row.id
  Object.assign(form, {
    oemname: row.oemname,
    stdname: row.stdname,
    devtype: row.devtype,
    description: row.description || '',
    is_active: row.is_active
  })
  dialogVisible.value = true
}

const handleView = (row: DeviceModel) => {
  currentModel.value = row
  detailDialogVisible.value = true
}

const handleDelete = async (row: DeviceModel) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除型号"${row.oemname} ${row.stdname}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await modelsStore.deleteModel(row.id)
  } catch (error) {
    // 用户取消删除
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const success = editingId.value
      ? await modelsStore.updateModel(editingId.value, form)
      : await modelsStore.createModel(form)
    
    if (success) {
      dialogVisible.value = false
      resetForm()
    }
  } finally {
    submitting.value = false
  }
}

const handleSearch = () => {
  modelsStore.searchModels(searchForm)
}

const handleReset = () => {
  Object.assign(searchForm, {
    search: '',
    oemname: '',
    devtype: '',
    is_active: undefined
  })
  modelsStore.resetSearch()
}

const handleSizeChange = (size: number) => {
  modelsStore.changePageAndSize(1, size)
}

const handleCurrentChange = (page: number) => {
  modelsStore.changePageAndSize(page)
}

const handleSortChange = (sort: any) => {
  // TODO: 实现排序功能
  console.log('排序:', sort)
}

const viewSerials = (row: DeviceModel) => {
  // TODO: 跳转到序列号管理页面
  console.log('查看序列号:', row)
  ElMessage.info('序列号管理功能正在开发中')
}

const resetForm = () => {
  Object.assign(form, {
    oemname: '',
    stdname: '',
    devtype: '',
    description: '',
    is_active: true
  })
  formRef.value?.clearValidate()
}

// 生命周期
onMounted(() => {
  modelsStore.fetchModels()
})
</script>

<style scoped>
.model-list {
  padding: 20px;
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

.search-bar {
  margin-bottom: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.model-detail {
  padding: 20px 0;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
}
</style> 