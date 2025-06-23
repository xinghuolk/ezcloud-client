<template>
  <div class="wifi-template-list">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1>WiFi Template Management</h1>
        <p>Manage WiFi configuration templates for tri-band multi-SSID devices</p>
      </div>
      <div class="header-right">
        <el-button 
          type="primary" 
          icon="Plus" 
          @click="showCreateDialog = true"
          v-if="userStore.isAdmin"
        >
          Create Template
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-input
          v-model="searchQuery"
          placeholder="Search templates..."
          prefix-icon="Search"
          style="width: 300px"
          clearable
          @input="handleSearch"
        />
        <el-select
          v-model="activeFilter"
          placeholder="Status"
          style="width: 120px; margin-left: 12px"
          @change="handleFilter"
        >
          <el-option label="All" value="" />
          <el-option label="Active" value="true" />
          <el-option label="Inactive" value="false" />
        </el-select>
      </div>
      <div class="filter-right">
        <el-button icon="Refresh" @click="loadTemplates">Refresh</el-button>
      </div>
    </div>

    <!-- 模板列表表格 -->
    <el-table
      :data="templates"
      v-loading="loading"
      stripe
      style="width: 100%"
      @sort-change="handleSortChange"
    >
      <el-table-column prop="name" label="Template Name" sortable min-width="200">
        <template #default="{ row }">
          <div class="template-name">
            <span class="name">{{ row.name }}</span>
            <el-tag 
              :type="row.is_active ? 'success' : 'info'" 
              size="small"
              style="margin-left: 8px"
            >
              {{ row.is_active ? 'Active' : 'Inactive' }}
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="description" label="Description" min-width="250">
        <template #default="{ row }">
          <span class="description">{{ row.description || 'No description' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="Radio Bands" min-width="150">
        <template #default="{ row }">
          <div class="radio-bands">
            <el-tag
              v-for="radio in row.radioConfigs"
              :key="radio.band"
              :type="getBandTagType(radio.band)"
              size="small"
              style="margin-right: 4px"
            >
              {{ radio.band }}
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="SSID Count" width="100" align="center">
        <template #default="{ row }">
          <el-badge :value="row.ssidConfigs?.length || 0" type="primary">
            <el-icon><Connection /></el-icon>
          </el-badge>
        </template>
      </el-table-column>

      <el-table-column prop="country" label="Country" width="80" align="center">
        <template #default="{ row }">
          <span class="country-code">{{ row.country }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="created_at" label="Created" width="120" sortable>
        <template #default="{ row }">
          <span class="date">{{ formatDate(row.created_at) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="Actions" width="200" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button 
              type="primary" 
              size="small" 
              icon="View"
              @click="viewTemplate(row)"
            >
              View
            </el-button>
            <el-button 
              type="warning" 
              size="small" 
              icon="Edit"
              @click="editTemplate(row)"
              v-if="userStore.isAdmin"
            >
              Edit
            </el-button>
            <el-dropdown 
              trigger="click"
              @command="handleCommand"
              v-if="userStore.isAdmin"
            >
              <el-button type="info" size="small" icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    :command="{ action: 'clone', template: row }"
                    icon="CopyDocument"
                  >
                    Clone
                  </el-dropdown-item>
                  <el-dropdown-item 
                    :command="{ action: 'toggle', template: row }"
                    :icon="row.is_active ? 'Hide' : 'View'"
                  >
                    {{ row.is_active ? 'Disable' : 'Enable' }}
                  </el-dropdown-item>
                  <el-dropdown-item 
                    :command="{ action: 'delete', template: row }"
                    icon="Delete"
                    divided
                  >
                    Delete
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        :hide-on-single-page="false"
        :disabled="loading"
      />
    </div>

    <!-- 创建/编辑模板对话框 -->
    <WiFiTemplateDialog
      v-model="showCreateDialog"
      :template="editingTemplate"
      @success="handleTemplateSuccess"
    />

    <!-- 模板详情对话框 -->
    <WiFiTemplateDetailDialog
      v-model="showDetailDialog"
      :template="viewingTemplate"
    />

    <!-- 克隆模板对话框 -->
    <WiFiTemplateCloneDialog
      v-model="showCloneDialog"
      :source-template="cloningTemplate"
      @success="handleCloneSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { wifiTemplateApi, type WiFiTemplate } from '@/api/wifi-templates'
import WiFiTemplateDialog from '@/components/WiFiTemplateDialog.vue'
import WiFiTemplateDetailDialog from '@/components/WiFiTemplateDetailDialog.vue'
import WiFiTemplateCloneDialog from '@/components/WiFiTemplateCloneDialog.vue'

// Store
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const templates = ref<WiFiTemplate[]>([])
const total = ref<number>(0)
const currentPage = ref<number>(1)
const pageSize = ref<number>(10)
const searchQuery = ref('')
const activeFilter = ref('')

// 对话框状态
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showCloneDialog = ref(false)
const editingTemplate = ref<WiFiTemplate | null>(null)
const viewingTemplate = ref<WiFiTemplate | null>(null)
const cloningTemplate = ref<WiFiTemplate | null>(null)

// 搜索防抖
let searchTimeout: number | null = null

// 请求去重
let loadingRequest: Promise<void> | null = null

// 计算属性
const getBandTagType = (band: string) => {
  const typeMap: Record<string, string> = {
    '2.4G': 'success',
    '5G': 'warning', 
    '6G': 'danger'
  }
  return typeMap[band] || 'info'
}

// 方法
const loadTemplates = async () => {
  // 如果已有请求在进行中，返回该请求
  if (loadingRequest) {
    return loadingRequest
  }

  loading.value = true
  
  loadingRequest = (async () => {
    try {
      const params: any = {
        page: currentPage.value,
        limit: pageSize.value
      }
      
      if (searchQuery.value) {
        params.search = searchQuery.value
      }
      
      if (activeFilter.value !== '') {
        params.is_active = activeFilter.value === 'true'
      }

      const response = await wifiTemplateApi.getTemplates(params)
      templates.value = response.data.templates
      total.value = Number(response.data.pagination.total) || 0
    } catch (error) {
      ElMessage.error('获取WiFi模版失败')
      console.error('Load templates error:', error)
    } finally {
      loading.value = false
      loadingRequest = null
    }
  })()

  return loadingRequest
}

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    // loadTemplates() 会通过 watcher 自动调用
  }, 500)
}

const handleFilter = () => {
  currentPage.value = 1
  // loadTemplates() 会通过 watcher 自动调用
}

// 监听分页参数变化
watch([currentPage, pageSize], () => {
  loadTemplates()
}, { deep: false })

const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  // 实现排序逻辑
  loadTemplates()
}

const viewTemplate = (template: WiFiTemplate) => {
  viewingTemplate.value = template
  showDetailDialog.value = true
}

const editTemplate = (template: WiFiTemplate) => {
  editingTemplate.value = { ...template }
  showCreateDialog.value = true
}

const handleCommand = ({ action, template }: { action: string; template: WiFiTemplate }) => {
  switch (action) {
    case 'clone':
      cloningTemplate.value = template
      showCloneDialog.value = true
      break
    case 'toggle':
      toggleTemplateStatus(template)
      break
    case 'delete':
      deleteTemplate(template)
      break
  }
}

const toggleTemplateStatus = async (template: WiFiTemplate) => {
  try {
    await wifiTemplateApi.toggleTemplate(template.id!)
    ElMessage.success(`Template ${template.is_active ? 'disabled' : 'enabled'} successfully`)
    // 直接更新本地状态，避免立即请求
    const index = templates.value.findIndex(t => t.id === template.id)
    if (index !== -1) {
      templates.value[index].is_active = !templates.value[index].is_active
    }
    // 延迟刷新完整数据
    setTimeout(() => {
      loadTemplates()
    }, 1000)
  } catch (error) {
    ElMessage.error('Failed to update template status')
    console.error('Toggle template error:', error)
  }
}

const deleteTemplate = async (template: WiFiTemplate) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete template "${template.name}"? This action cannot be undone.`,
      'Confirm Delete',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await wifiTemplateApi.deleteTemplate(template.id!)
    ElMessage.success('Template deleted successfully')
    loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Failed to delete template')
      console.error('Delete template error:', error)
    }
  }
}

const handleTemplateSuccess = () => {
  showCreateDialog.value = false
  editingTemplate.value = null
  // 延迟刷新，避免过度请求
  setTimeout(() => {
    loadTemplates()
  }, 500)
}

const handleCloneSuccess = () => {
  showCloneDialog.value = false
  cloningTemplate.value = null
  // 延迟刷新，避免过度请求
  setTimeout(() => {
    loadTemplates()
  }, 500)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString()
}

// 生命周期
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.wifi-template-list {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-left p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.filter-left {
  display: flex;
  align-items: center;
}

.template-name {
  display: flex;
  align-items: center;
}

.template-name .name {
  font-weight: 500;
  color: #303133;
}

.description {
  color: #606266;
  font-size: 13px;
}

.radio-bands {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.country-code {
  font-family: monospace;
  font-weight: 500;
}

.date {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .wifi-template-list {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-bar {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-left {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-left .el-input {
    width: 100% !important;
  }
}
</style> 