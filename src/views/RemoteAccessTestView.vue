<template>
  <div class="remote-access-test">
    <el-card class="demo-card">
      <template #header>
        <h3>远程访问功能演示</h3>
      </template>
      
      <div class="demo-content">
        <el-alert
          title="演示说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>此页面演示设备远程访问功能，包括：</p>
            <ul>
              <li><strong>HTTP访问</strong>: 通过Web浏览器访问设备管理界面</li>
              <li><strong>SSH访问</strong>: 启动SSH隧道访问设备终端</li>
            </ul>
          </template>
        </el-alert>

        <!-- 模拟设备列表 -->
        <div class="device-demo">
          <h4>模拟设备</h4>
          <el-table :data="mockDevices" style="width: 100%">
            <el-table-column prop="serial" label="序列号" width="150" />
            <el-table-column prop="name" label="设备名称" width="150" />
            <el-table-column label="在线状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.is_online ? 'success' : 'danger'" size="small">
                  {{ row.is_online ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="远程访问" width="220">
              <template #default="{ row }">
                <RemoteAccessButton
                  :device="row"
                  :show-status-indicators="true"
                  @status-change="handleStatusChange"
                />
              </template>
            </el-table-column>
            <el-table-column label="说明" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.description }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 状态日志 -->
        <div class="status-log">
          <h4>状态日志</h4>
          <el-card class="log-card">
            <div class="log-content">
              <div v-for="(log, index) in statusLogs" :key="index" class="log-item">
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-device">{{ log.device }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
              <div v-if="statusLogs.length === 0" class="no-logs">
                暂无状态变化日志
              </div>
            </div>
          </el-card>
        </div>

        <!-- 功能说明 -->
        <div class="feature-docs">
          <h4>功能说明</h4>
          <el-collapse v-model="activeCollapse">
            <el-collapse-item title="HTTP访问功能" name="http">
              <div class="feature-content">
                <h5>工作原理</h5>
                <ol>
                  <li>用户点击"Web访问"按钮</li>
                  <li>前端发送HTTP API请求到服务端</li>
                  <li>服务端通过WebSocket向设备发送frp_http指令</li>
                  <li>设备接收指令，执行frpctl命令建立HTTP隧道</li>
                  <li>隧道建立成功后，用户可通过subdomain访问设备</li>
                </ol>
                
                <h5>访问方式</h5>
                <code>https://{设备序列号}.dev.outdoorrouter.net</code>
                
                <h5>特点</h5>
                <ul>
                  <li>基于frp的subdomain模式</li>
                  <li>无需记住IP地址和端口</li>
                  <li>支持HTTPS安全访问</li>
                  <li>自动域名解析</li>
                </ul>
              </div>
            </el-collapse-item>
            
            <el-collapse-item title="SSH访问功能" name="ssh">
              <div class="feature-content">
                <h5>工作原理</h5>
                <ol>
                  <li>用户点击"SSH访问"按钮</li>
                  <li>服务端分配可用端口(12000-13000范围)</li>
                  <li>通过WebSocket向设备发送frp_ssh指令</li>
                  <li>设备接收指令，执行frpctl命令建立TCP隧道</li>
                  <li>隧道建立成功后，显示SSH连接信息</li>
                </ol>
                
                <h5>连接方式</h5>
                <code>ssh root@服务器地址 -p {分配端口}</code>
                
                <h5>特点</h5>
                <ul>
                  <li>动态端口分配，避免冲突</li>
                  <li>基于frp的TCP端口转发</li>
                  <li>支持标准SSH客户端</li>
                  <li>30分钟无活动自动关闭</li>
                </ul>
              </div>
            </el-collapse-item>
            
            <el-collapse-item title="技术架构" name="architecture">
              <div class="feature-content">
                <h5>前端架构</h5>
                <ul>
                  <li><strong>RemoteAccessButton</strong>: 远程访问按钮组件</li>
                  <li><strong>HTTP API</strong>: 基于axios的HTTP请求</li>
                  <li><strong>状态轮询</strong>: 定时查询连接状态</li>
                  <li><strong>响应式设计</strong>: 适配移动端访问</li>
                </ul>
                
                <h5>后端架构</h5>
                <ul>
                  <li><strong>WebSocket网关</strong>: 设备长连接管理</li>
                  <li><strong>指令服务</strong>: frp指令下发和状态管理</li>
                  <li><strong>端口池管理</strong>: SSH端口动态分配</li>
                  <li><strong>frps集成</strong>: 内置frp服务器</li>
                </ul>
                
                <h5>设备端架构</h5>
                <ul>
                  <li><strong>ezcloud组件</strong>: WebSocket客户端</li>
                  <li><strong>frpc-lua</strong>: 轻量级frp客户端</li>
                  <li><strong>frpctl命令</strong>: 隧道控制接口</li>
                  <li><strong>状态上报</strong>: 连接状态监控</li>
                </ul>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import RemoteAccessButton from '@/components/RemoteAccessButton.vue'
import type { Device } from '@/api/types'
import type { RemoteAccessStatus } from '@/api/remote-access'

// 响应式数据
const activeCollapse = ref(['http', 'ssh'])
const statusLogs = ref<Array<{
  timestamp: Date
  device: string
  message: string
}>>([])

// 模拟设备数据
const mockDevices = reactive<Device[]>([
  {
    id: 1,
    serial: 'TEST001',
    name: '测试设备1',
    model_id: 1,
    primary_mac: '00:11:22:33:44:55',
    is_online: true,
    is_activate: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deviceModel: {
      id: 1,
      oemname: 'TestBrand',
      stdname: 'TestModel',
      devtype: 'Router'
    }
  },
  {
    id: 2,
    serial: 'TEST002',
    name: '测试设备2',
    model_id: 1,
    primary_mac: '00:11:22:33:44:66',
    is_online: false,
    is_activate: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deviceModel: {
      id: 1,
      oemname: 'TestBrand',
      stdname: 'TestModel',
      devtype: 'Gateway'
    }
  },
  {
    id: 3,
    serial: 'TEST003',
    name: '测试设备3',
    model_id: 1,
    primary_mac: '00:11:22:33:44:77',
    is_online: true,
    is_activate: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deviceModel: {
      id: 1,
      oemname: 'TestBrand',
      stdname: 'TestModel',
      devtype: 'CPE'
    }
  }
])

// 为模拟设备添加描述
mockDevices.forEach((device, index) => {
  const descriptions = [
    '演示HTTP访问功能，点击Web访问按钮体验',
    '离线设备演示，按钮将被禁用',
    '演示SSH访问功能，点击SSH访问按钮体验'
  ]
  ;(device as any).description = descriptions[index]
})

// 方法
const handleStatusChange = (device: Device, status: RemoteAccessStatus) => {
  const timestamp = new Date()
  const deviceName = `${device.name}(${device.serial})`
  
  let message = ''
  if (status.http.status !== 'disconnected') {
    message += `HTTP: ${getStatusText(status.http.status)}`
  }
  if (status.ssh.status !== 'disconnected') {
    if (message) message += ', '
    message += `SSH: ${getStatusText(status.ssh.status)}`
    if (status.ssh.port) {
      message += ` (端口: ${status.ssh.port})`
    }
  }
  
  if (message) {
    statusLogs.value.unshift({
      timestamp,
      device: deviceName,
      message: `状态变化 - ${message}`
    })
    
    // 只保留最近20条日志
    if (statusLogs.value.length > 20) {
      statusLogs.value = statusLogs.value.slice(0, 20)
    }
  }
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'connecting': '连接中',
    'connected': '已连接',
    'disconnected': '已断开',
    'error': '连接错误'
  }
  return statusMap[status] || status
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN')
}
</script>

<style scoped>
.remote-access-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.demo-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.device-demo h4,
.status-log h4,
.feature-docs h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.log-card {
  background-color: #fafafa;
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.log-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.log-time {
  color: #909399;
  margin-right: 12px;
  min-width: 80px;
}

.log-device {
  color: #409eff;
  margin-right: 12px;
  min-width: 120px;
  font-weight: 500;
}

.log-message {
  color: #303133;
  flex: 1;
}

.no-logs {
  color: #909399;
  text-align: center;
  padding: 20px;
  font-style: italic;
}

.feature-content {
  padding: 16px 0;
}

.feature-content h5 {
  color: #409eff;
  margin: 16px 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.feature-content ol,
.feature-content ul {
  margin: 8px 0;
  padding-left: 20px;
}

.feature-content li {
  margin: 4px 0;
  line-height: 1.5;
}

.feature-content code {
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #e6a23c;
  font-size: 13px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .remote-access-test {
    padding: 10px;
  }
  
  .log-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .log-time,
  .log-device {
    min-width: unset;
  }
}
</style> 