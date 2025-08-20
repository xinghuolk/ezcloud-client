# 测试故障排除指南

## 🚨 已知问题和解决方案

### 1. TypeScript 类型错误

#### 问题：Vue 3 `<script setup>` 组件方法无法访问

**错误信息:**
```
Property 'methodName' does not exist on type 'ComponentPublicInstance<...>'
```

**原因:** Vue 3 的 `<script setup>` 语法糖不暴露内部方法到组件实例

**解决方案:**
```typescript
// ❌ 避免直接访问组件方法
expect(wrapper.vm.checkEmailExists).toHaveBeenCalled()

// ✅ 测试组件的外部行为
const emailInput = wrapper.find('input[type="email"]')
await emailInput.setValue('test@example.com')
vi.advanceTimersByTime(800)
expect(mockApi.checkUser).toHaveBeenCalledWith({ email: 'test@example.com' })
```

#### 问题：API 响应类型不匹配

**错误信息:**
```
Property 'message' is missing in type '{ success: true; data: ... }'
```

**解决方案:**
```typescript
// ✅ 确保 mock 数据符合 ApiResponse 接口
vi.mocked(api.method).mockResolvedValue({
  success: true,
  message: 'Success',  // 添加必需的 message 字段
  data: mockData
})
```

#### 问题：Device 类型字段不匹配

**错误信息:**
```
Property 'user_id' does not exist in type 'Device'. Did you mean 'userid'?
```

**解决方案:**
```typescript
// ✅ 使用正确的字段名
const mockDevice: Device = {
  id: 1,
  userid: 1,  // 不是 user_id
  serial: 'TEST001',
  // ... 其他字段
}
```

### 2. 测试运行问题

#### 问题：beforeEach 未定义

**错误信息:**
```
Cannot find name 'beforeEach'
```

**解决方案:**
```typescript
// ✅ 确保导入了所需的测试函数
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
```

#### 问题：测试运行缓慢

**症状:** 测试执行时间过长

**解决方案:**
```bash
# 使用并行运行
npm run test -- --pool=threads --minThreads=2 --maxThreads=4

# 只运行相关测试
npm run test -- --changed

# 使用快速模式
npm run test -- --run --no-coverage
```

#### 问题：模拟不生效

**症状:** vi.mocked() 调用没有被识别

**解决方案:**
```typescript
// ✅ 确保模拟在导入之前
vi.mock('/@src/api', () => ({
  deviceApi: {
    getDevices: vi.fn(),
    createDevice: vi.fn()
  }
}))

// ✅ 重置模拟状态
beforeEach(() => {
  vi.clearAllMocks()
})
```

### 3. 组件测试问题

#### 问题：元素不存在

**错误信息:**
```
expect(received).toBe(expected)
Expected: true
Received: false
```

**调试步骤:**
```typescript
it('调试元素查找', () => {
  const wrapper = mountComponent(MyComponent, { props: { open: true } })
  
  // 1. 打印整个组件 HTML
  console.log('Component HTML:', wrapper.html())
  
  // 2. 检查特定元素
  const element = wrapper.find('[data-testid="target-element"]')
  console.log('Element exists:', element.exists())
  console.log('Element text:', element.text())
  
  // 3. 检查所有匹配的元素
  const allElements = wrapper.findAll('.target-class')
  console.log('Found elements:', allElements.length)
})
```

#### 问题：异步更新未生效

**症状:** DOM 更新后的断言失败

**解决方案:**
```typescript
// ✅ 等待 Vue 的下一个更新周期
import { nextTick } from 'vue'

it('异步更新测试', async () => {
  const wrapper = mountComponent(MyComponent)
  
  // 触发更新
  await wrapper.setProps({ newValue: 'updated' })
  
  // 等待 DOM 更新
  await nextTick()
  
  // 现在进行断言
  expect(wrapper.text()).toContain('updated')
})
```

### 4. Store 测试问题

#### 问题：Pinia store 未初始化

**错误信息:**
```
Cannot read properties of undefined (reading 'devices')
```

**解决方案:**
```typescript
import { setActivePinia, createPinia } from 'pinia'

describe('Store 测试', () => {
  beforeEach(() => {
    // ✅ 确保每个测试都有新的 Pinia 实例
    setActivePinia(createPinia())
  })
})
```

#### 问题：Store 方法不存在

**错误信息:**
```
Argument of type '"methodName"' is not assignable to parameter...
```

**解决方案:**
```typescript
// ✅ 直接赋值而非使用 spyOn
beforeEach(() => {
  const store = useDeviceStore()
  store.fetchDevices = vi.fn().mockResolvedValue([])
  store.addDevice = vi.fn().mockResolvedValue({})
})
```

### 5. 集成测试问题

#### 问题：API 模拟冲突

**症状:** 不同测试文件的模拟相互影响

**解决方案:**
```typescript
// ✅ 在每个测试文件中独立配置模拟
beforeEach(() => {
  vi.clearAllMocks()
  
  // 重新配置该测试文件特定的模拟
  vi.mocked(api.method).mockResolvedValue(specificMockData)
})
```

#### 问题：定时器测试不稳定

**症状:** 防抖/节流测试随机失败

**解决方案:**
```typescript
describe('定时器测试', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('防抖测试', async () => {
    const debouncedFn = vi.fn()
    
    // 触发多次调用
    debounce(debouncedFn, 800)('test1')
    debounce(debouncedFn, 800)('test2')
    debounce(debouncedFn, 800)('test3')
    
    // 只有最后一次应该生效
    vi.advanceTimersByTime(800)
    
    expect(debouncedFn).toHaveBeenCalledTimes(1)
    expect(debouncedFn).toHaveBeenCalledWith('test3')
  })
})
```

## 🔧 常用调试工具

### 1. 组件状态检查

```typescript
const debugComponent = (wrapper: any) => {
  console.log('=== 组件调试信息 ===')
  console.log('HTML:', wrapper.html())
  console.log('Text:', wrapper.text())
  console.log('Props:', wrapper.props())
  console.log('Emitted events:', wrapper.emitted())
  console.log('Classes:', wrapper.classes())
  console.log('Attributes:', wrapper.attributes())
}
```

### 2. Store 状态检查

```typescript
const debugStore = (store: any) => {
  console.log('=== Store 调试信息 ===')
  console.log('State:', JSON.stringify(store.$state, null, 2))
  console.log('Getters:', Object.keys(store).filter(key => 
    typeof store[key] === 'function' && !key.startsWith('$')
  ))
}
```

### 3. API 调用检查

```typescript
const debugApiCalls = () => {
  console.log('=== API 调用调试 ===')
  console.log('Device API calls:', vi.mocked(deviceApi.getDevices).mock.calls)
  console.log('Auth API calls:', vi.mocked(authApi.login).mock.calls)
}
```

## 📋 检查清单

### 测试失败时的检查步骤

- [ ] 检查 TypeScript 编译错误
- [ ] 确认所有必需的导入已包含
- [ ] 验证模拟配置正确
- [ ] 检查异步操作是否正确等待
- [ ] 确认测试数据符合类型定义
- [ ] 验证组件 props 传递正确
- [ ] 检查 DOM 元素选择器是否正确

### 性能问题检查

- [ ] 是否使用了并行运行
- [ ] 是否有不必要的重复模拟
- [ ] 测试是否过于复杂需要拆分
- [ ] 是否正确清理定时器和事件监听器

### 覆盖率问题检查

- [ ] 确认覆盖率配置正确
- [ ] 检查排除文件设置
- [ ] 验证测试文件位置正确
- [ ] 确认分支覆盖率计算准确

## 🆘 获取帮助

### 日志和报告

```bash
# 生成详细的测试报告
npm run test -- --reporter=verbose --outputFile=test-report.json

# 生成覆盖率详细报告
npm run test:coverage

# 导出失败测试信息
npm run test -- --reporter=junit --outputFile=failed-tests.xml
```

### 社区资源

- [Vitest Discord](https://chat.vitest.dev/)
- [Vue Test Utils GitHub Issues](https://github.com/vuejs/test-utils/issues)
- [Pinia Discord](https://discord.gg/tJCB3hs5kN)

### 文档链接

- [Vitest 故障排除](https://vitest.dev/guide/troubleshooting.html)
- [Vue Test Utils 常见问题](https://test-utils.vuejs.org/guide/advanced/common-tips.html)
- [Happy DOM 问题跟踪](https://github.com/capricorn86/happy-dom/issues)

---

*最后更新：2024-01-16*