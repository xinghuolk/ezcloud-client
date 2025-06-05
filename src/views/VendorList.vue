<template>
  <div class="vendor-list-container">
    <!-- 页面标题和操作按钮 -->
    <div class="page-header">
      <div class="header-title">
        <h2>厂商管理</h2>
        <p class="subtitle">管理设备厂商信息，为设备型号提供分类基础</p>
      </div>
      <div class="header-actions">
        <el-button 
          v-if="isAdmin"
          type="primary" 
          icon="Plus" 
          @click="openCreateDialog"
        >
          新增厂商
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="厂商名称">
          <el-input
            v-model="searchForm.name"
            placeholder="搜索厂商名称"
            clearable
            style="width: 200px"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.is_active"
            placeholder="选择状态"
            clearable
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button icon="Refresh" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        v-loading="vendorStore.loading"
        :data="vendorStore.vendors"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="厂商名称" min-width="180">
          <template #default="{ row }">
            <div class="vendor-name">
              <el-text size="default" tag="strong">{{ row.name }}</el-text>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            <el-text 
              v-if="row.description" 
              size="small" 
              type="info" 
              class="description-text"
            >
              {{ row.description }}
            </el-text>
            <el-text v-else size="small" type="info">-</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="modelCount" label="型号数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.modelCount > 0" type="success">
              {{ row.modelCount }}
            </el-tag>
            <el-text v-else size="small" type="info">0</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            <el-text size="small" type="info">
              {{ formatDate(row.created_at) }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button
                size="small"
                type="primary"
                icon="View"
                @click="openDetailDialog(row)"
              >
                详情
              </el-button>
              <el-button
                v-if="isAdmin"
                size="small"
                type="warning"
                icon="Edit"
                @click="openEditDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                v-if="isAdmin"
                size="small"
                :type="row.is_active ? 'danger' : 'success'"
                @click="handleToggleStatus(row)"
              >
                {{ row.is_active ? '禁用' : '启用' }}
              </el-button>
              <el-button
                v-if="isAdmin"
                size="small"
                type="danger"
                icon="Delete"
                @click="handleDelete(row)"
                :disabled="row.modelCount > 0"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="vendorStore.pagination.page"
          v-model:page-size="vendorStore.pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="vendorStore.pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑厂商' : '新增厂商'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="厂商名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入厂商名称，如：华为技术有限公司"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="厂商描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入厂商描述信息（可选）"
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
      title="厂商详情"
      width="800px"
    >
      <div v-if="vendorStore.currentVendor" class="vendor-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="厂商ID">
            {{ vendorStore.currentVendor.id }}
          </el-descriptions-item>
          <el-descriptions-item label="厂商名称">
            <el-text size="default" tag="strong">
              {{ vendorStore.currentVendor.name }}
            </el-text>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="vendorStore.currentVendor.is_active ? 'success' : 'danger'">
              {{ vendorStore.currentVendor.is_active ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="型号数量">
            <el-tag type="info">
              {{ vendorStore.currentVendor.modelCount }} 个
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDateTime(vendorStore.currentVendor.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">
            {{ formatDateTime(vendorStore.currentVendor.updated_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="厂商描述" :span="2">
            <div v-if="vendorStore.currentVendor.description" class="description-content">
              {{ vendorStore.currentVendor.description }}
            </div>
            <el-text v-else type="info">暂无描述</el-text>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 关联设备型号列表 -->
        <div v-if="vendorStore.currentVendor.deviceModels && vendorStore.currentVendor.deviceModels.length > 0" class="related-models">
          <h4>关联设备型号 ({{ vendorStore.currentVendor.deviceModels.length }})</h4>
          <el-table :data="vendorStore.currentVendor.deviceModels" border>
            <el-table-column prop="oemname" label="厂商名称" />
            <el-table-column prop="stdname" label="型号名称" />
            <el-table-column prop="devtype" label="设备类型" />
            <el-table-column prop="is_active" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                  {{ row.is_active ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useVendorStore } from '@/stores/vendors'
import type { Vendor, VendorCreateRequest, VendorUpdateRequest } from '@/api/vendors'
import { formatDate, formatDateTime } from '@/utils/date'

// 状态管理
const vendorStore = useVendorStore()

// 响应式数据
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const selectedVendors = ref<Vendor[]>([])

// 搜索表单
const searchForm = reactive({
  name: '',
  is_active: undefined as boolean | undefined
})

// 厂商表单
const form = reactive<VendorCreateRequest & { id?: number }>({
  name: '',
  description: '',
  is_active: true
})

const formRef = ref<FormInstance>()

// 用户权限检查
const userInfo = computed(() => {
  const userInfoStr = localStorage.getItem('user_info')
  return userInfoStr ? JSON.parse(userInfoStr) : null
})

const isAdmin = computed(() => userInfo.value?.role === 'admin')

// 表单验证规则
const rules: FormRules = {
  name: [
    { required: true, message: '请输入厂商名称', trigger: 'blur' },
    { min: 1, max: 100, message: '厂商名称长度在1到100个字符', trigger: 'blur' }
  ],
  description: [
    { max: 1000, message: '描述长度不能超过1000个字符', trigger: 'blur' }
  ],
  is_active: [
    { required: true, message: '请选择厂商状态', trigger: 'change' }
  ]
}

// 生命周期
onMounted(() => {
  loadVendors()
})

// 方法
const loadVendors = async () => {
  try {
    await vendorStore.fetchVendors({
      page: vendorStore.pagination.page,
      limit: vendorStore.pagination.limit,
      ...searchForm
    })
  } catch (error) {
    console.error('加载厂商列表失败:', error)
  }
}

const handleSearch = async () => {
  try {
    await vendorStore.fetchVendors({
      page: 1,
      limit: vendorStore.pagination.limit,
      name: searchForm.name || undefined,
      is_active: searchForm.is_active
    })
  } catch (error) {
    console.error('搜索厂商失败:', error)
  }
}

const handleReset = async () => {
  searchForm.name = ''
  searchForm.is_active = undefined
  await loadVendors()
}

const handlePageChange = async (page: number) => {
  try {
    await vendorStore.changePage(page, {
      name: searchForm.name || undefined,
      is_active: searchForm.is_active
    })
  } catch (error) {
    console.error('切换页面失败:', error)
  }
}

const handleSizeChange = async (size: number) => {
  try {
    await vendorStore.changePageSize(size, {
      name: searchForm.name || undefined,
      is_active: searchForm.is_active
    })
  } catch (error) {
    console.error('切换每页大小失败:', error)
  }
}

const handleSelectionChange = (selection: Vendor[]) => {
  selectedVendors.value = selection
}

const openCreateDialog = () => {
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (vendor: Vendor) => {
  editingId.value = vendor.id
  form.name = vendor.name
  form.description = vendor.description || ''
  form.is_active = vendor.is_active
  dialogVisible.value = true
}

const openDetailDialog = async (vendor: Vendor) => {
  try {
    await vendorStore.fetchVendor(vendor.id)
    detailDialogVisible.value = true
  } catch (error) {
    console.error('获取厂商详情失败:', error)
  }
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.is_active = true
  formRef.value?.clearValidate()
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    submitting.value = true
    
    if (editingId.value) {
      // 更新厂商
      const vendorData: VendorUpdateRequest = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        is_active: form.is_active
      }
      await vendorStore.updateVendor(editingId.value, vendorData)
    } else {
      // 创建厂商
      const vendorData: VendorCreateRequest = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        is_active: form.is_active
      }
      await vendorStore.createVendor(vendorData)
    }
    
    dialogVisible.value = false
    resetForm()
  } catch (error) {
    console.error('提交厂商失败:', error)
  } finally {
    submitting.value = false
  }
}

const handleToggleStatus = async (vendor: Vendor) => {
  try {
    await vendorStore.toggleVendorStatus(vendor.id)
  } catch (error) {
    console.error('切换厂商状态失败:', error)
  }
}

const handleDelete = async (vendor: Vendor) => {
  try {
    await vendorStore.deleteVendor(vendor.id, vendor.name)
  } catch (error) {
    console.error('删除厂商失败:', error)
  }
}
</script>

<style scoped>
.vendor-list-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.header-title h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.search-form {
  margin: 0;
}

.table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.vendor-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.description-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-section {
  display: flex;
  justify-content: center;
  padding: 20px;
  border-top: 1px solid #ebeef5;
}

.vendor-detail {
  space-y: 20px;
}

.description-content {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
}

.related-models {
  margin-top: 24px;
}

.related-models h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .search-form {
    flex-direction: column;
  }

  .table-actions {
    flex-direction: column;
  }
}
</style> 