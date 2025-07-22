# Vuero 组件开发指南索引

本索引提供了 EzCloud 项目中 Vuero UI 框架的完整组件使用指南，按功能分类组织，便于 AI 开发助手快速查找和参考。

## 📋 文档结构

### 1. [表单组件指南](./VUERO_FORM_COMPONENTS.md)
专门介绍表单相关组件的使用方法和最佳实践。

**包含组件：**
- `VField` - 表单字段容器
- `VControl` - 表单控件容器  
- `VInput` - 文本输入框
- `VSelect` - 选择框
- `VTextarea` - 多行文本框
- `VCheckbox` / `VRadio` - 复选框和单选按钮
- `VButton` - 表单提交按钮

**重点内容：**
- 插件模式（Addons）的正确使用
- 水平布局的实现方法
- 表单验证集成（Vee-Validate）
- 常见错误和解决方案

### 2. [模态框和弹出层指南](./VUERO_MODAL_DROPDOWN_COMPONENTS.md)
介绍弹出式组件的正确使用方法。

**包含组件：**
- `VModal` - 模态框组件 ⚠️ **使用 `:open` 而不是 `v-model`**
- `VDropdown` - 下拉菜单组件
- `VTooltip` - 工具提示

**重点内容：**
- VModal 的正确属性和插槽使用
- 表单模态框的实现
- 确认对话框的最佳实践
- 下拉菜单的位置控制和样式

### 3. [反馈和消息组件指南](./VUERO_FEEDBACK_COMPONENTS.md)
涵盖用户反馈、状态显示相关的组件。

**包含组件：**
- `VMessage` - 消息提示组件
- `VProgress` - 进度条组件
- `VLoader` - 加载指示器
- `Notyf` - 全局通知库
- `VPlaceholder` - 占位符组件

**重点内容：**
- 不同类型消息的使用场景
- 进度反馈的实现方法
- 文件上传进度示例
- 表单提交反馈的完整流程

### 4. [布局和容器组件指南](./VUERO_LAYOUT_COMPONENTS.md)
介绍页面布局和内容组织相关的组件。

**包含组件：**
- `VFlex` - 弹性布局容器
- `VGrid` - 网格布局容器
- `VBlock` - 内容块容器
- `VCard` - 卡片容器

**重点内容：**
- 响应式布局的实现
- 复杂仪表板布局示例
- 卡片网格的最佳实践
- 移动端适配策略

## 🚨 最常见错误提醒

### VModal 组件
```vue
<!-- ❌ 错误：使用 v-model -->
<VModal v-model="isOpen">

<!-- ✅ 正确：使用 :open 和 @close -->
<VModal :open="isOpen" @close="isOpen = false">
  <template #content>
    <!-- 内容必须在 #content 插槽内 -->
  </template>
  <template #action>
    <!-- 操作按钮在 #action 插槽内 -->
  </template>
</VModal>
```

### VField 插件模式
```vue
<!-- ❌ 错误：忘记 expanded 属性 -->
<VField addons>
  <VControl>
    <VButton static>前缀</VButton>
  </VControl>
  <VControl> <!-- 缺少 expanded -->
    <VInput v-model="value" />
  </VControl>
</VField>

<!-- ✅ 正确：主控件添加 expanded -->
<VField addons>
  <VControl>
    <VButton static>前缀</VButton>
  </VControl>
  <VControl expanded> <!-- 正确 -->
    <VInput v-model="value" />
  </VControl>
</VField>
```

### VDropdown 组件
```vue
<!-- ❌ 错误：同时使用 title 和 icon -->
<VDropdown title="菜单" icon="lucide:menu">

<!-- ✅ 正确：只使用其中一个 -->
<VDropdown title="菜单">
<!-- 或 -->
<VDropdown icon="lucide:menu">
```

### VMessage 组件
```vue
<!-- ❌ 错误：可关闭但不处理关闭事件 -->
<VMessage closable>消息内容</VMessage>

<!-- ✅ 正确：处理关闭事件 -->
<VMessage 
  v-if="showMessage"
  closable 
  @close="showMessage = false"
>
  消息内容
</VMessage>
```

## 🔍 快速查找指南

### 按使用场景查找

**表单开发** → [表单组件指南](./VUERO_FORM_COMPONENTS.md)
- 需要输入框、选择框、提交按钮等

**弹窗和菜单** → [模态框和弹出层指南](./VUERO_MODAL_DROPDOWN_COMPONENTS.md)
- 需要对话框、确认框、下拉操作菜单等

**状态反馈** → [反馈和消息组件指南](./VUERO_FEEDBACK_COMPONENTS.md)
- 需要显示成功/错误消息、加载进度、空状态等

**页面布局** → [布局和容器组件指南](./VUERO_LAYOUT_COMPONENTS.md)
- 需要页面结构、卡片布局、响应式设计等

### 按组件类型查找

**容器组件：** VField, VControl, VFlex, VGrid, VBlock, VCard
**输入组件：** VInput, VSelect, VTextarea, VCheckbox, VRadio
**交互组件：** VButton, VModal, VDropdown
**反馈组件：** VMessage, VProgress, VLoader, Notyf
**显示组件：** VTag, VAvatar, VIcon, VTooltip

## 📱 响应式设计提醒

所有 Vuero 组件都支持响应式设计，在开发时注意：

1. **断点系统：** `mobile` (768px以下), `tablet` (768px-1024px), `desktop` (1024px以上)
2. **响应式属性：** 很多组件支持响应式配置，如 `VGrid` 的 `columns` 属性
3. **移动端优先：** 优先考虑移动端的用户体验
4. **触摸友好：** 确保按钮和交互元素在移动设备上足够大

## 🎨 样式和主题

### CSS 变量系统
Vuero 使用 CSS 变量系统，常用变量：
- `--primary` - 主色调
- `--success`, `--info`, `--warning`, `--danger` - 状态颜色
- `--white`, `--dark-text` - 文本颜色
- `--fade-grey-light-3`, `--fade-grey-light-6` - 边框和背景
- `--radius` - 圆角半径

### 暗黑模式
组件会自动适配暗黑模式，通过 `.is-dark` 类控制。

## 🔧 开发工具和调试

1. **Vue DevTools：** 查看组件状态和 props
2. **浏览器控制台：** 检查组件事件和错误
3. **网络面板：** 监控 API 请求和响应
4. **响应式测试：** 使用浏览器的设备模拟功能

## 📚 参考资源

- **Vuero 官方文档：** `/client/documentation/`
- **组件源码：** `/client/vuero/src/components/base/`
- **示例页面：** `/client/vuero/src/pages/components/`
- **本项目组件：** `/client/src/components/`

## 🤝 开发规范

1. **命名约定：** 使用 PascalCase 命名组件，kebab-case 命名属性
2. **事件处理：** 总是为交互组件提供适当的事件处理
3. **加载状态：** 在异步操作时显示加载状态
4. **错误处理：** 为用户操作提供清晰的错误反馈
5. **可访问性：** 为组件添加适当的 ARIA 标签

---

**版本：** 基于 Vuero v3.1.0
**更新日期：** 2025-07-04
**维护者：** EzCloud 开发团队