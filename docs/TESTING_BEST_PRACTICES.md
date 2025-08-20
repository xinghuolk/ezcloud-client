# 前端测试最佳实践 - 快速参考

## 🚀 快速命令

```bash
# 开发阶段常用命令
npm run test:watch              # 监视模式开发
npm run test:ui                 # 可视化测试界面
npm run test:coverage           # 生成覆盖率报告

# 提交前检查
npm run test:all               # 运行所有测试
npm run test:tsc               # TypeScript类型检查
./scripts/run-tests.sh --ci    # CI模式完整检查
```

## 📝 测试文件命名约定

```
组件测试:     ComponentName.test.ts
Store测试:    store-name.test.ts
工具函数测试:  util-name.test.ts
集成测试:     FeatureName.integration.test.ts
```

## 🏗️ 测试结构模板

### 组件测试模板

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountComponent } from '/@src/tests/utils/component'
import ComponentName from '../ComponentName.vue'

// Mock 依赖
vi.mock('/@src/api')

describe('ComponentName.vue', () => {
  describe('渲染测试', () => {
    it('应该正确渲染基本内容', () => {
      const wrapper = mountComponent(ComponentName, {
        props: { /* props */ }
      })
      
      expect(wrapper.find('.main-element').exists()).toBe(true)
    })
  })

  describe('交互测试', () => {
    it('应该响应用户操作', async () => {
      const wrapper = mountComponent(ComponentName)
      
      await wrapper.find('[data-testid="action-button"]').trigger('click')
      
      expect(wrapper.emitted('action')).toBeTruthy()
    })
  })
})
```

### Store 测试模板

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStoreName } from '../store-name'

describe('StoreName Store', () => {
  let store: ReturnType<typeof useStoreName>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useStoreName()
  })

  describe('初始状态', () => {
    it('应该有正确的初始值', () => {
      expect(store.property).toBe(expectedValue)
    })
  })

  describe('异步操作', () => {
    it('应该正确处理数据获取', async () => {
      vi.mocked(api.method).mockResolvedValue(mockData)
      
      await store.fetchData()
      
      expect(store.data).toEqual(expectedData)
    })
  })
})
```

## ✅ Do's (推荐做法)

### 🎯 测试行为，不测试实现

```typescript
// ✅ 测试用户可见的行为
expect(wrapper.find('.success-message').exists()).toBe(true)
expect(wrapper.text()).toContain('操作成功')

// ❌ 避免测试内部实现
expect(wrapper.vm.internalMethod).toHaveBeenCalled()
expect(wrapper.vm.internalState).toBe(value)
```

### 🏷️ 使用语义化选择器

```typescript
// ✅ 使用 data-testid
wrapper.find('[data-testid="submit-button"]')

// ✅ 使用语义化选择器
wrapper.find('button[type="submit"]')
wrapper.find('input[aria-label="用户名"]')

// ❌ 避免使用内部类名
wrapper.find('.btn-primary-lg-submit')
```

### 🏭 使用工厂函数创建测试数据

```typescript
// ✅ 工厂函数防止状态污染
const createMockUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
})

// 使用
const user1 = createMockUser()
const user2 = createMockUser({ id: 2, name: 'Another User' })

// ❌ 避免共享对象
const sharedUser = { id: 1, name: 'Test' } // 多个测试共享会导致状态污染
```

### 🎭 正确模拟依赖

```typescript
// ✅ 模块级模拟
vi.mock('/@src/api', () => ({
  userApi: {
    getUsers: vi.fn(),
    createUser: vi.fn()
  }
}))

// ✅ 在测试中配置行为
beforeEach(() => {
  vi.mocked(userApi.getUsers).mockResolvedValue({
    success: true,
    message: 'Success',
    data: mockUsers
  })
})

// ✅ 重置模拟
afterEach(() => {
  vi.clearAllMocks()
})
```

### ⏰ 正确处理异步操作

```typescript
// ✅ 使用 async/await
it('应该异步加载数据', async () => {
  await store.fetchData()
  expect(store.data).toHaveLength(3)
})

// ✅ 等待 DOM 更新
import { nextTick } from 'vue'
await nextTick()

// ✅ 处理定时器
vi.useFakeTimers()
vi.advanceTimersByTime(1000)
vi.useRealTimers()
```

## ❌ Don'ts (避免的做法)

### 🚫 不要测试第三方库

```typescript
// ❌ 不要测试 Vue Router
expect(wrapper.vm.$router.push).toHaveBeenCalled()

// ✅ 测试路由的结果
expect(wrapper.emitted('navigate')).toBeTruthy()
```

### 🚫 不要依赖测试执行顺序

```typescript
// ❌ 测试间有依赖关系
let sharedData = null

it('第一个测试', () => {
  sharedData = { id: 1 }
})

it('第二个测试依赖第一个', () => {
  expect(sharedData.id).toBe(1) // 危险！
})

// ✅ 每个测试独立
beforeEach(() => {
  // 每个测试都有干净的状态
})
```

### 🚫 不要过度模拟

```typescript
// ❌ 过度模拟导致测试无意义
vi.mock('./utils', () => ({
  formatDate: vi.fn(() => 'mocked'),
  validateEmail: vi.fn(() => true),
  // ... 模拟所有内容
}))

// ✅ 只模拟必要的外部依赖
vi.mock('/@src/api') // 只模拟 API 调用
```

## 🎨 Vue 3 特定最佳实践

### Composition API 组件测试

```typescript
// ✅ 对于 <script setup> 组件，测试外部行为
describe('Vue 3 Composition API 组件', () => {
  it('应该响应 props 变化', async () => {
    const wrapper = mountComponent(MyComponent, {
      props: { count: 1 }
    })
    
    await wrapper.setProps({ count: 2 })
    
    expect(wrapper.text()).toContain('2')
  })
  
  it('应该正确发射事件', async () => {
    const wrapper = mountComponent(MyComponent)
    
    await wrapper.find('[data-testid="increment"]').trigger('click')
    
    expect(wrapper.emitted('update')).toBeTruthy()
  })
})
```

### Pinia Store 测试

```typescript
// ✅ 直接测试 store 实例
it('应该更新状态', () => {
  store.updateUser({ id: 1, name: 'New Name' })
  
  expect(store.currentUser.name).toBe('New Name')
  expect(store.users.find(u => u.id === 1).name).toBe('New Name')
})

// ✅ 测试 computed 属性
it('应该计算派生状态', () => {
  store.users = [
    { id: 1, active: true },
    { id: 2, active: false }
  ]
  
  expect(store.activeUsers).toHaveLength(1)
  expect(store.activeUsers[0].id).toBe(1)
})
```

## 🔍 调试技巧

### 查看组件输出

```typescript
it('调试测试', () => {
  const wrapper = mountComponent(MyComponent)
  
  // 打印组件 HTML
  console.log(wrapper.html())
  
  // 打印组件树
  console.log(wrapper.findComponent(ChildComponent).exists())
  
  // 调试特定元素
  const element = wrapper.find('[data-testid="problem-element"]')
  console.log('Element exists:', element.exists())
  console.log('Element text:', element.text())
  console.log('Element attributes:', element.attributes())
})
```

### 测试失败分析

```typescript
// ✅ 提供清晰的错误信息
expect(wrapper.text()).toContain('Expected text')

// ✅ 使用自定义错误消息
expect(response.status, `API 应该返回 200，但返回了 ${response.status}`).toBe(200)

// ✅ 调试异步操作
console.log('Store state before:', store.items)
await store.fetchItems()
console.log('Store state after:', store.items)
```

## 📊 覆盖率目标

| 测试类型 | 目标覆盖率 | 说明 |
|---------|------------|------|
| 工具函数 | 95%+ | 纯函数，易于达到高覆盖率 |
| 核心业务逻辑 | 90%+ | 关键功能必须充分测试 |
| 组件渲染 | 80%+ | 关注主要渲染路径 |
| 错误处理 | 85%+ | 异常情况必须覆盖 |
| 总体覆盖率 | 80%+ | 项目整体目标 |

## 🚨 常见错误及解决方案

### TypeError: Cannot read property 'x' of undefined

```typescript
// ❌ 问题：未初始化的 props
const wrapper = mountComponent(MyComponent)
expect(wrapper.text()).toContain(wrapper.props().user.name) // Error!

// ✅ 解决：提供必要的 props
const wrapper = mountComponent(MyComponent, {
  props: {
    user: { name: 'Test User' }
  }
})
```

### 异步操作测试失败

```typescript
// ❌ 问题：未等待异步操作
it('测试异步操作', () => {
  store.fetchData() // 没有 await
  expect(store.data).toHaveLength(3) // 可能失败
})

// ✅ 解决：正确处理异步
it('测试异步操作', async () => {
  await store.fetchData()
  expect(store.data).toHaveLength(3)
})
```

### Mock 不生效

```typescript
// ❌ 问题：mock 在 import 之后
import { api } from './api'
vi.mock('./api')

// ✅ 解决：mock 在 import 之前
vi.mock('./api')
import { api } from './api'
```

## 📚 推荐阅读

- [Vue 3 测试官方指南](https://vuejs.org/guide/scaling-up/testing.html)
- [Vitest 最佳实践](https://vitest.dev/guide/best-practices.html)
- [Testing Library 指导原则](https://testing-library.com/docs/guiding-principles/)
- [Pinia 测试食谱](https://pinia.vuejs.org/cookbook/testing.html)

---

*最后更新：2024-01-16*