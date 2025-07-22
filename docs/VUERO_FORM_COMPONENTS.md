# Vuero 表单组件开发指南

本文档专门介绍 Vuero 框架中表单相关组件的正确使用方法和常见错误。

## 核心表单组件

### 1. VField - 表单字段容器

VField 是表单的基础容器组件，用于包装标签、输入控件和验证信息。

#### ✅ 正确用法

```vue
<script setup lang="ts">
const username = ref('')
const email = ref('')
</script>

<template>
  <!-- 基本字段 -->
  <VField>
    <VLabel>用户名 *</VLabel>
    <VControl>
      <VInput 
        v-model="username" 
        placeholder="请输入用户名"
        required
      />
    </VControl>
  </VField>
  
  <!-- 水平布局字段 -->
  <VField label="邮箱地址" horizontal>
    <VControl fullwidth>
      <VInput 
        v-model="email" 
        type="email" 
        placeholder="user@example.com"
      />
    </VControl>
  </VField>
  
  <!-- 带帮助文本的字段 -->
  <VField>
    <VLabel>密码</VLabel>
    <VControl>
      <VInput type="password" />
    </VControl>
    <p class="help">密码长度至少8位</p>
  </VField>
</template>
```

#### 插件模式 (Addons)

插件模式允许在输入框前后添加按钮或文本：

```vue
<template>
  <!-- 前置文本 -->
  <VField addons>
    <VControl>
      <VButton static>https://</VButton>
    </VControl>
    <VControl expanded>
      <VInput 
        v-model="website" 
        placeholder="www.example.com" 
      />
    </VControl>
  </VField>
  
  <!-- 后置按钮 -->
  <VField addons>
    <VControl expanded>
      <VInput 
        v-model="searchTerm" 
        placeholder="搜索内容" 
      />
    </VControl>
    <VControl>
      <VButton color="primary" @click="handleSearch">
        搜索
      </VButton>
    </VControl>
  </VField>
  
  <!-- 前后都有 -->
  <VField addons>
    <VControl>
      <VSelect v-model="countryCode">
        <VOption value="+86">+86</VOption>
        <VOption value="+1">+1</VOption>
      </VSelect>
    </VControl>
    <VControl expanded>
      <VInput 
        v-model="phoneNumber" 
        placeholder="手机号码" 
      />
    </VControl>
    <VControl>
      <VButton @click="verifyPhone">验证</VButton>
    </VControl>
  </VField>
</template>
```

#### ❌ 常见错误

```vue
<!-- 错误1: 插件模式忘记 expanded -->
<VField addons>
  <VControl>
    <VButton static>前缀</VButton>
  </VControl>
  <VControl> <!-- ❌ 主输入框必须添加 expanded -->
    <VInput v-model="value" />
  </VControl>
</VField>

<!-- 错误2: 水平布局忘记 fullwidth -->
<VField horizontal>
  <VControl> <!-- ❌ 水平布局应该添加 fullwidth -->
    <VInput v-model="value" />
  </VControl>
</VField>

<!-- 错误3: 嵌套 VField -->
<VField>
  <VField> <!-- ❌ 不要嵌套 VField -->
    <VInput />
  </VField>
</VField>
```

#### VField 属性参考

- `label`: String - 字段标签
- `horizontal`: Boolean - 水平布局模式
- `addons`: Boolean - 插件模式
- `grouped`: Boolean - 分组模式

### 2. VControl - 表单控件容器

VControl 包装具体的输入控件，提供加载状态和图标支持。

```vue
<template>
  <!-- 基本控件 -->
  <VControl>
    <VInput v-model="value" />
  </VControl>
  
  <!-- 带加载状态 -->
  <VControl :loading="isValidating">
    <VInput v-model="username" />
  </VControl>
  
  <!-- 带图标 -->
  <VControl icon="lucide:user">
    <VInput v-model="username" placeholder="用户名" />
  </VControl>
  
  <!-- 全宽度 -->
  <VControl fullwidth>
    <VTextarea v-model="description" />
  </VControl>
</template>
```

#### VControl 属性参考

- `expanded`: Boolean - 扩展占满可用空间（插件模式必需）
- `fullwidth`: Boolean - 全宽度
- `loading`: Boolean - 显示加载状态
- `icon`: String - 左侧图标

### 3. VInput - 文本输入框

```vue
<script setup lang="ts">
const form = reactive({
  username: '',
  email: '',
  password: '',
  website: ''
})

const isLoading = ref(false)
</script>

<template>
  <!-- 基本输入框 -->
  <VInput 
    v-model="form.username"
    placeholder="用户名"
  />
  
  <!-- 不同类型 -->
  <VInput 
    v-model="form.email"
    type="email"
    placeholder="邮箱地址"
  />
  
  <VInput 
    v-model="form.password"
    type="password"
    placeholder="密码"
  />
  
  <!-- 只读和禁用 -->
  <VInput 
    v-model="form.username"
    readonly
    placeholder="只读输入框"
  />
  
  <VInput 
    v-model="form.username"
    disabled
    placeholder="禁用输入框"
  />
  
  <!-- 加载状态 -->
  <VInput 
    v-model="form.website"
    :loading="isLoading"
    placeholder="网站地址"
  />
  
  <!-- 圆角样式 -->
  <VInput 
    v-model="form.username"
    rounded
    placeholder="圆角输入框"
  />
</template>
```

#### VInput 属性参考

- `type`: String - 输入类型 (`text`, `email`, `password`, `number`, 等)
- `placeholder`: String - 占位符文本
- `disabled`: Boolean - 禁用状态
- `readonly`: Boolean - 只读状态
- `loading`: Boolean - 加载状态
- `rounded`: Boolean - 圆角样式

### 4. VSelect - 选择框

```vue
<script setup lang="ts">
const selectedCountry = ref('')
const selectedCategories = ref([])
</script>

<template>
  <!-- 基本选择框 -->
  <VSelect v-model="selectedCountry" placeholder="选择国家">
    <VOption value="cn">中国</VOption>
    <VOption value="us">美国</VOption>
    <VOption value="jp">日本</VOption>
  </VSelect>
  
  <!-- 多选 -->
  <VSelect 
    v-model="selectedCategories" 
    placeholder="选择分类"
    multiple
  >
    <VOption value="tech">技术</VOption>
    <VOption value="design">设计</VOption>
    <VOption value="business">商业</VOption>
  </VSelect>
  
  <!-- 分组选项 -->
  <VSelect v-model="selectedCity" placeholder="选择城市">
    <VOptgroup label="一线城市">
      <VOption value="beijing">北京</VOption>
      <VOption value="shanghai">上海</VOption>
    </VOptgroup>
    <VOptgroup label="二线城市">
      <VOption value="hangzhou">杭州</VOption>
      <VOption value="nanjing">南京</VOption>
    </VOptgroup>
  </VSelect>
  
  <!-- 加载状态 -->
  <VSelect 
    v-model="selectedItem"
    :loading="isLoadingOptions"
    placeholder="加载中..."
  >
    <VOption value="1">选项1</VOption>
  </VSelect>
</template>
```

### 5. VTextarea - 多行文本框

```vue
<script setup lang="ts">
const description = ref('')
const comment = ref('')
</script>

<template>
  <!-- 基本多行文本框 -->
  <VTextarea 
    v-model="description"
    placeholder="请输入描述"
    rows="4"
  />
  
  <!-- 可调整大小 -->
  <VTextarea 
    v-model="comment"
    placeholder="请输入评论"
    resize
  />
  
  <!-- 禁用调整大小 -->
  <VTextarea 
    v-model="description"
    placeholder="固定大小"
    :resize="false"
  />
  
  <!-- 加载状态 -->
  <VTextarea 
    v-model="content"
    :loading="isSaving"
    placeholder="内容"
  />
</template>
```

### 6. VCheckbox 和 VRadio

```vue
<script setup lang="ts">
const agreedToTerms = ref(false)
const preferences = ref(['email', 'sms'])
const gender = ref('')
const theme = ref('light')
</script>

<template>
  <!-- 复选框 -->
  <VCheckbox 
    v-model="agreedToTerms"
    label="我同意服务条款"
  />
  
  <!-- 多选复选框 -->
  <VCheckbox 
    v-model="preferences"
    value="email"
    label="邮件通知"
  />
  <VCheckbox 
    v-model="preferences"
    value="sms"
    label="短信通知"
  />
  <VCheckbox 
    v-model="preferences"
    value="push"
    label="推送通知"
  />
  
  <!-- 单选按钮 -->
  <VRadio 
    v-model="gender"
    value="male"
    label="男性"
  />
  <VRadio 
    v-model="gender"
    value="female"
    label="女性"
  />
  
  <!-- 带颜色的单选按钮 -->
  <VRadio 
    v-model="theme"
    value="light"
    label="浅色主题"
    color="primary"
  />
  <VRadio 
    v-model="theme"
    value="dark"
    label="深色主题"
    color="dark"
  />
</template>
```

### 7. 表单提交按钮

```vue
<script setup lang="ts">
const isSubmitting = ref(false)

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    // 提交逻辑
    await submitForm()
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <!-- 表单字段 -->
    <VField>
      <VControl>
        <VInput v-model="username" required />
      </VControl>
    </VField>
    
    <!-- 提交按钮组 -->
    <VField>
      <VControl>
        <VButtons>
          <VButton 
            type="submit"
            color="primary"
            :loading="isSubmitting"
          >
            提交
          </VButton>
          <VButton 
            type="button"
            @click="resetForm"
          >
            重置
          </VButton>
        </VButtons>
      </VControl>
    </VField>
  </form>
</template>
```

## 表单验证集成

### 使用 Vee-Validate

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate'
import * as yup from 'yup'

const schema = yup.object({
  username: yup.string().required('用户名必填').min(3, '至少3个字符'),
  email: yup.string().required('邮箱必填').email('邮箱格式不正确'),
  password: yup.string().required('密码必填').min(8, '密码至少8位')
})

const { handleSubmit, errors, meta } = useForm({
  validationSchema: schema
})

const onSubmit = handleSubmit(async (values) => {
  // 提交表单
  console.log('Form submitted:', values)
})
</script>

<template>
  <form @submit="onSubmit">
    <VField>
      <VLabel>用户名 *</VLabel>
      <VControl>
        <VInput 
          v-model="username"
          :class="{ 'is-danger': errors.username }"
          placeholder="请输入用户名"
        />
      </VControl>
      <p v-if="errors.username" class="help is-danger">
        {{ errors.username }}
      </p>
    </VField>
    
    <VField>
      <VControl>
        <VButton 
          type="submit"
          color="primary"
          :disabled="!meta.valid"
        >
          提交
        </VButton>
      </VControl>
    </VField>
  </form>
</template>
```

## 常见错误总结

### 1. VField 相关错误
- ❌ 在插件模式下忘记为主控件添加 `expanded`
- ❌ 在水平布局中忘记为控件添加 `fullwidth`
- ❌ 嵌套 VField 组件导致样式冲突

### 2. VControl 相关错误
- ❌ 在需要全宽度的场景下忘记添加 `fullwidth`
- ❌ 同时使用 `expanded` 和 `fullwidth` 导致样式异常

### 3. 表单提交错误
- ❌ 提交按钮忘记设置 `type="submit"`
- ❌ 表单标签缺少 `@submit.prevent`
- ❌ 加载状态管理不当导致重复提交

### 4. 表单验证错误
- ❌ 验证错误信息显示位置不当
- ❌ 输入框错误状态样式不一致
- ❌ 提交按钮状态与表单验证状态不同步

## 最佳实践

1. **统一的字段结构**：始终使用 VField + VLabel + VControl + VInput 的完整结构
2. **合适的输入类型**：为不同数据类型使用正确的 input type
3. **明确的验证反馈**：及时显示验证错误和成功状态
4. **加载状态管理**：在异步操作时正确显示加载状态
5. **可访问性支持**：为表单控件提供适当的标签和描述

---

参考：基于 Vuero v3.1.0 表单组件文档