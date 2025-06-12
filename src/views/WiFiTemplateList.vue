<template>
  <div class="wifi-template-container">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h2>WiFi Template Management</h2>
        <p class="page-description">Manage WiFi configuration templates for dual-band and 4 SSID setup</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog" :icon="Plus">
          Create Template
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-input
          v-model="searchKeyword"
          placeholder="Search templates..."
          :prefix-icon="Search"
          style="width: 300px"
          clearable
          @input="handleSearch"
        />
        <el-select
          v-model="statusFilter"
          placeholder="Status"
          style="width: 120px; margin-left: 12px"
          clearable
          @change="handleFilter"
        >
          <el-option label="Active" :value="true" />
          <el-option label="Inactive" :value="false" />
        </el-select>
      </div>
      <div class="filter-right">
        <el-button :icon="Refresh" @click="refreshData">Refresh</el-button>
      </div>
    </div>

    <!-- 模板列表表格 -->
    <div class="table-container">
      <el-table
        :data="templates"
        v-loading="loading"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="name" label="Template Name" min-width="150">
          <template #default="{ row }">
            <div class="template-name">
              <span class="name">{{ row.name }}</span>
              <el-tag v-if="!row.is_active" type="info" size="small">Inactive</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="Description" min-width="200" show-overflow-tooltip />

        <el-table-column label="2.4G Configuration" min-width="180">
          <template #default="{ row }">
            <div class="wifi-config">
              <div class="config-item">
                <span class="label">Main SSID:</span>
                <span class="value">{{ row.ssid_2g_main || 'Not set' }}</span>
              </div>
              <div class="config-item">
                <span class="label">Guest SSID:</span>
                <span class="value">{{ row.ssid_2g_guest || 'Not set' }}</span>
              </div>
              <div class="config-item">
                <span class="label">Channel:</span>
                <span class="value">{{ row.radio_2g_channel }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="5G Configuration" min-width="180">
          <template #default="{ row }">
            <div class="wifi-config">
              <div class="config-item">
                <span class="label">Main SSID:</span>
                <span class="value">{{ row.ssid_5g_main || 'Not set' }}</span>
              </div>
              <div class="config-item">
                <span class="label">Guest SSID:</span>
                <span class="value">{{ row.ssid_5g_guest || 'Not set' }}</span>
              </div>
              <div class="config-item">
                <span class="label">Channel:</span>
                <span class="value">{{ row.radio_5g_channel }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Usage" width="80" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small">{{ row.usage_count || 0 }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="Created" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="Actions" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="showEditDialog(row)"
              :icon="Edit"
            >
              Edit
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="confirmDelete(row)"
              :icon="Delete"
            >
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 创建/编辑模板对话框 -->
    <el-dialog
      :title="dialogMode === 'create' ? 'Create WiFi Template' : 'Edit WiFi Template'"
      v-model="dialogVisible"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateRules"
        label-width="140px"
        label-position="left"
      >
        <!-- 基本信息 -->
        <div class="form-section">
          <h4>Basic Information</h4>
          <el-form-item label="Template Name" prop="name">
            <el-input v-model="templateForm.name" placeholder="Enter template name" />
          </el-form-item>
          <el-form-item label="Description" prop="description">
            <el-input
              v-model="templateForm.description"
              type="textarea"
              :rows="2"
              placeholder="Enter template description"
            />
          </el-form-item>
          <el-form-item label="Country Code" prop="country">
            <el-select v-model="templateForm.country" placeholder="Select country">
              <el-option label="China (CN)" value="CN" />
              <el-option label="United States (US)" value="US" />
              <el-option label="European Union (EU)" value="EU" />
              <el-option label="Japan (JP)" value="JP" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 2.4G射频配置 -->
        <div class="form-section">
          <h4>2.4G Radio Configuration</h4>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="Channel" prop="radio_2g_channel">
                <el-select v-model="templateForm.radio_2g_channel">
                  <el-option label="Auto" value="auto" />
                  <el-option label="Channel 1" value="1" />
                  <el-option label="Channel 6" value="6" />
                  <el-option label="Channel 11" value="11" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="TX Power (%)" prop="radio_2g_txpower">
                <el-slider v-model="templateForm.radio_2g_txpower" :min="1" :max="100" show-input />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="HT Mode" prop="radio_2g_htmode">
                <el-select v-model="templateForm.radio_2g_htmode">
                  <el-option label="HT20" value="HT20" />
                  <el-option label="HT40" value="HT40" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item>
            <el-checkbox v-model="templateForm.radio_2g_enabled">Enable 2.4G Radio</el-checkbox>
          </el-form-item>
        </div>

        <!-- 5G射频配置 -->
        <div class="form-section">
          <h4>5G Radio Configuration</h4>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="Channel" prop="radio_5g_channel">
                <el-select v-model="templateForm.radio_5g_channel">
                  <el-option label="Auto" value="auto" />
                  <el-option label="Channel 36" value="36" />
                  <el-option label="Channel 40" value="40" />
                  <el-option label="Channel 44" value="44" />
                  <el-option label="Channel 149" value="149" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="TX Power (%)" prop="radio_5g_txpower">
                <el-slider v-model="templateForm.radio_5g_txpower" :min="1" :max="100" show-input />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="HT Mode" prop="radio_5g_htmode">
                <el-select v-model="templateForm.radio_5g_htmode">
                  <el-option label="VHT80" value="VHT80" />
                  <el-option label="VHT160" value="VHT160" />
                  <el-option label="HE80" value="HE80" />
                  <el-option label="HE160" value="HE160" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item>
            <el-checkbox v-model="templateForm.radio_5g_enabled">Enable 5G Radio</el-checkbox>
          </el-form-item>
        </div>

        <!-- 2.4G SSID配置 -->
        <div class="form-section">
          <h4>2.4G SSID Configuration</h4>
          
          <!-- 2.4G主网络 -->
          <div class="ssid-config">
            <h5>Main Network (default_ra0)</h5>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="SSID Name" prop="ssid_2g_main">
                  <el-input v-model="templateForm.ssid_2g_main" placeholder="Enter SSID name" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Password" prop="ssid_2g_main_password">
                  <el-input
                    v-model="templateForm.ssid_2g_main_password"
                    type="password"
                    placeholder="Enter password"
                    show-password
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="Encryption" prop="ssid_2g_main_encryption">
                  <el-select v-model="templateForm.ssid_2g_main_encryption">
                    <el-option label="None" value="none" />
                    <el-option label="WPA2" value="psk2" />
                    <el-option label="WPA3" value="psk3" />
                    <el-option label="WPA2+WPA3" value="psk2+psk3" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_2g_main_hidden">Hidden SSID</el-checkbox>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_2g_main_enabled">Enable SSID</el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 2.4G访客网络 -->
          <div class="ssid-config">
            <h5>Guest Network (guest_ra0)</h5>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="SSID Name" prop="ssid_2g_guest">
                  <el-input v-model="templateForm.ssid_2g_guest" placeholder="Enter guest SSID name" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Password" prop="ssid_2g_guest_password">
                  <el-input
                    v-model="templateForm.ssid_2g_guest_password"
                    type="password"
                    placeholder="Enter guest password"
                    show-password
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="6">
                <el-form-item label="Encryption" prop="ssid_2g_guest_encryption">
                  <el-select v-model="templateForm.ssid_2g_guest_encryption">
                    <el-option label="None" value="none" />
                    <el-option label="WPA2" value="psk2" />
                    <el-option label="WPA3" value="psk3" />
                    <el-option label="WPA2+WPA3" value="psk2+psk3" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_2g_guest_hidden">Hidden SSID</el-checkbox>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_2g_guest_enabled">Enable SSID</el-checkbox>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_2g_guest_isolate">Client Isolation</el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>

        <!-- 5G SSID配置 -->
        <div class="form-section">
          <h4>5G SSID Configuration</h4>
          
          <!-- 5G主网络 -->
          <div class="ssid-config">
            <h5>Main Network (default_rax0)</h5>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="SSID Name" prop="ssid_5g_main">
                  <el-input v-model="templateForm.ssid_5g_main" placeholder="Enter SSID name" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Password" prop="ssid_5g_main_password">
                  <el-input
                    v-model="templateForm.ssid_5g_main_password"
                    type="password"
                    placeholder="Enter password"
                    show-password
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="Encryption" prop="ssid_5g_main_encryption">
                  <el-select v-model="templateForm.ssid_5g_main_encryption">
                    <el-option label="None" value="none" />
                    <el-option label="WPA2" value="psk2" />
                    <el-option label="WPA3" value="psk3" />
                    <el-option label="WPA2+WPA3" value="psk2+psk3" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_5g_main_hidden">Hidden SSID</el-checkbox>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_5g_main_enabled">Enable SSID</el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <!-- 5G访客网络 -->
          <div class="ssid-config">
            <h5>Guest Network (guest_rax0)</h5>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="SSID Name" prop="ssid_5g_guest">
                  <el-input v-model="templateForm.ssid_5g_guest" placeholder="Enter guest SSID name" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Password" prop="ssid_5g_guest_password">
                  <el-input
                    v-model="templateForm.ssid_5g_guest_password"
                    type="password"
                    placeholder="Enter guest password"
                    show-password
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="6">
                <el-form-item label="Encryption" prop="ssid_5g_guest_encryption">
                  <el-select v-model="templateForm.ssid_5g_guest_encryption">
                    <el-option label="None" value="none" />
                    <el-option label="WPA2" value="psk2" />
                    <el-option label="WPA3" value="psk3" />
                    <el-option label="WPA2+WPA3" value="psk2+psk3" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_5g_guest_hidden">Hidden SSID</el-checkbox>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_5g_guest_enabled">Enable SSID</el-checkbox>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item>
                  <el-checkbox v-model="templateForm.ssid_5g_guest_isolate">Client Isolation</el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>

        <!-- 模板状态 -->
        <div class="form-section">
          <el-form-item>
            <el-checkbox v-model="templateForm.is_active">Enable Template</el-checkbox>
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ dialogMode === 'create' ? 'Create' : 'Update' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { wifiTemplateApi } from '@/api/wifi-templates'

// 响应式数据
const loading = ref(false)
const templates = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const statusFilter = ref<boolean | undefined>(undefined)
const selectedTemplates = ref([])

// 对话框相关
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const templateFormRef = ref<FormInstance>()

// 表单数据
const templateForm = reactive({
  id: null,
  name: '',
  description: '',
  radio_2g_channel: 'auto',
  radio_2g_txpower: 100,
  radio_2g_htmode: 'HT40',
  radio_2g_enabled: true,
  radio_5g_channel: 'auto',
  radio_5g_txpower: 100,
  radio_5g_htmode: 'VHT80',
  radio_5g_enabled: true,
  country: 'CN',
  ssid_2g_main: '',
  ssid_2g_main_password: '',
  ssid_2g_main_encryption: 'psk2+psk3',
  ssid_2g_main_hidden: false,
  ssid_2g_main_enabled: true,
  ssid_2g_guest: '',
  ssid_2g_guest_password: '',
  ssid_2g_guest_encryption: 'psk2+psk3',
  ssid_2g_guest_hidden: false,
  ssid_2g_guest_enabled: false,
  ssid_2g_guest_isolate: true,
  ssid_5g_main: '',
  ssid_5g_main_password: '',
  ssid_5g_main_encryption: 'psk2+psk3',
  ssid_5g_main_hidden: false,
  ssid_5g_main_enabled: true,
  ssid_5g_guest: '',
  ssid_5g_guest_password: '',
  ssid_5g_guest_encryption: 'psk2+psk3',
  ssid_5g_guest_hidden: false,
  ssid_5g_guest_enabled: false,
  ssid_5g_guest_isolate: true,
  is_active: true
})

// 表单验证规则
const templateRules: FormRules = {
  name: [
    { required: true, message: 'Please enter template name', trigger: 'blur' },
    { min: 2, max: 50, message: 'Length should be 2 to 50 characters', trigger: 'blur' }
  ],
  ssid_2g_main_password: [
    { min: 8, max: 63, message: 'Password length should be 8 to 63 characters', trigger: 'blur' }
  ],
  ssid_2g_guest_password: [
    { min: 8, max: 63, message: 'Password length should be 8 to 63 characters', trigger: 'blur' }
  ],
  ssid_5g_main_password: [
    { min: 8, max: 63, message: 'Password length should be 8 to 63 characters', trigger: 'blur' }
  ],
  ssid_5g_guest_password: [
    { min: 8, max: 63, message: 'Password length should be 8 to 63 characters', trigger: 'blur' }
  ]
}

// 方法
const loadTemplates = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchKeyword.value || undefined,
      is_active: statusFilter.value
    }
    
    const response = await wifiTemplateApi.getTemplates(params)
    if (response.success) {
      templates.value = response.data.templates
      total.value = response.data.total
    }
  } catch (error) {
    ElMessage.error('Failed to load WiFi templates')
    console.error('Load templates error:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadTemplates()
}

const handleFilter = () => {
  currentPage.value = 1
  loadTemplates()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  loadTemplates()
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  loadTemplates()
}

const handleSelectionChange = (selection: any[]) => {
  selectedTemplates.value = selection
}

const refreshData = () => {
  loadTemplates()
}

const showCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const showEditDialog = (template: any) => {
  dialogMode.value = 'edit'
  Object.assign(templateForm, template)
  dialogVisible.value = true
}

const resetForm = () => {
  Object.assign(templateForm, {
    id: null,
    name: '',
    description: '',
    radio_2g_channel: 'auto',
    radio_2g_txpower: 100,
    radio_2g_htmode: 'HT40',
    radio_2g_enabled: true,
    radio_5g_channel: 'auto',
    radio_5g_txpower: 100,
    radio_5g_htmode: 'VHT80',
    radio_5g_enabled: true,
    country: 'CN',
    ssid_2g_main: '',
    ssid_2g_main_password: '',
    ssid_2g_main_encryption: 'psk2+psk3',
    ssid_2g_main_hidden: false,
    ssid_2g_main_enabled: true,
    ssid_2g_guest: '',
    ssid_2g_guest_password: '',
    ssid_2g_guest_encryption: 'psk2+psk3',
    ssid_2g_guest_hidden: false,
    ssid_2g_guest_enabled: false,
    ssid_2g_guest_isolate: true,
    ssid_5g_main: '',
    ssid_5g_main_password: '',
    ssid_5g_main_encryption: 'psk2+psk3',
    ssid_5g_main_hidden: false,
    ssid_5g_main_enabled: true,
    ssid_5g_guest: '',
    ssid_5g_guest_password: '',
    ssid_5g_guest_encryption: 'psk2+psk3',
    ssid_5g_guest_hidden: false,
    ssid_5g_guest_enabled: false,
    ssid_5g_guest_isolate: true,
    is_active: true
  })
  templateFormRef.value?.clearValidate()
}

const handleSubmit = async () => {
  if (!templateFormRef.value) return
  
  try {
    await templateFormRef.value.validate()
    submitting.value = true
    
    if (dialogMode.value === 'create') {
      const response = await wifiTemplateApi.createTemplate(templateForm)
      if (response.success) {
        ElMessage.success('WiFi template created successfully')
        dialogVisible.value = false
        loadTemplates()
      }
    } else {
      const response = await wifiTemplateApi.updateTemplate(templateForm.id, templateForm)
      if (response.success) {
        ElMessage.success('WiFi template updated successfully')
        dialogVisible.value = false
        loadTemplates()
      }
    }
  } catch (error) {
    console.error('Submit error:', error)
  } finally {
    submitting.value = false
  }
}

const confirmDelete = (template: any) => {
  ElMessageBox.confirm(
    `Are you sure you want to delete template "${template.name}"?`,
    'Confirm Delete',
    {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await wifiTemplateApi.deleteTemplate(template.id)
      if (response.success) {
        ElMessage.success('WiFi template deleted successfully')
        loadTemplates()
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        ElMessage.error(error.response.data.message || 'Template is in use and cannot be deleted')
      } else {
        ElMessage.error('Failed to delete WiFi template')
      }
    }
  }).catch(() => {
    // 用户取消删除
  })
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

// 生命周期
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.wifi-template-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.filter-left {
  display: flex;
  align-items: center;
}

.table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.template-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-name .name {
  font-weight: 500;
}

.wifi-config {
  font-size: 12px;
}

.config-item {
  display: flex;
  margin-bottom: 4px;
}

.config-item .label {
  color: #909399;
  width: 80px;
  flex-shrink: 0;
}

.config-item .value {
  color: #303133;
  font-weight: 500;
}

.pagination-container {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.form-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.ssid-config {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.ssid-config h5 {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style> 