# 前端测试架构文档

EzCloud前端测试采用分层架构，提供完整的单元测试和集成测试解决方案。

## 📁 测试目录结构

```
src/tests/
├── README.md                          # 本文档
├── setup.ts                          # 单元测试全局设置
├── unit/                              # 单元测试
│   ├── components/                    # 组件单元测试
│   ├── stores/                        # Pinia store测试
│   ├── utils/                         # 工具函数测试
│   └── api/                          # API模块测试
├── integration/                       # 集成测试
│   ├── setup.ts                      # 集成测试全局设置
│   ├── ApiAdvanced.integration.test.ts      # 高级API测试
│   ├── WebSocketAPI.integration.test.ts     # WebSocket测试
│   ├── DeviceManagement.integration.test.ts # 设备管理测试
│   └── ApiCacheSecurity.integration.test.ts # 缓存安全测试
└── utils/                             # 测试工具
    ├── api-test-factory.ts           # API测试数据工厂
    ├── test-helpers.ts               # 测试辅助工具
    └── component.ts                  # 组件测试工具
```

## 🚀 快速开始

### 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

### 创建新测试

#### 1. 单元测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestEnvironment } from '/@src/tests/utils/test-helpers'
import MyComponent from '/@src/components/MyComponent.vue'

describe('MyComponent', () => {
  const { mockManager, performanceMonitor, cleanup } = createTestEnvironment()

  afterEach(cleanup)

  it('should render correctly', () => {
    const wrapper = mount(MyComponent)
    expect(wrapper.exists()).toBe(true)
  })
})
```

#### 2. 集成测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { 
  createDevice, 
  createApiResponse, 
  AdvancedApiMocker 
} from '/@src/tests/utils/api-test-factory'
import { 
  waitForVueUpdate, 
  expectValidApiResponse 
} from '/@src/tests/utils/test-helpers'

describe('设备管理集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should handle device operations', async () => {
    const device = createDevice({ id: 1 })
    const response = createApiResponse(device)
    
    expectValidApiResponse(response)
    await waitForVueUpdate()
  })
})
```

## 🔧 核心工具介绍

### 1. API测试数据工厂 (`api-test-factory.ts`)

提供标准化的测试数据生成工具：

```typescript
import { 
  createDevice, 
  createUser, 
  createApiResponse,
  createLargeDeviceDataset,
  ApiPerformanceProfiler
} from '/@src/tests/utils/api-test-factory'

// 创建测试设备
const device = createDevice({ id: 1, name: '测试设备' })

// 创建大批量测试数据
const devices = createLargeDeviceDataset(1000, {
  onlineRate: 0.8,
  ownershipRate: 0.6
})

// 性能分析
const profiler = new ApiPerformanceProfiler()
profiler.start()
// ... 执行测试
profiler.end()
console.log(profiler.getReport())
```

### 2. 测试辅助工具 (`test-helpers.ts`)

提供常用的测试辅助函数：

```typescript
import { 
  waitForCondition,
  waitForElement,
  MockManager,
  PerformanceMonitor,
  expectValidApiResponse,
  testErrorBoundary
} from '/@src/tests/utils/test-helpers'

// 等待条件满足
await waitForCondition(() => wrapper.find('.loading').exists() === false)

// Mock管理
const mockManager = new MockManager()
mockManager.register('deviceApi', mockDeviceApi)
mockManager.setApiDelay('deviceApi', 500, mockResponse)

// 性能监控
const monitor = new PerformanceMonitor()
monitor.start()
// ... 执行操作
monitor.measure('api_call')
monitor.expectPerformance('api_call', 1000) // 期望小于1秒
```

### 3. Timer管理工具

```typescript
import { timerUtils } from '/@src/tests/integration/setup'

// 在需要控制时间的测试中
timerUtils.enableFakeTimers()
timerUtils.advanceTimers(1000) // 快进1秒
// Timer会在测试结束后自动清理
```

## 📊 测试覆盖的功能领域

### 🔌 API集成测试

- **高级功能测试** (`ApiAdvanced.integration.test.ts`)
  - 性能和压力测试
  - 网络重试机制
  - 并发竞争处理
  - 版本兼容性测试

- **缓存和安全测试** (`ApiCacheSecurity.integration.test.ts`)
  - 多层缓存策略
  - XSS/CSRF防护
  - SQL注入防护
  - JWT令牌验证

### 🌐 WebSocket实时通信

- **SSH终端连接** (`WebSocketAPI.integration.test.ts`)
  - 连接建立和管理
  - 命令发送和响应
  - 错误处理和重连
  - 并发会话管理

- **设备状态更新**
  - 实时状态同步
  - 批量状态更新
  - 订阅机制管理

### 📱 设备管理流程

- **完整业务流程** (`DeviceManagement.integration.test.ts`)
  - 设备列表和分页
  - 设备绑定操作
  - 状态更新同步
  - 托管管理流程

## 🛠️ 高级测试模式

### 1. 性能测试模式

```typescript
describe('性能测试', () => {
  it('should handle large dataset efficiently', async () => {
    const monitor = new PerformanceMonitor()
    const devices = createLargeDeviceDataset(10000)
    
    monitor.start()
    await deviceStore.loadDevices(devices)
    monitor.measure('large_load')
    
    monitor.expectPerformance('large_load', 2000) // 2秒内完成
  })
})
```

### 2. 错误边界测试

```typescript
describe('错误处理', () => {
  it('should handle API failures gracefully', async () => {
    const error = await testErrorBoundary(
      () => deviceApi.getDevices(),
      'Network timeout'
    )
    
    expect(error.code).toBe('TIMEOUT')
  })
})
```

### 3. 网络模拟测试

```typescript
describe('网络场景', () => {
  it('should retry on network failure', async () => {
    const mocker = new AdvancedApiMocker()
    mocker.setFailureRate('/api/devices', 0.7) // 70%失败率
    mocker.setResponseDelay('/api/devices', 2000) // 2秒延迟
    
    // 测试重试机制
    const result = await deviceApi.getDevicesWithRetry()
    expect(result).toBeDefined()
  })
})
```

## 📋 测试最佳实践

### ✅ 推荐做法

1. **使用数据工厂**：始终使用`api-test-factory.ts`创建测试数据
2. **清理资源**：使用`TestDataCleaner`确保测试后清理
3. **性能监控**：在关键测试中添加性能监控
4. **错误测试**：为每个功能添加错误边界测试
5. **异步等待**：使用`waitForCondition`等待异步操作

### ❌ 避免的做法

1. **硬编码数据**：避免在测试中直接写死测试数据
2. **重复Timer设置**：不要在测试文件中直接调用`vi.useFakeTimers()`
3. **忽略清理**：每个测试后都要清理Mock和数据
4. **同步断言异步**：异步操作必须等待完成后再断言
5. **忽略性能**：关键路径测试应该包含性能验证

## 🔍 调试和故障排除

### 常见问题

1. **Timer冲突**
   ```
   解决：使用timerUtils而不是直接调用vi.useFakeTimers()
   ```

2. **Mock未生效**
   ```typescript
   // 确保在beforeEach中清理Mock
   beforeEach(() => {
     vi.clearAllMocks()
   })
   ```

3. **异步测试不稳定**
   ```typescript
   // 使用waitForCondition等待条件满足
   await waitForCondition(() => wrapper.find('.result').exists())
   ```

4. **性能测试不准确**
   ```typescript
   // 使用PerformanceMonitor获得更准确的测量
   const monitor = new PerformanceMonitor()
   monitor.start()
   // ... 操作
   const duration = monitor.measure('operation')
   ```

### 调试技巧

1. **日志输出**：在测试中使用`console.log`输出中间状态
2. **断点调试**：在IDE中设置断点进行逐步调试
3. **隔离测试**：使用`it.only`运行单个测试
4. **Mock检查**：验证Mock函数的调用次数和参数

## 📈 测试报告和覆盖率

### 生成报告

```bash
# 生成详细的HTML覆盖率报告
npm run test:coverage

# 查看报告
open coverage/index.html
```

### 覆盖率目标

- **单元测试**：90%以上
- **集成测试**：70%以上
- **关键路径**：100%

### CI/CD集成

测试在CI/CD管道中自动运行，包括：

- 所有Pull Request必须通过测试
- 覆盖率不能下降
- 性能回归检测
- 自动生成测试报告

## 🚀 贡献指南

### 添加新测试

1. 确定测试类型（单元/集成）
2. 使用对应的工具和模式
3. 遵循命名约定
4. 添加必要的文档注释
5. 确保测试稳定可重复

### 更新测试工具

1. 在`utils/`目录添加新工具
2. 更新本文档
3. 添加使用示例
4. 确保向后兼容

## 📚 相关资源

- [Vitest官方文档](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [测试最佳实践指南](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [API测试策略](https://martinfowler.com/articles/practical-test-pyramid.html)