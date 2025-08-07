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

// Google OAuth认证相关状态
const oauthStatus = ref<any>(null)
const isLoadingOAuth = ref(false)
const isAuthenticating = ref(false)

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

// 获取Google OAuth认证状态
const fetchOAuthStatus = async () => {
  try {
    isLoadingOAuth.value = true
    const response = await request.get('/auth/google/status')
    oauthStatus.value = response.data
  } catch (error) {
    console.error('获取OAuth状态失败:', error)
    // 如果没有权限或服务未启用，静默处理
    oauthStatus.value = { enabled: false, authenticated: false }
  } finally {
    isLoadingOAuth.value = false
  }
}

// 开始OAuth认证
const startOAuthAuthentication = async () => {
  try {
    isAuthenticating.value = true
    const response = await request.get('/auth/google/oauth-url?popup=true')
    
    if (response.success && response.data.authUrl) {
      // 在新窗口中打开Google OAuth认证页面
      const authWindow = window.open(
        response.data.authUrl,
        'oauth-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes'
      )
      
      if (authWindow) {
        // 监听认证窗口关闭事件
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed)
            console.log('OAuth认证窗口已关闭，刷新认证状态')
            // 窗口关闭后刷新OAuth状态
            setTimeout(() => {
              fetchOAuthStatus()
            }, 1000) // 延迟1秒确保后端处理完成
          }
        }, 1000)
        
        // 10分钟后自动停止检查（防止内存泄漏）
        setTimeout(() => {
          clearInterval(checkClosed)
        }, 600000)
        
        notyf.info('请在新窗口中完成Google OAuth认证')
      } else {
        notyf.error('无法打开认证窗口，请检查浏览器弹窗阻止设置')
      }
    } else {
      notyf.error('获取认证URL失败')
    }
  } catch (error) {
    console.error('开始OAuth认证失败:', error)
    notyf.error('开始OAuth认证失败')
  } finally {
    isAuthenticating.value = false
  }
}

// 检查URL参数中的认证结果
const checkOAuthResult = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const status = urlParams.get('status')
  const configuredAt = urlParams.get('configured_at')
  const error = urlParams.get('error')

  if (status === 'oauth_success') {
    notyf.success('邮件认证配置成功！')
    if (configuredAt) {
      console.log('认证配置时间:', decodeURIComponent(configuredAt))
    }
    // 清除URL参数
    window.history.replaceState({}, document.title, window.location.pathname)
    // 刷新OAuth状态
    fetchOAuthStatus()
  } else if (error) {
    let errorMessage = '认证失败'
    switch (error) {
      case 'oauth_disabled':
        errorMessage = 'Google Workspace功能未启用'
        break
      case 'missing_code':
        errorMessage = '缺少授权码'
        break
      case 'invalid_grant':
        errorMessage = '授权码无效或已过期'
        break
      case 'access_denied':
        errorMessage = '用户拒绝了授权'
        break
      default:
        errorMessage = `认证错误: ${error}`
    }
    notyf.error(errorMessage)
    // 清除URL参数
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

// 页面挂载时获取数据
onMounted(async () => {
  // 先检查OAuth认证结果
  checkOAuthResult()
  
  // 并行获取系统数据
  await Promise.all([
    fetchSystemConfig(),
    fetchFrpStatus(),
    fetchOAuthStatus()
  ])
})

useHead({
  title: 'About - Ezen Cloud'
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
              size="medium"
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
        <VCard radius="smooth" class="mb-6">
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

        <!-- Google OAuth Email Authentication -->
        <VCard radius="smooth" v-if="oauthStatus || isLoadingOAuth">
          <div class="card-header" v-if="!isLoadingOAuth">
            <h3 class="title is-5 mb-2">Administrator Email Authentication</h3>
            <VButton
              v-if="oauthStatus?.enabled && !oauthStatus?.authenticated"
              icon="lucide:mail-check"
              color="primary"
              outlined
              size="medium"
              @click="startOAuthAuthentication"
              :loading="isAuthenticating"
            >
              Start Authentication
            </VButton>
            <VButton
              v-else-if="oauthStatus?.enabled && oauthStatus?.authenticated"
              icon="lucide:rotate-ccw"
              color="warning"
              outlined
              size="medium"
              @click="startOAuthAuthentication"
              :loading="isAuthenticating"
            >
              Re-authenticate
            </VButton>
          </div>

          <!-- Loading State -->
          <div v-if="isLoadingOAuth" class="has-text-centered py-6">
            <VPlaceload />
            <p class="mt-4">Loading OAuth authentication status...</p>
          </div>
          
          <div v-else-if="oauthStatus" class="config-grid">
            <div class="config-item">
              <label>Service Status</label>
              <VTag :color="oauthStatus?.enabled ? 'success' : 'warning'">
                {{ oauthStatus?.enabled ? 'Enabled' : 'Disabled' }}
              </VTag>
            </div>
            <div class="config-item">
              <label>Authentication Status</label>
              <VTag :color="oauthStatus?.authenticated ? 'success' : 'danger'">
                {{ oauthStatus?.authenticated ? 'Authenticated' : 'Not Authenticated' }}
              </VTag>
            </div>
            <div class="config-item" v-if="oauthStatus?.senderEmail">
              <label>Sender Email</label>
              <span>{{ oauthStatus.senderEmail }}</span>
            </div>
            <div class="config-item full-width" v-if="oauthStatus?.configuredAt">
              <label>Configuration Time</label>
              <span>{{ formatDateTime(oauthStatus.configuredAt) }}</span>
            </div>
            <div class="config-item" v-if="oauthStatus?.accessTokenExpired">
              <label>Token Status</label>
              <VTag color="warning">
                Access Token Expired
              </VTag>
            </div>
          </div>

          <!-- Service Not Enabled Warning -->
          <div class="mt-4" v-if="oauthStatus && !oauthStatus.enabled">
            <VMessage color="warning" class="mb-0">
              <p class="mb-2">
                <iconify-icon icon="lucide:info" class="mr-2" />
                <strong>Google Workspace Service Not Enabled</strong>
              </p>
              <p class="is-size-7">
                To enable administrator email authentication, configure the Google Workspace service in your environment settings.
              </p>
            </VMessage>
          </div>

          <!-- Authentication Instructions -->
          <div class="mt-4" v-if="oauthStatus?.enabled && !oauthStatus?.authenticated">
            <VMessage color="info" class="mb-0">
              <p class="mb-2">
                <iconify-icon icon="lucide:shield-check" class="mr-2" />
                <strong>Administrator Email Authentication Required</strong>
              </p>
              <p class="is-size-7">
                Configure Gmail API access for system email sending. Click "Start Authentication" to begin the OAuth2.0 flow.
              </p>
            </VMessage>
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
                size="tiny"
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