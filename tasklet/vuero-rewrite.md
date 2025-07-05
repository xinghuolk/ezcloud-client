 EzCloud Client Vuero 从零重写计划

     概述

     使用 vuero-demo-v3.1.0.zip 作为基础，完全重写 client 应用，同时保持 monorepo 架构和原有业务逻辑。

     阶段1: 环境准备（保持monorepo架构）

     1.1 备份和清理

     - 备份当前 client 目录为 client-original-backup
     - 清空 client 目录（保留 package.json 框架）

     1.2 解压 Vuero Demo

     - 解压 vuero-demo-v3.1.0.zip 内容到临时目录
     - 选择性复制文件到 client 目录（排除 package.json）

     1.3 合并 package.json

     - 保持 name: "ezcloud-client" 
     - 合并 Vuero 依赖到现有 package.json
     - 移除 Element Plus 相关依赖
     - 添加 Vuero/Bulma 相关依赖
     - 保持 workspace 兼容的脚本

     阶段2: 基础架构搭建

     2.1 目录结构调整

     client/
     ├── src/
     │   ├── api/          # 保持原有API层
     │   ├── components/   # Vuero组件系统
     │   ├── layouts/      # Vuero布局系统
     │   ├── pages/        # 使用Vuero的页面结构
     │   ├── stores/       # 保持原有Pinia stores
     │   ├── composables/  # Vuero composables
     │   └── scss/         # Vuero样式系统
     ├── public/           # Vuero资源文件
     └── 配置文件

     2.2 配置文件适配

     - 更新 vite.config.ts 支持 monorepo
     - 调整 tsconfig.json 路径
     - 配置 bulma-css-vars

     阶段3: 业务功能迁移（使用Vuero组件）

     3.1 认证模块

     - 登录页面: 使用 Vuero 的 auth/login-3.vue 模板
     - 用户会话: 迁移 stores/user.ts，使用 Vuero 的 user-session store

     3.2 设备管理模块

     - 设备列表: 
       - 使用 VFlexTable 替代 Element Plus Table
       - 参考 documentation/flex-table/
       - 保留搜索、过滤、分页功能
     - 设备详情:
       - 使用 VCard 系列组件
       - WiFi状态: 使用 VIconBox + VTag
       - 调制解调器状态: 使用 VCard + VProgress

     3.3 管理功能模块

     - 厂商管理: 使用 VFlexTableWrapper
     - 型号管理: 使用 VCard + VModal 编辑
     - 序列号管理: 使用 VFlexTable + 批量操作

     3.4 WiFi模板管理

     - 模板列表: VFlexTable + VDropdown 操作菜单
     - 模板编辑: VModal + VField 表单组件
     - 克隆功能: 使用 Vuero 的表单验证

     3.5 WebSocket功能

     - SSH终端: 
       - 集成到 Vuero 布局中
       - 使用 VCard 包装 xterm.js
       - 保持原有 WebSocket 连接逻辑

     阶段4: 样式和主题

     4.1 品牌定制

     - 更新 scss/abstracts/_variables.scss
     - 自定义主色调适配 EzCloud
     - 调整 logo 和品牌元素

     4.2 响应式适配

     - 利用 Vuero 的响应式系统
     - 确保移动端体验

     阶段5: 集成和测试

     5.1 API 集成

     - 确保所有 API 调用正常
     - 保持与 server 的兼容性

     5.2 功能测试

     - 测试每个迁移的页面
     - 验证 WebSocket 功能
     - 检查权限控制

     5.3 性能优化

     - 优化打包配置
     - 移除未使用的组件
     - 代码分割优化

     关键文件映射

     | 原文件                        | Vuero 对应                 | 说明            |
     |----------------------------|--------------------------|---------------|
     | views/LoginView.vue        | pages/auth/login-3.vue   | 使用样式3的登录页     |
     | views/DeviceList.vue       | pages/devices/index.vue  | 使用 VFlexTable |
     | components/DataTable.vue   | 使用 VFlexTableWrapper     | 数据表格封装        |
     | views/VendorList.vue       | pages/admin/vendors.vue  | 使用侧边栏布局       |
     | views/WiFiTemplateList.vue | pages/wifi/templates.vue | WiFi管理页面      |

     注意事项

     1. 保持 Monorepo 架构
       - 不直接使用 Vuero 的 package.json
       - 手动合并依赖，保持 workspace 名称
     2. API 兼容性
       - 保留原有 api/ 目录结构
       - 不修改 API 调用接口
     3. 渐进式实施
       - 每完成一个模块就测试
       - 保持版本控制，方便回滚
     4. 组件使用参考
       - 始终参考 client/vuero/documentation/
       - 查看 demo 中的实际用例

     这个计划将创建一个全新的、基于 Vuero UI 框架的 EzCloud 客户端，同时保持所有原有功能和 monorepo 架构。