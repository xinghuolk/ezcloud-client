# Vuero 反馈和消息组件指南

本文档介绍 Vuero 框架中用于用户反馈、状态显示和消息提醒的组件。

## 1. VMessage - 消息组件

VMessage 用于显示提示信息、警告、错误等状态消息。

### ✅ 正确用法

#### 基本消息

```vue
<script setup lang="ts">
const showWarning = ref(true)
const showError = ref(true)

const handleCloseWarning = () => {
  showWarning.value = false
}

const handleCloseError = () => {
  showError.value = false
}
</script>

<template>
  <!-- 默认消息 -->
  <VMessage>
    这是一条默认的信息消息。
  </VMessage>
  
  <!-- 不同颜色的消息 -->
  <VMessage color="primary">
    这是一条主要消息。
  </VMessage>
  
  <VMessage color="success">
    操作已成功完成！
  </VMessage>
  
  <VMessage color="info">
    这里有一些重要信息需要您了解。
  </VMessage>
  
  <VMessage 
    v-if="showWarning"
    color="warning" 
    closable
    @close="handleCloseWarning"
  >
    请注意：此操作可能会影响系统性能。
  </VMessage>
  
  <VMessage 
    v-if="showError"
    color="danger" 
    closable
    @close="handleCloseError"
  >
    错误：操作失败，请稍后重试。
  </VMessage>
</template>
```

#### 复杂内容消息

```vue
<template>
  <!-- 带图标的消息 -->
  <VMessage color="success">
    <div class="flex items-center">
      <iconify-icon icon="lucide:check-circle" class="mr-3" />
      <div>
        <strong>上传成功！</strong>
        <p>您的文件已成功上传到服务器。</p>
      </div>
    </div>
  </VMessage>
  
  <!-- 带操作按钮的消息 -->
  <VMessage color="info">
    <div class="flex items-center justify-between">
      <div>
        <strong>新版本可用</strong>
        <p>发现新版本 v2.1.0，包含重要安全更新。</p>
      </div>
      <div class="ml-4">
        <VButton size="small" color="info" outlined>
          立即更新
        </VButton>
      </div>
    </div>
  </VMessage>
  
  <!-- 带链接的消息 -->
  <VMessage color="warning">
    <p>
      您的试用期将在 3 天后到期。
      <a href="#" class="has-text-weight-semibold">升级到专业版</a>
      以继续使用所有功能。
    </p>
  </VMessage>
</template>
```

### ❌ VMessage 常见错误

```vue
<!-- 错误1: 使用无效颜色 -->
<VMessage color="red"> <!-- ❌ 应该用 danger -->
  错误消息
</VMessage>

<!-- 错误2: 可关闭但不处理关闭事件 -->
<VMessage closable> <!-- ❌ 缺少 @close 处理 -->
  消息内容
</VMessage>

<!-- 错误3: 不使用条件渲染控制显示 -->
<VMessage closable @close="closeMessage">
  <!-- ❌ 关闭后组件仍存在 DOM 中 -->
</VMessage>
```

### VMessage 属性参考

- `color`: String - 消息颜色 (`primary`, `success`, `info`, `warning`, `danger`)
- `closable`: Boolean - 显示关闭按钮
- `@close`: Event - 关闭按钮点击事件

## 2. VProgress - 进度条组件

VProgress 用于显示操作进度或加载状态。

### ✅ 正确用法

```vue
<script setup lang="ts">
const uploadProgress = ref(0)
const isUploading = ref(false)

const startUpload = () => {
  isUploading.value = true
  uploadProgress.value = 0
  
  // 模拟上传进度
  const interval = setInterval(() => {
    uploadProgress.value += 10
    if (uploadProgress.value >= 100) {
      clearInterval(interval)
      isUploading.value = false
    }
  }, 200)
}
</script>

<template>
  <!-- 基本进度条 -->
  <VProgress 
    :value="uploadProgress" 
    :max="100"
  />
  
  <!-- 带颜色的进度条 -->
  <VProgress 
    :value="75" 
    color="primary"
  />
  
  <VProgress 
    :value="50" 
    color="success"
  />
  
  <VProgress 
    :value="30" 
    color="warning"
  />
  
  <VProgress 
    :value="80" 
    color="danger"
  />
  
  <!-- 不确定进度条（动画） -->
  <VProgress v-if="isUploading" />
  
  <!-- 带文本的进度条 -->
  <div class="progress-container">
    <VProgress 
      :value="uploadProgress" 
      color="primary"
    />
    <p class="progress-text">
      上传进度: {{ uploadProgress }}%
    </p>
  </div>
  
  <!-- 文件上传示例 -->
  <div class="upload-section">
    <VButton 
      @click="startUpload" 
      :disabled="isUploading"
      color="primary"
    >
      {{ isUploading ? '上传中...' : '开始上传' }}
    </VButton>
    
    <VProgress 
      v-if="isUploading || uploadProgress > 0"
      :value="uploadProgress" 
      color="success"
      class="mt-3"
    />
    
    <p v-if="uploadProgress === 100" class="has-text-success mt-2">
      ✅ 上传完成！
    </p>
  </div>
</template>

<style scoped>
.progress-container {
  position: relative;
}

.progress-text {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--muted-grey);
}

.upload-section {
  padding: 1rem;
  border: 1px solid var(--fade-grey-light-3);
  border-radius: var(--radius);
}
</style>
```

### VProgress 属性参考

- `value`: Number - 当前进度值
- `max`: Number - 最大值（默认 100）
- `color`: String - 进度条颜色 (`primary`, `success`, `info`, `warning`, `danger`)

## 3. VLoader - 加载指示器

VLoader 用于显示加载状态。

### ✅ 正确用法

```vue
<script setup lang="ts">
const isLoading = ref(false)
const loadingText = ref('加载中...')

const loadData = async () => {
  isLoading.value = true
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 2000))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <!-- 基本加载器 -->
  <VLoader v-if="isLoading" />
  
  <!-- 带文本的加载器 -->
  <VLoader v-if="isLoading" :text="loadingText" />
  
  <!-- 不同尺寸 -->
  <VLoader size="small" />
  <VLoader size="medium" />
  <VLoader size="large" />
  
  <!-- 覆盖整个区域的加载器 -->
  <div class="relative-container">
    <div class="content-area">
      <h3>内容区域</h3>
      <p>这里是一些内容...</p>
    </div>
    
    <VLoader 
      v-if="isLoading" 
      overlay 
      text="正在加载数据..."
    />
  </div>
  
  <!-- 按钮中的加载状态 -->
  <VButton 
    @click="loadData"
    :loading="isLoading"
    color="primary"
  >
    {{ isLoading ? '加载中...' : '加载数据' }}
  </VButton>
</template>

<style scoped>
.relative-container {
  position: relative;
  min-height: 200px;
}

.content-area {
  padding: 2rem;
  background: var(--white);
  border-radius: var(--radius);
}
</style>
```

## 4. Notyf - 全局通知

虽然不是 Vuero 原生组件，但 Notyf 是项目中常用的通知库。

### ✅ 正确用法

```vue
<script setup lang="ts">
import { useNotyf } from '/@src/composables/useNotyf'

const notyf = useNotyf()

// 或者直接导入
// import { Notyf } from 'notyf'
// const notyf = new Notyf()

const showSuccessNotification = () => {
  notyf.success('操作成功完成！')
}

const showErrorNotification = () => {
  notyf.error('操作失败，请重试')
}

const showInfoNotification = () => {
  notyf.info('这是一条信息提示')
}

const showWarningNotification = () => {
  notyf.warning('请注意这个警告')
}

const showCustomNotification = () => {
  notyf.open({
    type: 'primary',
    message: '这是自定义通知',
    duration: 5000,
    dismissible: true
  })
}

// 异步操作中的使用
const saveData = async () => {
  try {
    await submitForm()
    notyf.success('数据保存成功！')
  } catch (error) {
    notyf.error('保存失败：' + error.message)
  }
}

// API 请求中的使用
const fetchData = async () => {
  try {
    const response = await api.getData()
    if (response.success) {
      notyf.success(response.message || '数据加载成功')
    } else {
      notyf.error(response.message || '数据加载失败')
    }
  } catch (error) {
    notyf.error('网络错误，请检查连接')
  }
}
</script>

<template>
  <div class="notification-demo">
    <h3>通知示例</h3>
    
    <VButtons>
      <VButton 
        @click="showSuccessNotification"
        color="success"
      >
        成功通知
      </VButton>
      
      <VButton 
        @click="showErrorNotification"
        color="danger"
      >
        错误通知
      </VButton>
      
      <VButton 
        @click="showInfoNotification"
        color="info"
      >
        信息通知
      </VButton>
      
      <VButton 
        @click="showWarningNotification"
        color="warning"
      >
        警告通知
      </VButton>
      
      <VButton 
        @click="showCustomNotification"
        color="primary"
      >
        自定义通知
      </VButton>
    </VButtons>
  </div>
</template>
```

### Notyf 配置选项

```typescript
// 全局配置
const notyf = new Notyf({
  duration: 4000,
  position: {
    x: 'right',
    y: 'top',
  },
  types: [
    {
      type: 'warning',
      background: 'orange',
      icon: {
        className: 'material-icons',
        tagName: 'i',
        text: 'warning'
      }
    },
    {
      type: 'info',
      background: 'blue',
      duration: 2000,
      dismissible: true
    }
  ]
})

// 单个通知配置
notyf.open({
  type: 'success',
  message: '这是成功消息',
  duration: 3000,
  dismissible: true,
  ripple: true
})
```

## 5. VPlaceholder - 占位符组件

用于显示加载状态或空状态。

### ✅ 正确用法

```vue
<script setup lang="ts">
const isLoading = ref(true)
const hasData = ref(false)

onMounted(() => {
  // 模拟数据加载
  setTimeout(() => {
    isLoading.value = false
    hasData.value = Math.random() > 0.5
  }, 2000)
})
</script>

<template>
  <!-- 加载占位符 -->
  <div v-if="isLoading" class="loading-placeholder">
    <VPlaceload />
    <VPlaceloadText lines="3" />
  </div>
  
  <!-- 空状态占位符 -->
  <VPlaceholderPage
    v-else-if="!hasData"
    title="暂无数据"
    subtitle="还没有任何内容，点击下方按钮添加"
    larger
  >
    <template #image>
      <img src="/images/placeholders/placeholder.svg" alt="空状态" />
    </template>
    
    <template #action>
      <VButton color="primary" elevated>
        添加数据
      </VButton>
    </template>
  </VPlaceholderPage>
  
  <!-- 实际内容 -->
  <div v-else class="content">
    <h3>数据内容</h3>
    <p>这里显示实际的数据内容...</p>
  </div>
</template>
```

## 实际应用示例

### 表单提交反馈

```vue
<script setup lang="ts">
const form = reactive({
  name: '',
  email: '',
  message: ''
})

const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)

const submitForm = async () => {
  isSubmitting.value = true
  submitError.value = ''
  submitSuccess.value = false
  
  try {
    const response = await api.submitContactForm(form)
    
    if (response.success) {
      submitSuccess.value = true
      notyf.success('表单提交成功！我们会尽快回复您。')
      
      // 重置表单
      Object.assign(form, { name: '', email: '', message: '' })
    } else {
      submitError.value = response.message
    }
  } catch (error) {
    submitError.value = '提交失败，请稍后重试'
    notyf.error('网络错误，请检查连接')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submitForm" class="contact-form">
    <!-- 成功消息 -->
    <VMessage 
      v-if="submitSuccess"
      color="success"
      closable
      @close="submitSuccess = false"
    >
      感谢您的留言！我们会在 24 小时内回复您。
    </VMessage>
    
    <!-- 错误消息 -->
    <VMessage 
      v-if="submitError"
      color="danger"
      closable
      @close="submitError = ''"
    >
      {{ submitError }}
    </VMessage>
    
    <!-- 表单字段 -->
    <VField>
      <VLabel>姓名 *</VLabel>
      <VControl>
        <VInput 
          v-model="form.name"
          :disabled="isSubmitting"
          required
        />
      </VControl>
    </VField>
    
    <VField>
      <VLabel>邮箱 *</VLabel>
      <VControl>
        <VInput 
          v-model="form.email"
          type="email"
          :disabled="isSubmitting"
          required
        />
      </VControl>
    </VField>
    
    <VField>
      <VLabel>留言</VLabel>
      <VControl>
        <VTextarea 
          v-model="form.message"
          :disabled="isSubmitting"
          rows="4"
        />
      </VControl>
    </VField>
    
    <!-- 提交按钮 -->
    <VField>
      <VControl>
        <VButton 
          type="submit"
          color="primary"
          :loading="isSubmitting"
        >
          提交留言
        </VButton>
      </VControl>
    </VField>
  </form>
</template>
```

### 文件上传进度

```vue
<script setup lang="ts">
const uploadQueue = ref([])
const isUploading = ref(false)

const handleFileUpload = async (files) => {
  isUploading.value = true
  
  for (const file of files) {
    const uploadItem = {
      id: Date.now(),
      name: file.name,
      progress: 0,
      status: 'uploading',
      error: null
    }
    
    uploadQueue.value.push(uploadItem)
    
    try {
      await uploadFileWithProgress(file, (progress) => {
        uploadItem.progress = progress
      })
      
      uploadItem.status = 'success'
      notyf.success(`${file.name} 上传成功`)
      
    } catch (error) {
      uploadItem.status = 'error'
      uploadItem.error = error.message
      notyf.error(`${file.name} 上传失败`)
    }
  }
  
  isUploading.value = false
}

const removeUploadItem = (id) => {
  uploadQueue.value = uploadQueue.value.filter(item => item.id !== id)
}
</script>

<template>
  <div class="upload-area">
    <!-- 上传队列 -->
    <div v-if="uploadQueue.length > 0" class="upload-queue">
      <h4>上传队列</h4>
      
      <div 
        v-for="item in uploadQueue" 
        :key="item.id"
        class="upload-item"
      >
        <div class="upload-info">
          <span class="file-name">{{ item.name }}</span>
          <VButton 
            v-if="item.status !== 'uploading'"
            size="small"
            @click="removeUploadItem(item.id)"
          >
            移除
          </VButton>
        </div>
        
        <!-- 进度条 -->
        <VProgress 
          v-if="item.status === 'uploading'"
          :value="item.progress"
          color="primary"
        />
        
        <!-- 状态消息 -->
        <VMessage 
          v-if="item.status === 'success'"
          color="success"
          class="mt-2"
        >
          ✅ 上传成功
        </VMessage>
        
        <VMessage 
          v-if="item.status === 'error'"
          color="danger"
          class="mt-2"
        >
          ❌ {{ item.error }}
        </VMessage>
      </div>
    </div>
  </div>
</template>
```

## 最佳实践

1. **消息层级**：使用合适的消息类型（success/info/warning/danger）
2. **自动关闭**：重要消息使用手动关闭，一般信息可自动关闭
3. **进度反馈**：长时间操作必须提供进度指示
4. **错误处理**：清晰地显示错误信息和解决方案
5. **用户体验**：避免过多的通知干扰用户操作
6. **可访问性**：为屏幕阅读器提供适当的 aria 标签

---

参考：基于 Vuero v3.1.0 反馈组件文档