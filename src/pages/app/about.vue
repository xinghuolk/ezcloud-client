<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Notyf } from 'notyf'
import { formatDateTime } from '/@src/utils/date-formatter'
import { useUserSession } from '/@src/stores/user-session'
import request from '/@src/api/request'

definePage({
  meta: {
    requiresAuth: true
  }
})

const userSession = useUserSession()

// 检查是否有系统查看权限
const hasSystemAccess = computed(() => userSession.hasPermission('system:view'))

const notyf = new Notyf()

// 系统配置数据
const systemConfig = ref<any>(null)
const frpStatus = ref<any>(null)
const isLoadingConfig = ref(false)
const isLoadingStatus = ref(false)

const appInfo = {
  name: 'EzCloud IoT Management Platform',
  version: '2.0.0',
  description: 'A modern IoT device management platform for 5G gateway devices with Vue 3 + Vuero UI',
  features: [
    'Real-time device monitoring',
    'WiFi and modem status tracking',
    'Device model and vendor management',
    'Serial number batch generation',
    'User authentication and authorization',
    'Responsive design for all devices',
    'Dark mode support'
  ],
  technologies: [
    { name: 'Vue 3', description: 'Progressive JavaScript framework' },
    { name: 'TypeScript', description: 'Typed JavaScript at scale' },
    { name: 'Vuero UI', description: 'Modern Vue 3 component library' },
    { name: 'Vite', description: 'Next generation build tool' },
    { name: 'Pinia', description: 'State management for Vue' },
    { name: 'Node.js', description: 'JavaScript runtime for backend' },
    { name: 'Express', description: 'Web framework for Node.js' },
    { name: 'MySQL', description: 'Relational database system' }
  ]
}

// 获取系统配置
const fetchSystemConfig = async () => {
  try {
    isLoadingConfig.value = true
    const response = await request.get('/system/config')
    systemConfig.value = response.data
  } catch (error) {
    console.error('获取系统配置失败:', error)
    notyf.error('获取系统配置失败')
  } finally {
    isLoadingConfig.value = false
  }
}

// 获取FRP状态
const fetchFrpStatus = async () => {
  try {
    isLoadingStatus.value = true
    const response = await request.get('/system/frp/status')
    frpStatus.value = response.data
  } catch (error) {
    console.error('获取FRP状态失败:', error)
    notyf.error('获取FRP状态失败')
  } finally {
    isLoadingStatus.value = false
  }
}

// 重新加载FRP配置
const reloadFrpConfig = async () => {
  try {
    await request.post('/system/frp/reload')
    notyf.success('FRP配置重新加载成功')
    await fetchSystemConfig()
    await fetchFrpStatus()
  } catch (error) {
    console.error('重新加载FRP配置失败:', error)
    notyf.error('重新加载FRP配置失败')
  }
}

// 页面挂载时获取数据
onMounted(async () => {
  await Promise.all([
    fetchSystemConfig(),
    fetchFrpStatus()
  ])
})

useHead({
  title: 'About - EzCloud'
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">{{ appInfo.name }}</h1>
          <p class="subtitle is-6">{{ appInfo.description }}</p>
        </div>
      </div>
    </div>

    <!-- 权限不足提示 -->
    <VCard radius="smooth" v-if="!hasSystemAccess">
      <div class="has-text-centered py-6">
        <iconify-icon icon="lucide:shield-x" class="permission-denied-icon mb-4" />
        <h3 class="title is-4 mb-2">Access Denied</h3>
        <p class="subtitle is-6 mb-4">You don't have permission to view system information.</p>
        <p class="has-text-muted">Please contact your administrator if you need access to this page.</p>
      </div>
    </VCard>

    <!-- 系统信息内容（仅管理员可见） -->
    <template v-else>

    <div class="columns">
      <!-- App Information -->
      <div class="column is-6">
        <VCard radius="smooth" class="mb-6">
          <h3 class="title is-5 mb-4">Application Information</h3>
          
          <div class="app-info-grid">
            <div class="info-item">
              <label>Application Name</label>
              <span>{{ appInfo.name }}</span>
            </div>
            <div class="info-item">
              <label>Version</label>
              <VTag color="primary">v{{ appInfo.version }}</VTag>
            </div>
            <div class="info-item full-width">
              <label>Description</label>
              <span>{{ appInfo.description }}</span>
            </div>
          </div>
        </VCard>

        <!-- Features -->
        <VCard radius="smooth">
          <h3 class="title is-5 mb-4">Key Features</h3>
          
          <div class="features-list">
            <div 
              v-for="feature in appInfo.features" 
              :key="feature"
              class="feature-item"
            >
              <iconify-icon icon="lucide:check-circle" class="feature-icon" />
              <span>{{ feature }}</span>
            </div>
          </div>
        </VCard>
      </div>

      <!-- Technology Stack -->
      <div class="column is-6">
        <VCard radius="smooth">
          <h3 class="title is-5 mb-4">Technology Stack</h3>
          
          <div class="tech-grid">
            <div 
              v-for="tech in appInfo.technologies" 
              :key="tech.name"
              class="tech-item"
            >
              <div class="tech-header">
                <iconify-icon icon="lucide:code" class="tech-icon" />
                <span class="tech-name">{{ tech.name }}</span>
              </div>
              <p class="tech-description">{{ tech.description }}</p>
            </div>
          </div>
        </VCard>
      </div>
    </div>

    <!-- System Status -->
    <VCard radius="smooth" class="mb-6">
      <h3 class="title is-5 mb-4">System Status</h3>
      
      <div class="status-grid">
        <div class="status-item">
          <div class="status-header">
            <iconify-icon icon="lucide:server" class="status-icon" />
            <span>Backend API</span>
          </div>
          <VTag color="success">Online</VTag>
        </div>
        
        <div class="status-item">
          <div class="status-header">
            <iconify-icon icon="lucide:database" class="status-icon" />
            <span>Database</span>
          </div>
          <VTag color="success">Connected</VTag>
        </div>
        
        <div class="status-item">
          <div class="status-header">
            <iconify-icon icon="lucide:wifi" class="status-icon" />
            <span>WebSocket Gateway</span>
          </div>
          <VTag color="success">Active</VTag>
        </div>
        
        <div class="status-item">
          <div class="status-header">
            <iconify-icon icon="lucide:shield-check" class="status-icon" />
            <span>Authentication</span>
          </div>
          <VTag color="success">Secure</VTag>
        </div>
      </div>
    </VCard>

    <!-- Server Configuration -->
    <div class="columns" v-if="systemConfig">
      <div class="column is-6">
        <!-- FRP Configuration -->
        <VCard radius="smooth" class="mb-6">
          <div class="card-header">
            <h3 class="title is-5 mb-2">FRP Configuration</h3>
            <VButton
              icon="lucide:refresh-cw"
              color="primary"
              outlined
              size="small"
              @click="reloadFrpConfig"
              :loading="isLoadingConfig || isLoadingStatus"
            >
              Reload Config
            </VButton>
          </div>
          
          <div class="config-grid">
            <div class="config-item">
              <label>Server Address</label>
              <span>{{ systemConfig.frp.server_addr }}</span>
            </div>
            <div class="config-item">
              <label>Server Port</label>
              <span>{{ systemConfig.frp.server_port }}</span>
            </div>
            <div class="config-item">
              <label>HTTP Vhost Port</label>
              <span>{{ systemConfig.frp.vhost_http_port }}</span>
            </div>
            <div class="config-item">
              <label>Dashboard Port</label>
              <span>{{ systemConfig.frp.dashboard_port }}</span>
            </div>
            <div class="config-item">
              <label>Subdomain Host</label>
              <span>{{ systemConfig.frp.subdomain_host }}</span>
            </div>
            <div class="config-item">
              <label>Allowed Ports</label>
              <span>{{ systemConfig.frp.privilege_allow_ports }}</span>
            </div>
            <div class="config-item">
              <label>Token</label>
              <VTag :color="systemConfig.frp.token_configured ? 'success' : 'warning'">
                {{ systemConfig.frp.token_configured ? 'Configured' : 'Not Set' }}
              </VTag>
            </div>
            <div class="config-item">
              <label>Privilege Token</label>
              <VTag :color="systemConfig.frp.privilege_token_configured ? 'success' : 'warning'">
                {{ systemConfig.frp.privilege_token_configured ? 'Configured' : 'Not Set' }}
              </VTag>
            </div>
          </div>
        </VCard>

        <!-- Environment Information -->
        <VCard radius="smooth">
          <h3 class="title is-5 mb-4">Environment Information</h3>
          
          <div class="config-grid">
            <div class="config-item">
              <label>Environment</label>
              <VTag :color="systemConfig.environment.node_env === 'production' ? 'success' : 'info'">
                {{ systemConfig.environment.node_env }}
              </VTag>
            </div>
            <div class="config-item">
              <label>Docker Environment</label>
              <VTag :color="systemConfig.environment.docker_env ? 'primary' : 'light'">
                {{ systemConfig.environment.docker_env ? 'Yes' : 'No' }}
              </VTag>
            </div>
            <div class="config-item">
              <label>Application Version</label>
              <span>{{ systemConfig.environment.version }}</span>
            </div>
            <div class="config-item">
              <label>API Port</label>
              <span>{{ systemConfig.application.port }}</span>
            </div>
            <div class="config-item">
              <label>WebSocket Port</label>
              <span>{{ systemConfig.application.ws_port }}</span>
            </div>
            <div class="config-item">
              <label>Log Level</label>
              <span>{{ systemConfig.application.log_level }}</span>
            </div>
          </div>
        </VCard>
      </div>

      <div class="column is-6">
        <!-- FRP Status -->
        <VCard radius="smooth" class="mb-6" v-if="frpStatus">
          <h3 class="title is-5 mb-4">FRP Service Status</h3>
          
          <div class="config-grid">
            <div class="config-item">
              <label>Service Running</label>
              <VTag :color="frpStatus.is_running ? 'success' : 'danger'">
                {{ frpStatus.is_running ? 'Running' : 'Stopped' }}
              </VTag>
            </div>
            <div class="config-item">
              <label>External Process</label>
              <VTag :color="frpStatus.external_process ? 'info' : 'light'">
                {{ frpStatus.external_process ? 'Yes' : 'No' }}
              </VTag>
            </div>
            <div class="config-item">
              <label>Active Tunnels</label>
              <span>{{ frpStatus.tunnels_count }}</span>
            </div>
            <div class="config-item">
              <label>Process Management</label>
              <VTag :color="frpStatus.process_manage_enabled ? 'success' : 'warning'">
                {{ frpStatus.process_manage_enabled ? 'Enabled' : 'Disabled' }}
              </VTag>
            </div>
            <div class="config-item full-width" v-if="frpStatus.uptime">
              <label>Uptime</label>
              <span>{{ formatDateTime(frpStatus.uptime) }}</span>
            </div>
          </div>

          <!-- Port Status -->
          <div class="mt-4" v-if="frpStatus.port_status">
            <h4 class="title is-6 mb-3">Port Status</h4>
            <div class="port-status-grid">
              <div 
                v-for="(status, portName) in frpStatus.port_status" 
                :key="portName"
                class="port-status-item"
              >
                <div class="port-info">
                  <span class="port-name">{{ portName }}</span>
                  <span class="port-number">:{{ status.port }}</span>
                </div>
                <VTag :color="status.status === 'listening' ? 'success' : 'danger'">
                  {{ status.status === 'listening' ? 'Listening' : 'Not Listening' }}
                </VTag>
              </div>
            </div>
          </div>

          <!-- Allocated Ports -->
          <div class="mt-4" v-if="frpStatus.allocated_ports && frpStatus.allocated_ports.length > 0">
            <h4 class="title is-6 mb-3">Allocated Ports</h4>
            <div class="allocated-ports">
              <VTag 
                v-for="port in frpStatus.allocated_ports" 
                :key="port"
                color="primary"
                size="small"
                class="mr-2 mb-2"
              >
                {{ port }}
              </VTag>
            </div>
          </div>
        </VCard>

        <!-- Database & Redis Configuration -->
        <VCard radius="smooth">
          <h3 class="title is-5 mb-4">Data Storage Configuration</h3>
          
          <div class="config-section">
            <h4 class="title is-6 mb-3">Database (MySQL)</h4>
            <div class="config-grid">
              <div class="config-item">
                <label>Host</label>
                <span>{{ systemConfig.database.host }}</span>
              </div>
              <div class="config-item">
                <label>Port</label>
                <span>{{ systemConfig.database.port }}</span>
              </div>
              <div class="config-item">
                <label>Database Name</label>
                <span>{{ systemConfig.database.name }}</span>
              </div>
              <div class="config-item">
                <label>User</label>
                <span>{{ systemConfig.database.user }}</span>
              </div>
              <div class="config-item">
                <label>Password</label>
                <VTag :color="systemConfig.database.password_configured ? 'success' : 'warning'">
                  {{ systemConfig.database.password_configured ? 'Configured' : 'Not Set' }}
                </VTag>
              </div>
            </div>
          </div>

          <div class="config-section mt-4">
            <h4 class="title is-6 mb-3">Cache (Redis)</h4>
            <div class="config-grid">
              <div class="config-item">
                <label>Host</label>
                <span>{{ systemConfig.redis.host }}</span>
              </div>
              <div class="config-item">
                <label>Port</label>
                <span>{{ systemConfig.redis.port }}</span>
              </div>
              <div class="config-item">
                <label>Password</label>
                <VTag :color="systemConfig.redis.password_configured ? 'success' : 'warning'">
                  {{ systemConfig.redis.password_configured ? 'Configured' : 'Not Set' }}
                </VTag>
              </div>
            </div>
          </div>
        </VCard>
      </div>
    </div>

    <!-- Loading State -->
    <VCard radius="smooth" v-else-if="isLoadingConfig">
      <div class="has-text-centered py-6">
        <VPlaceload />
        <p class="mt-4">Loading system configuration...</p>
      </div>
    </VCard>
    
    </template>
  </div>
</template>

<style lang="scss" scoped>

.permission-denied-icon {
  font-size: 4rem;
  color: var(--danger);
}

.app-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;

  .info-item {
    padding: 1rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);

    &.full-width {
      grid-column: 1 / -1;
    }

    label {
      display: block;
      font-weight: 600;
      color: var(--muted-grey);
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    span {
      color: var(--dark-text);
      font-weight: 500;
    }
  }
}

.features-list {
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: var(--radius);
    margin-bottom: 0.5rem;
    transition: all 0.3s;

    &:hover {
      background: var(--fade-grey-light-6);
    }

    .feature-icon {
      color: var(--success);
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    span {
      color: var(--dark-text);
      font-weight: 500;
    }
  }
}

.tech-grid {
  display: grid;
  gap: 1rem;

  .tech-item {
    padding: 1.5rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);
    transition: all 0.3s;

    &:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }

    .tech-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;

      .tech-icon {
        color: var(--primary);
        font-size: 1.1rem;
      }

      .tech-name {
        font-weight: 600;
        color: var(--dark-text);
      }
    }

    .tech-description {
      color: var(--muted-grey);
      font-size: 0.9rem;
      margin: 0;
      line-height: 1.4;
    }
  }
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);

    .status-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .status-icon {
        color: var(--primary);
        font-size: 1.2rem;
      }

      span {
        font-weight: 600;
        color: var(--dark-text);
      }
    }
  }
}

// 新增样式
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;

  .config-item {
    padding: 1rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);

    &.full-width {
      grid-column: 1 / -1;
    }

    label {
      display: block;
      font-weight: 600;
      color: var(--muted-grey);
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    span {
      color: var(--dark-text);
      font-weight: 500;
    }
  }
}

.config-section {
  padding: 1rem 0;
  border-bottom: 1px solid var(--fade-grey-light-3);

  &:last-child {
    border-bottom: none;
  }
}

.port-status-grid {
  display: grid;
  gap: 0.75rem;

  .port-status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);

    .port-info {
      display: flex;
      align-items: center;
      gap: 0.25rem;

      .port-name {
        font-weight: 600;
        color: var(--dark-text);
        text-transform: capitalize;
      }

      .port-number {
        color: var(--muted-grey);
        font-family: monospace;
        font-size: 0.9rem;
      }
    }
  }
}

.allocated-ports {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.is-dark {
  .info-item,
  .tech-item,
  .status-item,
  .config-item,
  .port-status-item {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
  }

  .feature-item {
    &:hover {
      background: var(--dark-sidebar-light-6);
    }
  }

  .config-section {
    border-color: var(--dark-sidebar-light-12);
  }
}

@media only screen and (max-width: 767px) {
  .page-content-inner {
    padding: 1rem;
  }

  .app-info-grid,
  .status-grid {
    grid-template-columns: 1fr;
  }

  .columns {
    display: block;

    .column {
      width: 100%;
      margin-bottom: 1rem;
    }
  }
}
</style>