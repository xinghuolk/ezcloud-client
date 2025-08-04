# 统一页面设计模式 - EzCloud 管理页面

## 设计原则

基于 `/client/src/pages/app/vendors.vue` 的统一设计模式，所有管理页面应当遵循以下标准化结构：

## 页面结构

### 1. 页面头部 (Page Header)
```vue
<div class="common-page-header">
  <div class="header-content">
    <div class="header-info">
      <h1 class="title is-3">页面标题</h1>
      <p class="subtitle is-6">页面描述</p>
    </div>
  </div>
</div>
```

**要点：**
- 移除 `header-actions` 区域，不在头部放置操作按钮
- 保持简洁的标题和描述

### 2. 统计卡片 (Stats Cards) - 可选
```vue
<div class="columns is-multiline mb-6">
  <div class="column is-6">
    <VCard class="has-text-centered">
      <h3 class="title is-4 common-text-primary">{{ totalCount }}</h3>
      <p class="subtitle is-6">总计</p>
    </VCard>
  </div>
  <div class="column is-6">
    <VCard class="has-text-centered">
      <h3 class="title is-4 common-text-success">{{ activeCount }}</h3>
      <p class="subtitle is-6">活跃</p>
    </VCard>
  </div>
</div>
```

### 3. 统一控制区域 (Unified Controls)
```vue
<VCard>
  <!-- Filter Section -->
  <div class="card-content">
    <div class="columns">
      <div class="column is-8">
        <VField>
          <VLabel>搜索内容</VLabel>
          <VControl>
            <VInput
              v-model="searchForm.search"
              placeholder="搜索..."
              icon="lucide:search"
            />
          </VControl>
        </VField>
      </div>
      <div class="column is-4">
        <VField>
          <VLabel>&nbsp;</VLabel>
          <VControl>
            <div class="field is-grouped">
              <div class="control">
                <VButton @click="handleReset">
                  重置筛选
                </VButton>
              </div>
              <div class="control">
                <VButton @click="handleRefresh" :loading="loading">
                  刷新
                </VButton>
              </div>
              <div v-if="hasCreatePermission" class="control">
                <VButton color="primary" @click="openCreateDialog">
                  添加项目
                </VButton>
              </div>
            </div>
          </VControl>
        </VField>
      </div>
    </div>
  </div>

  <!-- 数据表格 -->
  <VFlexTableWrapper>
    <!-- ... 表格内容 -->
  </VFlexTableWrapper>
</VCard>
```

## 关键设计要点

### ✅ 推荐做法
1. **统一控制区域**：搜索、筛选、操作按钮都在同一个 VCard 内
2. **按钮组织**：使用 `field is-grouped` 组织操作按钮
3. **列布局**：搜索区域占8列，按钮区域占4列
4. **空标签占位**：按钮区域使用 `<VLabel>&nbsp;</VLabel>` 对齐
5. **表格直接嵌入**：VFlexTableWrapper 直接在控制区域的 VCard 内

### ❌ 避免的做法
1. **独立搜索区域**：不要创建单独的搜索卡片
2. **头部操作按钮**：不在页面头部放置 "添加" 按钮
3. **表格工具栏按钮**：不在 VFlexTableToolbar 中放置主要操作按钮
4. **多层卡片嵌套**：避免表格外再包装 VCard

## 样式要求

### CSS 样式
```scss
<style lang="scss" scoped>
:deep(.field.is-grouped) {
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
```

### 响应式设计
- 大屏：搜索8列 + 按钮4列
- 小屏：自动换行，保持良好可用性

## 权限控制

```vue
<div v-if="isAdmin" class="control">
  <VButton color="primary" @click="openCreateDialog">
    添加项目
  </VButton>
</div>
```

## 实施检查清单

在更新页面时，请确认以下要点：

- [ ] 移除页面头部的操作按钮区域
- [ ] 移除独立的搜索/筛选卡片
- [ ] 在 VCard 内创建统一控制区域
- [ ] 使用 columns 布局组织搜索和按钮
- [ ] 使用 `field is-grouped` 组织操作按钮
- [ ] VFlexTableWrapper 直接在控制 VCard 内
- [ ] 添加适当的 CSS 样式
- [ ] 保持响应式设计

## 已实施页面

1. ✅ `/client/src/pages/app/vendors.vue` - 标准模板
2. ✅ `/client/src/pages/app/wifi-templates.vue` - 已更新

## 待更新页面

根据之前的分析，以下页面需要按此模式更新：
- `/client/src/pages/app/models.vue`
- `/client/src/pages/app/firmware.vue` 
- `/client/src/pages/app/serials.vue`
- `/client/src/pages/app/devices.vue`
- 其他具有不同按钮布局模式的管理页面

---

*此文档为 EzCloud 前端开发统一标准，所有新页面和页面更新都应遵循此设计模式。*