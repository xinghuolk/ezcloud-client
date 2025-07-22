# Vuero 布局和容器组件指南

本文档介绍 Vuero 框架中用于页面布局、内容组织的容器组件。

## 1. VFlex - 弹性布局容器

VFlex 基于 CSS Flexbox，是最常用的布局组件。

### ✅ 正确用法

#### 基本弹性布局

```vue
<template>
  <!-- 水平排列 -->
  <VFlex align-items="center" justify-content="space-between">
    <div>左侧内容</div>
    <div>右侧内容</div>
  </VFlex>
  
  <!-- 垂直排列 -->
  <VFlex direction="column" align-items="center">
    <h3>标题</h3>
    <p>描述文本</p>
    <VButton>操作按钮</VButton>
  </VFlex>
  
  <!-- 居中对齐 -->
  <VFlex 
    align-items="center" 
    justify-content="center"
    class="min-h-screen"
  >
    <div class="text-center">
      <h1>居中内容</h1>
      <p>完全居中的内容区域</p>
    </div>
  </VFlex>
</template>
```

#### 响应式弹性布局

```vue
<template>
  <!-- 在移动端变为垂直布局 -->
  <VFlex 
    direction="row"
    :direction-mobile="'column'"
    gap="1rem"
  >
    <div class="flex-1">
      <VCard>
        <h3>卡片 1</h3>
        <p>内容区域</p>
      </VCard>
    </div>
    
    <div class="flex-1">
      <VCard>
        <h3>卡片 2</h3>
        <p>内容区域</p>
      </VCard>
    </div>
  </VFlex>
  
  <!-- 工具栏布局 -->
  <VFlex 
    align-items="center" 
    justify-content="space-between"
    wrap="wrap"
    gap="0.5rem"
    class="toolbar"
  >
    <VFlex align-items="center" gap="1rem">
      <h2>页面标题</h2>
      <VTag color="primary">新</VTag>
    </VFlex>
    
    <VFlex align-items="center" gap="0.5rem">
      <VButton outlined>取消</VButton>
      <VButton color="primary">保存</VButton>
    </VFlex>
  </VFlex>
</template>

<style scoped>
.toolbar {
  padding: 1rem;
  border-bottom: 1px solid var(--fade-grey-light-3);
}

.min-h-screen {
  min-height: 100vh;
}

.flex-1 {
  flex: 1;
}
</style>
```

#### 卡片网格布局

```vue
<script setup lang="ts">
const items = ref([
  { id: 1, title: '项目 1', description: '项目描述...' },
  { id: 2, title: '项目 2', description: '项目描述...' },
  { id: 3, title: '项目 3', description: '项目描述...' },
  { id: 4, title: '项目 4', description: '项目描述...' }
])
</script>

<template>
  <!-- 响应式卡片网格 -->
  <VFlex 
    wrap="wrap"
    gap="1.5rem"
    class="card-grid"
  >
    <div 
      v-for="item in items" 
      :key="item.id"
      class="card-item"
    >
      <VCard>
        <h4>{{ item.title }}</h4>
        <p>{{ item.description }}</p>
        <VButton size="small">查看详情</VButton>
      </VCard>
    </div>
  </VFlex>
</template>

<style scoped>
.card-grid {
  margin: 1rem 0;
}

.card-item {
  flex: 1 1 300px; /* 基础宽度 300px，可伸缩 */
  min-width: 280px;
}

@media (max-width: 768px) {
  .card-item {
    flex: 1 1 100%; /* 移动端全宽 */
  }
}
</style>
```

### VFlex 属性参考

- `direction`: String - 主轴方向 (`row`, `column`, `row-reverse`, `column-reverse`)
- `wrap`: String - 换行方式 (`nowrap`, `wrap`, `wrap-reverse`)
- `justify-content`: String - 主轴对齐 (`flex-start`, `center`, `space-between`, `space-around`, `space-evenly`)
- `align-items`: String - 交叉轴对齐 (`stretch`, `center`, `flex-start`, `flex-end`, `baseline`)
- `gap`: String - 间距 (`0.5rem`, `1rem`, `2rem` 等)

## 2. VGrid - 网格布局容器

VGrid 基于 CSS Grid，适合复杂的二维布局。

### ✅ 正确用法

```vue
<template>
  <!-- 基本网格 -->
  <VGrid columns="3" gap="1rem">
    <VCard v-for="i in 6" :key="i">
      <h4>卡片 {{ i }}</h4>
      <p>网格项目内容</p>
    </VCard>
  </VGrid>
  
  <!-- 响应式网格 -->
  <VGrid 
    :columns="{ mobile: 1, tablet: 2, desktop: 3 }"
    gap="1.5rem"
  >
    <VCard v-for="i in 9" :key="i">
      <h4>响应式卡片 {{ i }}</h4>
      <p>在不同屏幕尺寸下显示不同列数</p>
    </VCard>
  </VGrid>
  
  <!-- 复杂网格布局 -->
  <VGrid 
    template-areas="'header header header' 'sidebar content aside' 'footer footer footer'"
    template-columns="200px 1fr 200px"
    template-rows="auto 1fr auto"
    gap="1rem"
    class="page-grid"
  >
    <div style="grid-area: header;">
      <VCard>页面头部</VCard>
    </div>
    
    <div style="grid-area: sidebar;">
      <VCard>侧边栏</VCard>
    </div>
    
    <div style="grid-area: content;">
      <VCard>主要内容</VCard>
    </div>
    
    <div style="grid-area: aside;">
      <VCard>附加信息</VCard>
    </div>
    
    <div style="grid-area: footer;">
      <VCard>页面底部</VCard>
    </div>
  </VGrid>
</template>

<style scoped>
.page-grid {
  min-height: 80vh;
}
</style>
```

### VGrid 属性参考

- `columns`: Number/Object - 列数或响应式列数
- `gap`: String - 网格间距
- `template-areas`: String - 网格区域模板
- `template-columns`: String - 列模板
- `template-rows`: String - 行模板

## 3. VBlock - 内容块容器

VBlock 用于创建结构化的内容区块。

### ✅ 正确用法

```vue
<template>
  <!-- 基本内容块 -->
  <VBlock title="用户信息" subtitle="管理您的个人信息">
    <VField>
      <VLabel>用户名</VLabel>
      <VControl>
        <VInput v-model="username" />
      </VControl>
    </VField>
    
    <VField>
      <VLabel>邮箱</VLabel>
      <VControl>
        <VInput v-model="email" type="email" />
      </VControl>
    </VField>
  </VBlock>
  
  <!-- 带图标的内容块 -->
  <VBlock 
    title="安全设置" 
    subtitle="保护您的账户安全"
    icon="lucide:shield"
    center
  >
    <VField>
      <VLabel>当前密码</VLabel>
      <VControl>
        <VInput type="password" />
      </VControl>
    </VField>
    
    <VField>
      <VLabel>新密码</VLabel>
      <VControl>
        <VInput type="password" />
      </VControl>
    </VField>
  </VBlock>
  
  <!-- 媒体内容块 -->
  <VBlock 
    title="团队成员"
    subtitle="管理项目团队成员"
  >
    <template #media>
      <VAvatar picture="/images/avatars/user.jpg" />
    </template>
    
    <div class="member-list">
      <div v-for="member in members" :key="member.id" class="member-item">
        <VFlex align-items="center" justify-content="space-between">
          <VFlex align-items="center" gap="1rem">
            <VAvatar :picture="member.avatar" />
            <div>
              <h5>{{ member.name }}</h5>
              <p class="text-muted">{{ member.role }}</p>
            </div>
          </VFlex>
          
          <VDropdown icon="lucide:more-vertical">
            <template #content>
              <a href="#" class="dropdown-item">编辑</a>
              <a href="#" class="dropdown-item">移除</a>
            </template>
          </VDropdown>
        </VFlex>
      </div>
    </div>
  </VBlock>
</template>
```

### VBlock 属性参考

- `title`: String - 块标题
- `subtitle`: String - 块副标题
- `icon`: String - 标题图标
- `center`: Boolean - 内容居中
- `m`: String - 外边距
- `p`: String - 内边距

## 4. VCard - 卡片容器

VCard 是最常用的内容容器，提供阴影和边框样式。

### ✅ 正确用法

```vue
<script setup lang="ts">
const stats = ref([
  { title: '总用户', value: '12,345', trend: '+12%', color: 'success' },
  { title: '活跃用户', value: '8,901', trend: '+5%', color: 'info' },
  { title: '收入', value: '¥23,456', trend: '-2%', color: 'warning' },
  { title: '订单', value: '1,234', trend: '+18%', color: 'primary' }
])
</script>

<template>
  <!-- 基本卡片 -->
  <VCard>
    <h3>基本卡片</h3>
    <p>这是一个基本的卡片容器，包含标题和内容。</p>
    <VButton>操作按钮</VButton>
  </VCard>
  
  <!-- 统计卡片 -->
  <VFlex wrap="wrap" gap="1rem">
    <VCard 
      v-for="stat in stats" 
      :key="stat.title"
      class="stat-card"
    >
      <VFlex align-items="center" justify-content="space-between">
        <div>
          <h4 class="stat-value">{{ stat.value }}</h4>
          <p class="stat-title">{{ stat.title }}</p>
        </div>
        
        <VTag :color="stat.color" class="stat-trend">
          {{ stat.trend }}
        </VTag>
      </VFlex>
    </VCard>
  </VFlex>
  
  <!-- 带头部和底部的卡片 -->
  <VCard>
    <template #header>
      <VFlex align-items="center" justify-content="space-between">
        <h3>项目管理</h3>
        <VDropdown icon="lucide:more-vertical">
          <template #content>
            <a href="#" class="dropdown-item">编辑</a>
            <a href="#" class="dropdown-item">分享</a>
            <a href="#" class="dropdown-item">删除</a>
          </template>
        </VDropdown>
      </VFlex>
    </template>
    
    <div class="card-content">
      <p>这是一个复杂的卡片示例，包含头部、内容和底部操作区域。</p>
      
      <VProgress :value="75" color="primary" />
      <p class="text-muted mt-2">项目进度: 75%</p>
    </div>
    
    <template #footer>
      <VFlex align-items="center" justify-content="space-between">
        <span class="text-muted">最后更新: 2小时前</span>
        <VButtons>
          <VButton size="small" outlined>取消</VButton>
          <VButton size="small" color="primary">保存</VButton>
        </VButtons>
      </VFlex>
    </template>
  </VCard>
  
  <!-- 产品卡片 -->
  <VCard class="product-card">
    <div class="product-image">
      <img src="/images/products/product-1.jpg" alt="产品图片" />
    </div>
    
    <div class="product-info">
      <h4>产品名称</h4>
      <p class="product-description">产品描述文字...</p>
      
      <VFlex align-items="center" justify-content="space-between">
        <span class="product-price">¥299</span>
        <VButton size="small" color="primary">
          加入购物车
        </VButton>
      </VFlex>
    </div>
  </VCard>
</template>

<style scoped>
.stat-card {
  flex: 1 1 250px;
  min-width: 200px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.stat-title {
  color: var(--muted-grey);
  font-size: 0.875rem;
}

.stat-trend {
  font-weight: bold;
}

.card-content {
  padding: 1rem;
}

.product-card {
  max-width: 300px;
}

.product-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  padding: 1rem;
}

.product-description {
  color: var(--muted-grey);
  margin: 0.5rem 0 1rem;
}

.product-price {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--primary);
}
</style>
```

## 5. 复杂布局示例

### 仪表板布局

```vue
<script setup lang="ts">
const sidebarCollapsed = ref(false)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="dashboard-layout">
    <!-- 顶部导航 -->
    <header class="dashboard-header">
      <VFlex align-items="center" justify-content="space-between">
        <VFlex align-items="center" gap="1rem">
          <VButton 
            @click="toggleSidebar"
            icon="lucide:menu"
            size="small"
          />
          <h1>控制台</h1>
        </VFlex>
        
        <VFlex align-items="center" gap="1rem">
          <VButton icon="lucide:bell" size="small" />
          <VDropdown icon="lucide:user" right>
            <template #content>
              <a href="#" class="dropdown-item">个人资料</a>
              <a href="#" class="dropdown-item">设置</a>
              <hr class="dropdown-divider">
              <a href="#" class="dropdown-item">退出</a>
            </template>
          </VDropdown>
        </VFlex>
      </VFlex>
    </header>
    
    <!-- 主要内容区 -->
    <div class="dashboard-main">
      <!-- 侧边栏 -->
      <aside 
        class="dashboard-sidebar"
        :class="{ 'collapsed': sidebarCollapsed }"
      >
        <nav class="sidebar-nav">
          <a href="#" class="nav-item active">
            <iconify-icon icon="lucide:home" />
            <span v-if="!sidebarCollapsed">仪表板</span>
          </a>
          <a href="#" class="nav-item">
            <iconify-icon icon="lucide:users" />
            <span v-if="!sidebarCollapsed">用户管理</span>
          </a>
          <a href="#" class="nav-item">
            <iconify-icon icon="lucide:settings" />
            <span v-if="!sidebarCollapsed">系统设置</span>
          </a>
        </nav>
      </aside>
      
      <!-- 内容区域 -->
      <main class="dashboard-content">
        <!-- 统计概览 -->
        <section class="stats-section">
          <VGrid columns="4" gap="1rem" class="mb-6">
            <VCard v-for="i in 4" :key="i" class="stat-card">
              <VFlex align-items="center" gap="1rem">
                <div class="stat-icon">
                  <iconify-icon icon="lucide:trending-up" />
                </div>
                <div>
                  <h3>1,234</h3>
                  <p>统计项目 {{ i }}</p>
                </div>
              </VFlex>
            </VCard>
          </VGrid>
        </section>
        
        <!-- 图表区域 -->
        <section class="charts-section">
          <VGrid columns="2" gap="1.5rem">
            <VCard>
              <template #header>
                <h3>销售趋势</h3>
              </template>
              <div class="chart-container">
                <!-- 图表组件 -->
                <div class="chart-placeholder">图表区域</div>
              </div>
            </VCard>
            
            <VCard>
              <template #header>
                <h3>用户分布</h3>
              </template>
              <div class="chart-container">
                <!-- 图表组件 -->
                <div class="chart-placeholder">图表区域</div>
              </div>
            </VCard>
          </VGrid>
        </section>
        
        <!-- 数据表格 -->
        <section class="table-section mt-6">
          <VCard>
            <template #header>
              <VFlex align-items="center" justify-content="space-between">
                <h3>最新订单</h3>
                <VButton size="small" outlined>查看全部</VButton>
              </VFlex>
            </template>
            
            <div class="table-container">
              <!-- 这里放置 VFlexTable 或其他表格组件 -->
              <table class="table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>客户</th>
                    <th>金额</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="i in 5" :key="i">
                    <td>#{{ 1000 + i }}</td>
                    <td>客户 {{ i }}</td>
                    <td>¥{{ (Math.random() * 1000).toFixed(2) }}</td>
                    <td>
                      <VTag color="success">已完成</VTag>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </VCard>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dashboard-header {
  height: 60px;
  padding: 0 1rem;
  background: var(--white);
  border-bottom: 1px solid var(--fade-grey-light-3);
  position: sticky;
  top: 0;
  z-index: 100;
}

.dashboard-main {
  flex: 1;
  display: flex;
}

.dashboard-sidebar {
  width: 250px;
  background: var(--white);
  border-right: 1px solid var(--fade-grey-light-3);
  transition: width 0.3s ease;
}

.dashboard-sidebar.collapsed {
  width: 60px;
}

.sidebar-nav {
  padding: 1rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--muted-grey);
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  background: var(--primary-light-8);
  color: var(--primary);
}

.dashboard-content {
  flex: 1;
  padding: 2rem;
  background: var(--fade-grey-light-6);
  overflow-y: auto;
}

.stat-card {
  padding: 1.5rem;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-light-8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  font-size: 1.5rem;
}

.chart-container {
  height: 300px;
  padding: 1rem;
}

.chart-placeholder {
  height: 100%;
  background: var(--fade-grey-light-3);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-grey);
}

.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--fade-grey-light-3);
}

.table th {
  font-weight: 600;
  color: var(--dark-text);
}

@media (max-width: 768px) {
  .dashboard-sidebar {
    position: fixed;
    left: 0;
    top: 60px;
    height: calc(100vh - 60px);
    z-index: 50;
    transform: translateX(-100%);
  }
  
  .dashboard-sidebar:not(.collapsed) {
    transform: translateX(0);
  }
  
  .dashboard-content {
    margin-left: 0;
  }
}
</style>
```

## 最佳实践

1. **语义化使用**：根据内容性质选择合适的容器组件
2. **响应式设计**：使用响应式属性适配不同屏幕尺寸
3. **间距一致性**：使用统一的间距系统（0.5rem, 1rem, 1.5rem 等）
4. **嵌套层级**：避免过深的容器嵌套，保持结构清晰
5. **性能考虑**：大型布局使用虚拟滚动或分页加载
6. **可访问性**：为容器添加适当的语义标签和 ARIA 属性

---

参考：基于 Vuero v3.1.0 布局组件文档