# Vuero 模态框和弹出层组件指南

本文档专门介绍 Vuero 框架中模态框、下拉菜单等弹出层组件的使用方法。

## 1. VModal - 模态框组件

VModal 是最重要的弹出层组件，用于显示对话框、表单等内容。

### ⚠️ 重要提醒

**VModal 使用 `:open` 属性而不是 `v-model`！这是最常见的错误。**

### ✅ 正确用法

#### 基本模态框

```vue
<script setup lang="ts">
const isModalOpen = ref(false)

const openModal = () => {
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}
</script>

<template>
  <VButton @click="openModal">
    打开模态框
  </VButton>

  <VModal 
    :open="isModalOpen"
    title="基本模态框"
    size="medium"
    actions="right"
    @close="closeModal"
  >
    <template #content>
      <div class="modal-content">
        <p>这里是模态框的内容区域。</p>
        <p>可以放置任何需要的内容。</p>
      </div>
    </template>
    
    <template #action>
      <VButton color="primary" @click="closeModal">
        确认
      </VButton>
      <VButton @click="closeModal">
        取消
      </VButton>
    </template>
  </VModal>
</template>
```

#### 表单模态框

```vue
<script setup lang="ts">
const isFormModalOpen = ref(false)
const formData = reactive({
  name: '',
  email: '',
  message: ''
})

const handleSubmit = async () => {
  try {
    // 提交表单逻辑
    await submitForm(formData)
    isFormModalOpen.value = false
    // 重置表单
    Object.assign(formData, { name: '', email: '', message: '' })
  } catch (error) {
    console.error('提交失败:', error)
  }
}
</script>

<template>
  <VModal 
    is="form"
    :open="isFormModalOpen"
    title="联系我们"
    size="small"
    actions="right"
    @submit.prevent="handleSubmit"
    @close="isFormModalOpen = false"
  >
    <template #content>
      <div class="modal-form">
        <VField>
          <VLabel>姓名 *</VLabel>
          <VControl>
            <VInput 
              v-model="formData.name"
              placeholder="请输入姓名"
              required
            />
          </VControl>
        </VField>
        
        <VField>
          <VLabel>邮箱 *</VLabel>
          <VControl>
            <VInput 
              v-model="formData.email"
              type="email"
              placeholder="请输入邮箱"
              required
            />
          </VControl>
        </VField>
        
        <VField>
          <VLabel>留言</VLabel>
          <VControl>
            <VTextarea 
              v-model="formData.message"
              placeholder="请输入留言内容"
              rows="4"
            />
          </VControl>
        </VField>
      </div>
    </template>
    
    <template #action>
      <VButton 
        type="submit"
        color="primary"
      >
        提交
      </VButton>
      <VButton @click="isFormModalOpen = false">
        取消
      </VButton>
    </template>
  </VModal>
</template>
```

#### 确认对话框

```vue
<script setup lang="ts">
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

const handleDelete = async () => {
  isDeleting.value = true
  try {
    await deleteItem()
    isDeleteModalOpen.value = false
    // 显示成功消息
    notyf.success('删除成功')
  } catch (error) {
    notyf.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <VModal 
    :open="isDeleteModalOpen"
    title="确认删除"
    size="small"
    actions="center"
    noclose
    @close="isDeleteModalOpen = false"
  >
    <template #content>
      <VPlaceholderSection
        title="确认删除操作"
        subtitle="此操作无法撤销，确定要删除这个项目吗？"
      />
    </template>
    
    <template #action>
      <VButton 
        color="danger"
        :loading="isDeleting"
        @click="handleDelete"
      >
        确认删除
      </VButton>
      <VButton 
        @click="isDeleteModalOpen = false"
        :disabled="isDeleting"
      >
        取消
      </VButton>
    </template>
  </VModal>
</template>
```

### ❌ 常见错误

```vue
<!-- 错误1: 使用 v-model 而不是 :open -->
<VModal v-model="isOpen"> <!-- ❌ 错误 -->
  内容
</VModal>

<!-- 错误2: 内容不在 #content 插槽内 -->
<VModal :open="isOpen" @close="close">
  <div>内容</div> <!-- ❌ 应该在 #content 插槽内 -->
</VModal>

<!-- 错误3: 使用 noclose 但没有提供关闭方式 -->
<VModal :open="isOpen" noclose> <!-- ❌ 用户无法关闭 -->
  <template #content>
    内容
  </template>
</VModal>

<!-- 错误4: 表单模态框忘记设置 is="form" -->
<VModal :open="isOpen" @submit="handleSubmit"> <!-- ❌ 缺少 is="form" -->
  <template #content>
    <form>...</form>
  </template>
</VModal>
```

### VModal 属性参考

- `open`: Boolean - **控制显示状态（必需）**
- `title`: String - 模态框标题
- `size`: String - 尺寸 (`small`, `medium`, `large`, `big`)
- `actions`: String - 操作按钮位置 (`center`, `right`)
- `is`: String - HTML元素类型，表单用 `form`
- `noclose`: Boolean - 禁用点击背景关闭
- `noscroll`: Boolean - 禁用背景滚动

### VModal 事件

- `@close`: 模态框关闭时触发（必需监听）
- `@submit`: 当 `is="form"` 时表单提交触发

## 2. VDropdown - 下拉菜单组件

VDropdown 用于创建下拉菜单和操作菜单。

### ✅ 正确用法

#### 基本下拉菜单

```vue
<template>
  <VDropdown title="操作菜单">
    <template #content>
      <a href="#" class="dropdown-item" @click="handleEdit">
        编辑
      </a>
      <a href="#" class="dropdown-item" @click="handleDuplicate">
        复制
      </a>
      <hr class="dropdown-divider">
      <a href="#" class="dropdown-item has-text-danger" @click="handleDelete">
        删除
      </a>
    </template>
  </VDropdown>
</template>
```

#### 图标下拉菜单

```vue
<template>
  <!-- 更多操作菜单 -->
  <VDropdown icon="lucide:more-vertical">
    <template #content>
      <a href="#" class="dropdown-item">
        <iconify-icon icon="lucide:edit" class="mr-2" />
        编辑
      </a>
      <a href="#" class="dropdown-item">
        <iconify-icon icon="lucide:copy" class="mr-2" />
        复制
      </a>
      <a href="#" class="dropdown-item">
        <iconify-icon icon="lucide:trash-2" class="mr-2" />
        删除
      </a>
    </template>
  </VDropdown>
  
  <!-- 用户菜单 -->
  <VDropdown icon="lucide:user" right>
    <template #content>
      <a href="#" class="dropdown-item">个人资料</a>
      <a href="#" class="dropdown-item">设置</a>
      <hr class="dropdown-divider">
      <a href="#" class="dropdown-item">退出登录</a>
    </template>
  </VDropdown>
</template>
```

#### 富媒体下拉菜单

```vue
<template>
  <VDropdown title="高级操作" spaced>
    <template #content>
      <a href="#" class="dropdown-item is-media">
        <div class="icon">
          <iconify-icon icon="lucide:edit" />
        </div>
        <div class="meta">
          <span>编辑项目</span>
          <span>修改项目的基本信息</span>
        </div>
      </a>
      
      <a href="#" class="dropdown-item is-media">
        <div class="icon">
          <iconify-icon icon="lucide:users" />
        </div>
        <div class="meta">
          <span>管理成员</span>
          <span>添加或移除项目成员</span>
        </div>
      </a>
      
      <a href="#" class="dropdown-item is-media">
        <div class="icon">
          <iconify-icon icon="lucide:settings" />
        </div>
        <div class="meta">
          <span>项目设置</span>
          <span>配置项目的高级选项</span>
        </div>
      </a>
    </template>
  </VDropdown>
</template>
```

#### 下拉菜单位置控制

```vue
<template>
  <!-- 右对齐 -->
  <VDropdown title="右对齐菜单" right>
    <template #content>
      <a href="#" class="dropdown-item">选项1</a>
      <a href="#" class="dropdown-item">选项2</a>
    </template>
  </VDropdown>
  
  <!-- 向上弹出 -->
  <VDropdown title="向上菜单" up>
    <template #content>
      <a href="#" class="dropdown-item">选项1</a>
      <a href="#" class="dropdown-item">选项2</a>
    </template>
  </VDropdown>
  
  <!-- 右上角 -->
  <VDropdown title="右上菜单" right up>
    <template #content>
      <a href="#" class="dropdown-item">选项1</a>
      <a href="#" class="dropdown-item">选项2</a>
    </template>
  </VDropdown>
</template>
```

### ❌ VDropdown 常见错误

```vue
<!-- 错误1: 同时使用 title 和 icon -->
<VDropdown title="菜单" icon="lucide:menu"> <!-- ❌ 只能选择一个 -->

<!-- 错误2: spaced 模式使用错误的类名 -->
<VDropdown title="菜单" spaced>
  <template #content>
    <a href="#" class="dropdown-item"> <!-- ❌ 应该是 is-media -->
      <iconify-icon icon="lucide:edit" />
      编辑
    </a>
  </template>
</VDropdown>

<!-- 错误3: 忘记添加 dropdown-item 类 -->
<VDropdown title="菜单">
  <template #content>
    <a href="#">选项</a> <!-- ❌ 缺少 dropdown-item 类 -->
  </template>
</VDropdown>

<!-- 错误4: 在非 spaced 模式使用 is-media -->
<VDropdown title="菜单"> <!-- ❌ 没有设置 spaced -->
  <template #content>
    <a href="#" class="dropdown-item is-media">
      <!-- 样式会错乱 -->
    </a>
  </template>
</VDropdown>
```

### VDropdown 属性参考

- `title`: String - 下拉按钮文字（与 icon 互斥）
- `icon`: String - 图标按钮（与 title 互斥）
- `right`: Boolean - 右对齐菜单
- `up`: Boolean - 向上展开
- `spaced`: Boolean - 富媒体选项模式

## 3. VTooltip - 工具提示

虽然 VTooltip 不是弹出层组件，但经常与其他组件配合使用：

```vue
<template>
  <!-- 基本工具提示 -->
  <VTooltip content="这是一个提示">
    <VButton>悬停查看提示</VButton>
  </VTooltip>
  
  <!-- 不同位置 -->
  <VTooltip content="上方提示" position="top">
    <VButton>上方</VButton>
  </VTooltip>
  
  <VTooltip content="右侧提示" position="right">
    <VButton>右侧</VButton>
  </VTooltip>
  
  <!-- 不同颜色 -->
  <VTooltip content="主要提示" color="primary">
    <VButton>主要</VButton>
  </VTooltip>
  
  <VTooltip content="成功提示" color="success">
    <VButton>成功</VButton>
  </VTooltip>
</template>
```

## 实际应用示例

### 数据表格操作菜单

```vue
<script setup lang="ts">
interface TableItem {
  id: number
  name: string
  status: string
}

const items = ref<TableItem[]>([
  { id: 1, name: '项目A', status: 'active' },
  { id: 2, name: '项目B', status: 'inactive' }
])

const editItem = (item: TableItem) => {
  // 编辑逻辑
  console.log('编辑:', item)
}

const deleteItem = (item: TableItem) => {
  // 删除逻辑
  items.value = items.value.filter(i => i.id !== item.id)
}
</script>

<template>
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th>名称</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.name }}</td>
          <td>
            <VTag :color="item.status === 'active' ? 'success' : 'warning'">
              {{ item.status }}
            </VTag>
          </td>
          <td>
            <VDropdown icon="lucide:more-vertical">
              <template #content>
                <a 
                  href="#" 
                  class="dropdown-item"
                  @click.prevent="editItem(item)"
                >
                  <iconify-icon icon="lucide:edit" class="mr-2" />
                  编辑
                </a>
                <a 
                  href="#" 
                  class="dropdown-item"
                  @click.prevent="deleteItem(item)"
                >
                  <iconify-icon icon="lucide:trash-2" class="mr-2" />
                  删除
                </a>
              </template>
            </VDropdown>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

### 复杂的确认对话框组合

```vue
<script setup lang="ts">
const isDeleteConfirmOpen = ref(false)
const isSuccessModalOpen = ref(false)
const itemToDelete = ref<any>(null)
const isDeleting = ref(false)

const showDeleteConfirm = (item: any) => {
  itemToDelete.value = item
  isDeleteConfirmOpen.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value) return
  
  isDeleting.value = true
  try {
    await deleteItemApi(itemToDelete.value.id)
    isDeleteConfirmOpen.value = false
    isSuccessModalOpen.value = true
    // 更新列表
    await refreshList()
  } catch (error) {
    console.error('删除失败:', error)
  } finally {
    isDeleting.value = false
    itemToDelete.value = null
  }
}
</script>

<template>
  <!-- 删除确认对话框 -->
  <VModal 
    :open="isDeleteConfirmOpen"
    title="确认删除"
    size="small"
    actions="center"
    noclose
    @close="isDeleteConfirmOpen = false"
  >
    <template #content>
      <div class="has-text-centered">
        <iconify-icon 
          icon="lucide:alert-triangle" 
          class="has-text-warning"
          style="font-size: 3rem; margin-bottom: 1rem;"
        />
        <h3 class="title is-5">确认删除操作</h3>
        <p class="subtitle is-6">
          确定要删除 "{{ itemToDelete?.name }}" 吗？
        </p>
        <p class="has-text-grey">
          此操作无法撤销，所有相关数据将被永久删除。
        </p>
      </div>
    </template>
    
    <template #action>
      <VButton 
        color="danger"
        :loading="isDeleting"
        @click="handleDelete"
      >
        确认删除
      </VButton>
      <VButton 
        @click="isDeleteConfirmOpen = false"
        :disabled="isDeleting"
      >
        取消
      </VButton>
    </template>
  </VModal>

  <!-- 成功提示对话框 -->
  <VModal 
    :open="isSuccessModalOpen"
    title="操作成功"
    size="small"
    actions="center"
    @close="isSuccessModalOpen = false"
  >
    <template #content>
      <div class="has-text-centered">
        <iconify-icon 
          icon="lucide:check-circle" 
          class="has-text-success"
          style="font-size: 3rem; margin-bottom: 1rem;"
        />
        <h3 class="title is-5">删除成功</h3>
        <p class="subtitle is-6">
          项目已成功删除
        </p>
      </div>
    </template>
    
    <template #action>
      <VButton 
        color="success"
        @click="isSuccessModalOpen = false"
      >
        好的
      </VButton>
    </template>
  </VModal>
</template>
```

## 最佳实践

1. **状态管理**：使用 `ref` 管理模态框开关状态，避免使用全局状态
2. **事件处理**：始终监听 `@close` 事件正确关闭模态框
3. **用户体验**：在危险操作时使用确认对话框
4. **加载状态**：在异步操作时显示加载状态，防止重复操作
5. **键盘操作**：支持 ESC 键关闭模态框（除非设置了 `noclose`）
6. **移动端适配**：在移动设备上注意模态框尺寸和交互方式

---

参考：基于 Vuero v3.1.0 模态框和下拉菜单组件文档