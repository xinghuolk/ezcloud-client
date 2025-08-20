# EzCloud Frontend 测试指南

本文档提供 EzCloud 前端项目的完整测试解决方案，包括单元测试、集成测试的最佳实践和详细指导。

## 目录

- [测试架构概述](#测试架构概述)
- [快速开始](#快速开始)
- [测试配置](#测试配置)
- [单元测试指南](#单元测试指南)
- [集成测试指南](#集成测试指南)
- [最佳实践](#最佳实践)
- [CI/CD 集成](#ci-cd-集成)
- [故障排除](#故障排除)

## 测试架构概述

### 技术栈

- **测试框架**: [Vitest](https://vitest.dev/) - Vue 3 + Vite 原生测试解决方案
- **组件测试**: [@vue/test-utils](https://test-utils.vuejs.org/) - Vue 官方测试工具
- **DOM 环境**: [happy-dom](https://github.com/capricorn86/happy-dom) - 轻量级 DOM 实现
- **状态管理测试**: [@pinia/testing](https://pinia.vuejs.org/cookbook/testing.html) - Pinia 测试工具
- **模拟工具**: [vitest-mock-extended](https://github.com/marchaos/vitest-mock-extended) - 增强的模拟功能
- **覆盖率**: [@vitest/coverage-v8](https://vitest.dev/guide/coverage.html) - V8 覆盖率报告

### 测试结构

```
client/
├── src/
│   ├── components/
│   │   └── __tests__/           # 组件单元测试
│   ├── stores/
│   │   └── __tests__/           # Store 单元测试
│   ├── utils/
│   │   └── __tests__/           # 工具函数单元测试
│   └── tests/
│       ├── setup.ts             # 全局测试设置
│       ├── integration/         # 集成测试
│       │   ├── setup.ts         # 集成测试设置
│       │   ├── ApiIntegration.test.ts
│       │   └── DeviceManagement.integration.test.ts
│       └── utils/               # 测试工具
│           ├── component.ts     # 组件测试助手
│           ├── store.ts         # Store 测试助手
│           └── api.ts           # API 模拟助手
├── scripts/
│   └── run-tests.sh            # 测试运行脚本
├── vitest.config.ts            # 单元测试配置
├── vitest.integration.config.ts # 集成测试配置
└── coverage/                   # 覆盖率报告目录
```

### 测试类型分布

- **单元测试 (80%)**: 组件、Store、工具函数的独立测试
- **集成测试 (20%)**: API 集成、组件交互、完整工作流测试

## 快速开始

### 1. 安装和配置

项目已包含所有必要的测试依赖，无需额外安装。

### 2. 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:run

# 运行集成测试
npm run test:integration:run

# 运行所有测试（单元+集成）
npm run test:all

# 生成覆盖率报告
npm run test:coverage

# 交互式测试UI
npm run test:ui

# 监视模式
npm run test:watch

# TypeScript 类型检查
npm run test:tsc
```

### 3. 使用测试脚本

```bash
# 使用功能强大的测试脚本
./scripts/run-tests.sh --help

# 只运行单元测试
./scripts/run-tests.sh --unit

# 只运行集成测试
./scripts/run-tests.sh --integration

# 生成完整覆盖率报告
./scripts/run-tests.sh --coverage

# CI 模式运行
./scripts/run-tests.sh --ci
```

## 测试配置

### 单元测试配置 (vitest.config.ts)

```typescript
export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: [{ find: '/@src/', replacement: fileURLToPath(new URL('./src/', import.meta.url)) }],
  },
  test: {
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: { branches: 80, functions: 80, lines: 80, statements: 80 }
      }
    }
  }
})
```

### 集成测试配置 (vitest.integration.config.ts)

集成测试使用单独的配置文件，提供：
- 更长的超时时间（30秒）
- 专门的设置文件
- 独立的覆盖率报告目录
- 适配的覆盖率阈值（70%）

## 单元测试指南

### 组件测试

#### 基本组件测试结构

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mountComponent } from '/@src/tests/utils/component'
import MyComponent from '../MyComponent.vue'

describe('MyComponent.vue', () => {
  describe('渲染测试', () => {
    it('应该正确渲染基本内容', () => {
      const wrapper = mountComponent(MyComponent, {
        props: { title: 'Test Title' }
      })
      
      expect(wrapper.text()).toContain('Test Title')
      expect(wrapper.find('.component-class').exists()).toBe(true)
    })
  })

  describe('交互测试', () => {
    it('应该响应用户点击', async () => {
      const wrapper = mountComponent(MyComponent)
      
      await wrapper.find('button').trigger('click')
      
      expect(wrapper.emitted('click')).toBeTruthy()
    })
  })
})
```

#### Vue 3 Composition API 组件测试

对于使用 `<script setup>` 的组件，测试应关注组件的外部行为而非内部实现：

```typescript
// ❌ 避免直接访问组件实例
expect(wrapper.vm.internalMethod).toHaveBeenCalled()

// ✅ 测试组件的外部行为
expect(wrapper.find('.success-message').exists()).toBe(true)
expect(wrapper.emitted('success')).toBeTruthy()
```

#### 组件 Props 和 Events 测试

```typescript
it('应该正确处理 props', () => {
  const wrapper = mountComponent(MyComponent, {
    props: { disabled: true, variant: 'primary' }
  })
  
  expect(wrapper.classes()).toContain('is-disabled')
  expect(wrapper.classes()).toContain('is-primary')
})

it('应该发射正确的事件', async () => {
  const wrapper = mountComponent(MyComponent)
  
  await wrapper.find('form').trigger('submit')
  
  const emittedEvents = wrapper.emitted('submit')
  expect(emittedEvents).toBeTruthy()
  expect(emittedEvents[0]).toEqual([{ formData: expect.any(Object) }])
})
```

### Store 测试 (Pinia)

#### 基本 Store 测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMyStore } from '../my-store'

describe('MyStore', () => {
  let store: ReturnType<typeof useMyStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMyStore()
  })

  describe('状态管理', () => {
    it('应该有正确的初始状态', () => {
      expect(store.items).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('计算属性', () => {
    it('应该正确计算 itemCount', () => {
      store.items = [{ id: 1 }, { id: 2 }]
      expect(store.itemCount).toBe(2)
    })
  })

  describe('异步操作', () => {
    it('应该正确获取数据', async () => {
      // Mock API
      vi.mocked(api.getItems).mockResolvedValue({
        success: true,
        data: [{ id: 1, name: 'Item 1' }]
      })

      await store.fetchItems()

      expect(store.items).toHaveLength(1)
      expect(store.loading).toBe(false)
    })
  })
})
```

### 工具函数测试

```typescript
import { describe, it, expect } from 'vitest'
import { formatDate, validateEmail } from '../utils'

describe('工具函数', () => {
  describe('formatDate', () => {
    it('应该格式化日期', () => {
      const date = new Date('2024-01-01T12:00:00Z')
      expect(formatDate(date)).toBe('2024-01-01')
    })

    it('应该处理无效日期', () => {
      expect(formatDate(null)).toBe('--')
      expect(formatDate(undefined)).toBe('--')
    })
  })

  describe('validateEmail', () => {
    it('应该验证有效邮箱', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true)
    })

    it('应该拒绝无效邮箱', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('')).toBe(false)
      expect(validateEmail(null)).toBe(false)
    })
  })
})
```

## 集成测试指南

### API 集成测试

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { deviceApi } from '/@src/api'
import { useDeviceStore } from '/@src/stores/devices'

vi.mock('/@src/api')

describe('设备管理集成测试', () => {
  let deviceStore: ReturnType<typeof useDeviceStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    deviceStore = useDeviceStore()
    vi.clearAllMocks()
  })

  it('应该完成完整的设备列表加载流程', async () => {
    // 准备测试数据
    const mockDevices = [
      { id: 1, serial: 'DEV001', name: 'Device 1' },
      { id: 2, serial: 'DEV002', name: 'Device 2' }
    ]

    // Mock API 响应
    vi.mocked(deviceApi.getDevices).mockResolvedValue({
      success: true,
      message: 'Success',
      data: {
        devices: mockDevices,
        pagination: { page: 1, limit: 20, total: 2, pages: 1 }
      }
    })

    // 执行操作
    await deviceStore.fetchDevices()

    // 验证结果
    expect(deviceApi.getDevices).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(deviceStore.devices).toEqual(mockDevices)
    expect(deviceStore.deviceCount).toBe(2)
    expect(deviceStore.loading).toBe(false)
  })
})
```

### 组件交互集成测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { mountComponent } from '/@src/tests/utils/component'
import DeviceList from '../DeviceList.vue'
import { useDeviceStore } from '/@src/stores/devices'

describe('设备列表组件集成测试', () => {
  let deviceStore: ReturnType<typeof useDeviceStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    deviceStore = useDeviceStore()
  })

  it('应该完成设备选择和操作的完整流程', async () => {
    // 准备测试数据
    deviceStore.devices = [
      { id: 1, serial: 'DEV001', name: 'Device 1', is_online: true },
      { id: 2, serial: 'DEV002', name: 'Device 2', is_online: false }
    ]

    const wrapper = mountComponent(DeviceList)
    await nextTick()

    // 验证设备列表渲染
    expect(wrapper.findAll('[data-testid="device-item"]')).toHaveLength(2)

    // 选择设备
    const firstDeviceCheckbox = wrapper.find('[data-testid="device-checkbox-1"]')
    await firstDeviceCheckbox.setChecked(true)

    // 验证选择状态
    expect(deviceStore.selectedDevices).toContain(1)

    // 触发批量操作
    const batchOperationButton = wrapper.find('[data-testid="batch-operation"]')
    await batchOperationButton.trigger('click')

    // 验证操作结果
    expect(wrapper.emitted('batchOperation')).toBeTruthy()
  })
})
```

## 最佳实践

### 1. 测试数据管理

#### 使用工厂函数创建测试数据

```typescript
// ✅ 好的做法：工厂函数
const createMockDevice = (overrides: Partial<Device> = {}): Device => ({
  id: 1,
  serial: 'TEST001',
  name: 'Test Device',
  is_online: true,
  is_activate: true,
  ...overrides
})

// 使用
const device1 = createMockDevice()
const device2 = createMockDevice({ id: 2, serial: 'TEST002' })
```

#### 避免共享可变对象

```typescript
// ❌ 避免：共享对象会导致测试间状态污染
const sharedDevice = { id: 1, name: 'Device' }

// ✅ 好的做法：每个测试使用独立实例
const createMockDevice = () => ({ id: 1, name: 'Device' })
```

### 2. 模拟策略

#### API 模拟

```typescript
import { vi } from 'vitest'
import { deviceApi } from '/@src/api'

// ✅ 模块级别模拟
vi.mock('/@src/api', () => ({
  deviceApi: {
    getDevices: vi.fn(),
    createDevice: vi.fn(),
    updateDevice: vi.fn(),
    deleteDevice: vi.fn()
  }
}))

// 在测试中配置具体行为
beforeEach(() => {
  vi.mocked(deviceApi.getDevices).mockResolvedValue({
    success: true,
    message: 'Success',
    data: { devices: [], pagination: {} }
  })
})
```

#### 时间和定时器模拟

```typescript
import { vi } from 'vitest'

describe('防抖功能测试', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('应该在800ms后执行防抖函数', async () => {
    const debouncedFn = vi.fn()
    
    // 触发防抖函数
    debounce(debouncedFn, 800)('test')
    
    // 立即检查 - 不应该被调用
    expect(debouncedFn).not.toHaveBeenCalled()
    
    // 快进时间
    vi.advanceTimersByTime(800)
    
    // 现在应该被调用
    expect(debouncedFn).toHaveBeenCalledWith('test')
  })
})
```

### 3. 错误处理测试

```typescript
describe('错误处理', () => {
  it('应该处理网络错误', async () => {
    vi.mocked(deviceApi.getDevices).mockRejectedValue(new Error('Network Error'))

    await store.fetchDevices()

    expect(store.error).toBe('Failed to fetch devices')
    expect(store.loading).toBe(false)
    expect(notyf.error).toHaveBeenCalledWith('Network Error')
  })

  it('应该处理API错误响应', async () => {
    vi.mocked(deviceApi.getDevices).mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      data: null
    })

    await store.fetchDevices()

    expect(store.error).toBe('Unauthorized')
    expect(store.devices).toEqual([])
  })
})
```

### 4. 组件测试最佳实践

#### 测试用户行为而非实现细节

```typescript
// ❌ 避免：测试实现细节
expect(wrapper.vm.isVisible).toBe(true)

// ✅ 好的做法：测试用户可见的行为
expect(wrapper.find('.modal').classes()).toContain('is-active')
```

#### 使用语义化的查询方法

```typescript
// ✅ 使用 data-testid
expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true)

// ✅ 使用角色和文本内容
expect(wrapper.find('button[role="submit"]').text()).toBe('提交')

// ❌ 避免依赖内部类名
expect(wrapper.find('.btn-primary-submit-form').exists()).toBe(true)
```

### 5. 测试覆盖率最佳实践

#### 关注重要路径

- **优先级 1**: 核心业务逻辑、用户关键路径
- **优先级 2**: 错误处理、边界条件
- **优先级 3**: UI 交互、状态变化
- **优先级 4**: 样式和布局（通常不需要单元测试）

#### 覆盖率目标

- **总体覆盖率**: 80%+
- **核心业务模块**: 90%+
- **工具函数**: 95%+
- **组件渲染**: 80%+

## CI/CD 集成

项目包含完整的 GitHub Actions 工作流配置，包括：

### 工作流任务

1. **TypeScript 类型检查**: 确保类型安全
2. **单元测试**: 在 Node.js 18 和 20 上运行
3. **集成测试**: 测试 API 集成和组件交互
4. **构建测试**: 验证生产构建
5. **代码质量**: 综合覆盖率检查和阈值验证

### 覆盖率阈值

- **单元测试**: 80% (lines, functions, branches, statements)
- **集成测试**: 70% (适当降低以适应集成测试的特点)
- **综合覆盖率**: 80% (所有测试的综合结果)

### 工作流特性

- **并发控制**: 取消同一分支的旧运行
- **矩阵构建**: 支持多个 Node.js 版本
- **覆盖率上传**: 自动上传到 Codecov
- **构件保存**: 保存测试结果和覆盖率报告
- **详细报告**: 在 GitHub Actions 摘要中显示测试结果

## 故障排除

### 常见问题

#### 1. 测试运行缓慢

```bash
# 使用并行运行
npm run test -- --threads --pool=threads

# 只运行更改的文件
npm run test -- --changed

# 使用监视模式进行开发
npm run test:watch
```

#### 2. 模拟不生效

```typescript
// 确保模拟在导入之前
vi.mock('/@src/api')
import { deviceApi } from '/@src/api'

// 确保每个测试后重置模拟
afterEach(() => {
  vi.clearAllMocks()
})
```

#### 3. 异步测试失败

```typescript
// 使用 async/await
it('应该处理异步操作', async () => {
  await store.fetchDevices()
  expect(store.devices).toHaveLength(2)
})

// 等待 DOM 更新
import { nextTick } from 'vue'
await nextTick()
```

#### 4. TypeScript 类型错误

对于使用 `<script setup>` 的 Vue 3 组件：

```typescript
// ❌ 避免直接访问组件实例
wrapper.vm.someMethod()

// ✅ 测试组件的外部行为
expect(wrapper.find('.result').text()).toBe('expected')
```

#### 5. 覆盖率报告不准确

```bash
# 清理覆盖率缓存
rm -rf coverage/
npm run test:coverage
```

### 调试技巧

#### 1. 使用测试调试器

```typescript
import { screen, debug } from '@testing-library/vue'

it('调试测试', () => {
  const wrapper = mountComponent(MyComponent)
  
  // 打印组件HTML
  console.log(wrapper.html())
  
  // 在浏览器中查看
  wrapper.vm.$el.setAttribute('data-debug', 'true')
})
```

#### 2. 查看失败的测试

```bash
# 只运行失败的测试
npm run test -- --run --reporter=verbose

# 生成详细的错误报告
npm run test -- --reporter=verbose --outputFile=test-results.xml
```

#### 3. 性能分析

```bash
# 生成性能报告
npm run test -- --reporter=verbose --outputFile=performance-report.json
```

## 相关资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [Pinia 测试指南](https://pinia.vuejs.org/cookbook/testing.html)
- [Vue 3 测试最佳实践](https://vuejs.org/guide/scaling-up/testing.html)
- [Happy DOM 文档](https://github.com/capricorn86/happy-dom)

---

## 更新日志

- **2024-01-16**: 完整测试架构实施
- **2024-01-16**: CI/CD 工作流配置
- **2024-01-16**: 测试覆盖率配置和阈值设置
- **2024-01-16**: 单元测试和集成测试示例
- **2024-01-16**: 测试工具和助手函数