<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import VTableFilters from './VTableFilters.vue'
import { commonFilters } from '/@src/composables/useTableFilters'
import type { FilterConfig } from '/@src/composables/useTableFilters'

// 示例：设备列表页面的过滤器配置
const deviceFilters: FilterConfig[] = [
  commonFilters.isOnline,
  {
    key: 'vendor_id',
    type: 'select',
    label: '厂商',
    options: [
      { label: '所有厂商', value: '' },
      { label: '华为', value: 1 },
      { label: '中兴', value: 2 },
      { label: '诺基亚', value: 3 }
    ]
  },
  {
    key: 'model_id', 
    type: 'select',
    label: '型号',
    options: [
      { label: '所有型号', value: '' },
      { label: '5G CPE Pro', value: 1 },
      { label: '5G Router Max', value: 2 }
    ]
  },
  {
    key: 'created_date',
    type: 'date',
    label: '创建日期',
    placeholder: '选择创建日期'
  }
]

// 示例：厂商列表页面的过滤器配置
const vendorFilters: FilterConfig[] = [
  commonFilters.isActive,
  {
    key: 'country',
    type: 'select',
    label: '国家',
    options: [
      { label: '所有国家', value: '' },
      { label: '中国', value: 'CN' },
      { label: '美国', value: 'US' },
      { label: '德国', value: 'DE' }
    ]
  }
]

// 示例数据
const loading = ref(false)
const currentFilters = reactive({})

// 处理过滤器变化
const handleDeviceFilterChange = (filters: Record<string, any>) => {
  console.log('设备过滤器变化:', filters)
  Object.assign(currentFilters, filters)
  // 这里调用API获取过滤后的数据
  fetchDevices(filters)
}

const handleVendorFilterChange = (filters: Record<string, any>) => {
  console.log('厂商过滤器变化:', filters)
  // 这里调用API获取过滤后的数据
  fetchVendors(filters)
}

// 模拟API调用
const fetchDevices = async (filters: Record<string, any> = {}) => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    console.log('获取设备数据，过滤条件:', filters)
    loading.value = false
  }, 500)
}

const fetchVendors = async (filters: Record<string, any> = {}) => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    console.log('获取厂商数据，过滤条件:', filters)
    loading.value = false
  }, 500)
}

onMounted(() => {
  fetchDevices()
  fetchVendors()
})
</script>

<template>
  <div class="common-page-layout">
    <div class="common-page-header">
      <h1 class="title is-3">表格过滤器组件示例</h1>
      <p class="subtitle is-6">展示如何使用 VTableFilters 组件实现统一的过滤器功能</p>
    </div>

    <!-- 设备列表示例 -->
    <VCard class="mb-6">
      <header class="card-header">
        <p class="card-header-title">设备列表过滤器示例</p>
      </header>
      
      <div class="card-content">
        <!-- 使用可重用的过滤器组件 -->
        <VTableFilters
          :filters="deviceFilters"
          search-placeholder="搜索设备名称、SN..."
          reset-text="重置过滤器"
          @filter-change="handleDeviceFilterChange"
        />

        <!-- 这里放置设备列表表格 -->
        <div class="content">
          <p class="has-text-grey">当前过滤条件: {{ JSON.stringify(currentFilters, null, 2) }}</p>
          <p v-if="loading" class="has-text-info">正在加载设备数据...</p>
          <p v-else class="has-text-success">设备数据已加载 (模拟)</p>
        </div>
      </div>
    </VCard>

    <!-- 厂商列表示例 -->
    <VCard class="mb-6">
      <header class="card-header">
        <p class="card-header-title">厂商列表过滤器示例</p>
      </header>
      
      <div class="card-content">
        <!-- 使用可重用的过滤器组件 -->
        <VTableFilters
          :filters="vendorFilters"
          search-placeholder="搜索厂商名称..."
          reset-text="清空条件"
          @filter-change="handleVendorFilterChange"
        />

        <!-- 这里放置厂商列表表格 -->
        <div class="content">
          <p class="has-text-grey">厂商过滤器更简单，只有激活状态和国家筛选</p>
          <p v-if="loading" class="has-text-info">正在加载厂商数据...</p>
          <p v-else class="has-text-success">厂商数据已加载 (模拟)</p>
        </div>
      </div>
    </VCard>

    <!-- 使用说明 -->
    <VCard>
      <header class="card-header">
        <p class="card-header-title">使用说明</p>
      </header>
      
      <div class="card-content">
        <div class="content">
          <h4>如何在现有页面中使用：</h4>
          <ol>
            <li><strong>导入组件和类型：</strong>
              <pre><code>import VTableFilters from '/@src/components/partials/table/VTableFilters.vue'
import { commonFilters, type FilterConfig } from '/@src/composables/useTableFilters'</code></pre>
            </li>
            
            <li><strong>定义过滤器配置：</strong>
              <pre><code>const filters: FilterConfig[] = [
  commonFilters.isOnline, // 使用预定义的常用过滤器
  {
    key: 'vendor_id',
    type: 'select',
    label: '厂商',
    options: [
      { label: '所有厂商', value: '' },
      { label: '华为', value: 1 }
    ]
  }
]</code></pre>
            </li>
            
            <li><strong>在模板中使用：</strong>
              <pre><code>&lt;VTableFilters
  :filters="filters"
  @filter-change="handleFilterChange"
/&gt;</code></pre>
            </li>
            
            <li><strong>处理过滤器变化：</strong>
              <pre><code>const handleFilterChange = (filters: Record&lt;string, any&gt;) => {
  // filters 包含所有活跃的过滤器值
  fetchData(filters)
}</code></pre>
            </li>
          </ol>

          <h4>特性：</h4>
          <ul>
            <li>✅ 文本输入自动防抖 (默认500ms)</li>
            <li>✅ 下拉选择立即触发</li>
            <li>✅ 支持搜索、下拉选择、日期选择</li>
            <li>✅ 自动布局响应式调整</li>
            <li>✅ 内置重置功能</li>
            <li>✅ 常用过滤器预设</li>
            <li>✅ TypeScript 类型支持</li>
          </ul>

          <h4>替换现有代码：</h4>
          <p>现有页面中的手动 watch、防抖、过滤器状态管理代码都可以删除，直接使用这个组件即可。</p>
        </div>
      </div>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
pre {
  background: var(--fade-grey-light-6);
  padding: 1rem;
  border-radius: var(--radius);
  overflow-x: auto;
  font-size: 0.85rem;
}

code {
  background: var(--fade-grey-light-3);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.85rem;
}

.is-dark {
  pre {
    background: var(--dark-sidebar-light-6);
  }
  
  code {
    background: var(--dark-sidebar-light-12);
  }
}
</style>