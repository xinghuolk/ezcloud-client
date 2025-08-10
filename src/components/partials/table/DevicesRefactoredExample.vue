<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { deviceApi, vendorApi, modelApi } from '/@src/api'
import VTableFilters from './VTableFilters.vue'
import { commonFilters, type FilterConfig } from '/@src/composables/useTableFilters'
import type { Device, Vendor, DeviceModel } from '/@src/api/types'
import { notyf } from '/@src/api/request'

/**
 * 这是设备页面的改造示例
 * 原来的 devices.vue 有大量手动的过滤器逻辑，现在简化为使用可重用组件
 */

// State
const loading = ref(false)
const devices = ref<Device[]>([])
const vendors = ref<Vendor[]>([])
const models = ref<DeviceModel[]>([])

// Pagination
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 定义过滤器配置 - 替换原来的手动过滤器实现
const deviceFilters: FilterConfig[] = [
  commonFilters.isOnline,  // 在线状态
  {
    key: 'vendor_id',
    type: 'select',
    label: '厂商',
    options: [] // 动态填充
  },
  {
    key: 'model_id',
    type: 'select', 
    label: '设备型号',
    options: [] // 动态填充
  }
]

// 当前过滤条件
const currentFilters = ref<Record<string, any>>({})

// Methods
const fetchDevices = async (filters: Record<string, any> = {}) => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    }

    const response = await deviceApi.getDevices(params)
    if (response.success) {
      devices.value = response.data.devices || []
      pagination.total = response.data.pagination?.total || 0
    } else {
      notyf.error(response.message || '获取设备列表失败')
    }
  } catch (error) {
    console.error('Error fetching devices:', error)
    notyf.error('获取设备列表失败')
  } finally {
    loading.value = false
  }
}

const fetchVendors = async () => {
  try {
    const response = await vendorApi.getAllVendors()
    if (response.success) {
      vendors.value = response.data
      
      // 动态更新过滤器选项
      const vendorFilter = deviceFilters.find(f => f.key === 'vendor_id')
      if (vendorFilter) {
        vendorFilter.options = [
          { label: '所有厂商', value: '' },
          ...vendors.value.map(vendor => ({
            label: vendor.name,
            value: vendor.id
          }))
        ]
      }
    }
  } catch (error) {
    console.error('Error fetching vendors:', error)
  }
}

const fetchModels = async () => {
  try {
    const response = await modelApi.getAllModels()
    if (response.success) {
      models.value = response.data
      
      // 动态更新过滤器选项
      const modelFilter = deviceFilters.find(f => f.key === 'model_id')
      if (modelFilter) {
        modelFilter.options = [
          { label: '所有型号', value: '' },
          ...models.value.map(model => ({
            label: `${model.oemname} ${model.stdname}`,
            value: model.id
          }))
        ]
      }
    }
  } catch (error) {
    console.error('Error fetching models:', error)
  }
}

// 处理过滤器变化 - 替换原来的复杂 watch 逻辑
const handleFilterChange = (filters: Record<string, any>) => {
  currentFilters.value = filters
  pagination.page = 1
  fetchDevices(filters)
}

// 处理分页变化
const onPageChange = (page: number) => {
  pagination.page = page
  fetchDevices(currentFilters.value)
}

// 刷新数据
const handleRefresh = () => {
  fetchDevices(currentFilters.value)
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchVendors(),
    fetchModels()
  ])
  await fetchDevices()
})

useHead({
  title: '设备管理 - EzCloud'
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">设备管理 (改造示例)</h1>
          <p class="subtitle is-6">使用可重用过滤器组件的设备列表页面</p>
        </div>
        <div class="header-actions">
          <VButton @click="handleRefresh" :loading="loading">
            <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
            刷新
          </VButton>
        </div>
      </div>
    </div>

    <!-- 对比说明 -->
    <VMessage color="info" class="mb-6">
      <strong>改造对比：</strong>
      <ul class="mt-2">
        <li>❌ 原来：手动实现搜索防抖、watch 监听、状态管理 (~100行代码)</li>
        <li>✅ 现在：使用 VTableFilters 组件 (~10行代码)</li>
        <li>✅ 代码减少 90%，功能更强大、更统一</li>
      </ul>
    </VMessage>

    <VCard>
      <!-- 使用可重用的过滤器组件 - 替换原来的手动实现 -->
      <VTableFilters
        :filters="deviceFilters"
        search-placeholder="搜索设备名称、SN、MAC地址..."
        @filter-change="handleFilterChange"
      />

      <!-- 设备列表表格 -->
      <VFlexTableWrapper
        :columns="{
          device_name: { 
            label: '设备名称', 
            searchable: true,
            sortable: true,
            bold: true,
            grow: true
          },
          model: { 
            label: '设备型号',
            grow: 'lg'
          },
          status: { 
            label: '状态',
            align: 'center'
          },
          ip_address: { 
            label: 'IP地址'
          },
          last_seen: { 
            label: '最后在线',
            sortable: true
          },
          actions: { 
            label: '操作',
            align: 'end'
          }
        }"
        :data="devices"
        :loading="loading"
      >
        <template #default="wrapperState">
          <VFlexTableToolbar>
            <template #left>
              <VField>
                <VControl icon="lucide:search">
                  <VInput
                    v-model="wrapperState.searchInput"
                    type="text"
                    class="is-rounded"
                    placeholder="表格内搜索..."
                  />
                </VControl>
              </VField>
            </template>
            
            <template #right>
              <VField>
                <VControl>
                  <VSelect v-model="wrapperState.limit" class="is-rounded">
                    <VOption :value="10">10 条/页</VOption>
                    <VOption :value="20">20 条/页</VOption>
                    <VOption :value="50">50 条/页</VOption>
                    <VOption :value="100">100 条/页</VOption>
                  </VSelect>
                </VControl>
              </VField>
            </template>
          </VFlexTableToolbar>

          <VFlexTable rounded>
            <!-- 加载状态 -->
            <template #body>
              <div v-if="loading" class="flex-list-inner">
                <div v-for="key in 5" :key="key" class="flex-table-item">
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: 'lg' }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="120px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="120px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ align: 'end' }"><VPlaceload width="60px" /></VFlexTableCell>
                </div>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="wrapperState.data?.length === 0" class="flex-list-inner">
                <VPlaceholderSection
                  title="暂无设备"
                  subtitle="请检查搜索条件或添加设备"
                  class="my-6"
                />
              </div>
            </template>

            <template #body-cell="{ row: device, column }">
              <template v-if="column.key === 'device_name'">
                <VTextEllipsis width="150px" class="device-name">
                  {{ device.device_name || device.sn }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'model'">
                <div class="model-info">
                  <VTextEllipsis width="200px" class="model-text">
                    <span class="oemname">{{ device.deviceModel?.oemname }}</span>
                    <span class="stdname">{{ device.deviceModel?.stdname }}</span>
                  </VTextEllipsis>
                </div>
              </template>

              <template v-if="column.key === 'status'">
                <VTag 
                  :color="device.is_online ? 'success' : 'danger'"
                  rounded
                >
                  {{ device.is_online ? '在线' : '离线' }}
                </VTag>
              </template>

              <template v-if="column.key === 'ip_address'">
                <VTextEllipsis width="120px" class="ip-address">
                  {{ device.ip_address || '-' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'last_seen'">
                <VTextEllipsis width="120px" class="date-text">
                  {{ device.last_seen ? new Date(device.last_seen).toLocaleString() : '-' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'actions'">
                <VButton 
                  outlined
                  @click="console.log('查看设备详情:', device)"
                >
                  <iconify-icon icon="lucide:eye" />
                </VButton>
              </template>
            </template>
          </VFlexTable>
        </template>
      </VFlexTableWrapper>

      <!-- Pagination -->
      <VFlexPagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        :item-per-page="pagination.limit"
        :total-items="pagination.total"
        :max-links-displayed="7"
        @update:current-page="onPageChange"
      />
    </VCard>

    <!-- 当前过滤条件显示 -->
    <VCard v-if="Object.keys(currentFilters).length > 0" class="mt-4">
      <header class="card-header">
        <p class="card-header-title">当前过滤条件</p>
      </header>
      <div class="card-content">
        <pre class="current-filters">{{ JSON.stringify(currentFilters, null, 2) }}</pre>
      </div>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.device-name {
  font-weight: 600;
  color: var(--primary);
}

.model-info {
  .model-text {
    .oemname {
      font-weight: 600;
      color: var(--dark-text);
      margin-right: 0.5rem;
    }
    
    .stdname {
      color: var(--muted-grey);
      font-size: 0.9rem;
    }
  }
}

.ip-address {
  font-family: var(--font-family-monospace);
  font-size: 0.9rem;
}

.date-text {
  font-size: 0.85rem;
  color: var(--muted-grey);
}

.current-filters {
  background: var(--fade-grey-light-6);
  padding: 1rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  overflow-x: auto;
}

.is-dark {
  .current-filters {
    background: var(--dark-sidebar-light-6);
  }
}
</style>