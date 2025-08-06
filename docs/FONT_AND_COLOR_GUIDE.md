# 字体和颜色使用规范

## 颜色系统

### 主要颜色变量
- **主色调**: `var(--primary)` - `oklch(66.67% 0.146 173.07)` / `#336aeb`
- **成功色**: `var(--success)` - `#05d69e`
- **信息色**: `var(--info)` - `#0398e2`
- **警告色**: `var(--warning)` - `#faad42`
- **危险色**: `var(--danger)` - `#e62864`

### 文字颜色
- **主要文字**: `var(--dark-text)` - `#283252`
- **次要文字**: `var(--light-text)` - `#a2a5b9`
- **浅色文字**: `var(--muted-grey)` - `#999999`
- **白色文字**: `var(--white)` - `#fff`

### 字体系统
- **主要字体**: `var(--font)` - `'Roboto Flex Variable', sans-serif`
- **替代字体**: `var(--font-alt)` - `'Montserrat Variable', sans-serif`
- **等宽字体**: `var(--font-monospace)` - `'Fira Code Variable', monospace`
- **基础字体大小**: `var(--font-size)` - `14px`

## 标题

- `<h1>`
  - **class**: `title is-3`
  - **说明**: 页面主标题，用于标识页面用途。
  - **颜色**: `var(--dark-text)` (深色文本) (`#283252`)
  - **字体大小**: `1.75rem` (`28px`)

- `<h2>`
  - **class**: `title is-4`
  - **说明**: 卡片或区域标题。
  - **颜色**: `var(--dark-text)` (深色文本) (`#283252`)
  - **字体大小**: `1.5rem` (`24px`)

- `<h3>`
  - **class**: `title is-5`
  - **说明**: 卡片内或更次级区域的标题。
  - **颜色**: `var(--dark-text)` (深色文本) (`#283252`)
  - **字体大小**: `1.25rem` (`20px`)

- `<h4>`
  - **class**: `title is-6`
  - **说明**: 最小的标题，用于描述性文本。
  - **颜色**: `var(--dark-text)` (深色文本) (`#283252`)
  - **字体大小**: `1rem` (`16px`)

## 副标题

- **class**: `subtitle is-6`
- **说明**: 用于页面或区域的描述性文本。
- **颜色**: `var(--light-text)` (浅色文本) (`#a2a5b9`)
- **字体大小**: `1rem` (`16px`)

## 正文

- **class**: `common-text-light`
- **说明**: 用于表格中的次要信息或描述性文本。
- **颜色**: `var(--light-text)` (浅色文本) (`#a2a5b9`)
- **字体大小**: `0.9rem` (`14.4px`)

- **class**: `common-text-primary`
- **说明**: 用于统计卡片中的主要数字。
- **颜色**: `var(--primary)` (主色) (`#336aeb`)
- **字体大小**: `1.5rem` (`24px`)

- **class**: `common-text-success`
- **说明**: 用于统计卡片中的成功或活跃状态数字。
- **颜色**: `var(--success)` (成功色) (`#05d69e`)
- **字体大小**: `1.5rem` (`24px`)

- **class**: `common-text-danger`
- **说明**: 用于错误或危险状态的文字。
- **颜色**: `var(--danger)` (危险色) (`#e62864`)
- **字体大小**: `1rem` (`16px`)

- **class**: `common-text-warning`
- **说明**: 用于警告状态的文字。
- **颜色**: `var(--warning)` (警告色) (`#faad42`)
- **字体大小**: `1rem` (`16px`)

## 链接

- **说明**: 用于可点击的链接。
- **颜色**: `var(--primary)` (主色) (`#336aeb`)
- **字体大小**: `1rem` (`16px`)

## 强调

- **class**: `has-text-weight-semibold`
- **说明**: 用于加粗强调的文本。
- **颜色**: `var(--dark-text)` (深色文本) (`#283252`)
- **字体大小**: `1rem` (`16px`)

- **class**: `has-text-weight-bold`
- **说明**: 用于更粗的强调文本。
- **颜色**: `var(--dark-text)` (深色文本) (`#283252`)
- **字体大小**: `1rem` (`16px`)

## 帮助文本

- **class**: `help`
- **说明**: 用于表单字段下方的帮助或提示信息。
- **颜色**: `var(--light-text)` (浅色文本) (`#a2a5b9`)
- **字体大小**: `0.8rem` (`12.8px`)

- **class**: `help is-danger`
- **说明**: 用于表单验证的错误信息。
- **颜色**: `var(--danger)` (危险色) (`#e62864`)
- **字体大小**: `0.8rem` (`12.8px`)

- **class**: `help is-success`
- **说明**: 用于表单验证的成功信息。
- **颜色**: `var(--success)` (成功色) (`#05d69e`)
- **字体大小**: `0.8rem` (`12.8px`)

## 特殊用途文字

### 日期文字
- **class**: `common-date-text`
- **说明**: 用于显示日期时间信息。
- **颜色**: `var(--muted-grey)` (浅色文字) (`#999999`)
- **字体大小**: `0.85rem` (`13.6px`)

### 统计数字
- **class**: `stats-number`
- **说明**: 用于统计卡片中的大数字显示。
- **颜色**: `var(--dark-text)` (深色文本) (`#283252`)
- **字体大小**: `1.8rem` (`28.8px`)

### 表格文字
- **class**: `common-item-name`
- **说明**: 用于表格中的项目名称。
- **颜色**: `var(--dark-text)` (深色文本) (`#283252`)
- **字体大小**: `1rem` (`16px`)
- **字重**: `600`

## 暗黑模式适配

在暗黑模式下，以下颜色会自动调整：

- **主要文字**: `var(--dark-text)` 变为 `#fcfcfc`
- **次要文字**: `var(--light-text)` 变为 `#a9a9b2`
- **背景色**: 自动适配暗色主题

## 使用示例

```vue
<template>
  <!-- 页面标题 -->
  <h1 class="title is-3">用户管理</h1>
  <p class="subtitle is-6">管理系统用户信息</p>
  
  <!-- 统计卡片 -->
  <div class="stats-card">
    <h3 class="title is-4 common-text-primary">1,234</h3>
    <p class="subtitle is-6">总用户数</p>
  </div>
  
  <!-- 表格内容 -->
  <div class="table-item">
    <span class="common-item-name">用户名</span>
    <span class="common-text-light">user@example.com</span>
  </div>
  
  <!-- 表单帮助文本 -->
  <p class="help">密码长度至少8位</p>
  <p class="help is-danger">用户名已存在</p>
</template>
```

## 响应式设计

所有文字样式都支持响应式设计：
- 在移动端，字体大小会自动调整
- 标题在移动端会适当缩小
- 统计数字在移动端会保持可读性

## 最佳实践

1. **一致性**: 始终使用预定义的颜色变量和字体类
2. **可读性**: 确保文字颜色与背景有足够的对比度
3. **层次性**: 使用不同的字体大小建立清晰的信息层次
4. **可访问性**: 考虑色盲用户，不要仅依赖颜色传达信息
