<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import en from 'element-plus/es/locale/lang/en'
import {
  House,
  Monitor,
  Link,
  Setting,
  Shop,
  Grid,
  Document,
  User,
  ArrowDown,
  SwitchButton
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

onMounted(() => {
  // 初始化用户认证状态
  userStore.initializeAuth()
})

const handleCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(
          'Are you sure you want to logout?',
          'Confirm Logout',
          {
            confirmButtonText: 'Logout',
            cancelButtonText: 'Cancel',
            type: 'warning'
          }
        )
        
        userStore.logout()
        ElMessage.success('Logged out successfully')
        router.push('/login')
      } catch {
        // 用户取消
      }
      break
  }
}
</script>

<template>
  <el-config-provider :locale="en">
    <div id="app">
      <!-- 如果是登录页面，不显示布局 -->
      <router-view v-if="$route.name === 'login'" />
      
      <!-- 主应用布局 -->
      <el-container v-else class="app-container" direction="horizontal">
        <!-- 侧边栏 -->
        <el-aside width="250px" class="sidebar">
          <div class="logo">
            <h3>EzCloud</h3>
            <p>Device Management</p>
          </div>
          
          <el-menu
            :default-active="$route.path"
            class="sidebar-menu"
            router
            unique-opened
          >
            <el-menu-item index="/">
              <el-icon><House /></el-icon>
              <span>Dashboard</span>
            </el-menu-item>
            
            <el-menu-item index="/devices">
              <el-icon><Monitor /></el-icon>
              <span>My Devices</span>
            </el-menu-item>
            
            <el-menu-item index="/devices/bind">
              <el-icon><Link /></el-icon>
              <span>Bind Device</span>
            </el-menu-item>
            
            <el-menu-item index="/wifi-templates">
              <el-icon><Setting /></el-icon>
              <span>WiFi Templates</span>
            </el-menu-item>
            
            <!-- 管理员菜单 -->
            <el-sub-menu v-if="userStore.isAdmin" index="/admin">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>Administration</span>
              </template>
              
              <el-menu-item index="/vendors">
                <el-icon><Shop /></el-icon>
                <span>Vendor Management</span>
              </el-menu-item>
              
              <el-menu-item index="/models">
                <el-icon><Grid /></el-icon>
                <span>Device Models</span>
              </el-menu-item>
              
              <el-menu-item index="/serials">
                <el-icon><Document /></el-icon>
                <span>Serial Numbers</span>
              </el-menu-item>
            </el-sub-menu>
            
            <el-menu-item index="/profile">
              <el-icon><User /></el-icon>
              <span>Profile</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        
        <!-- 主内容区域 -->
        <el-container direction="vertical" style="flex: 1; min-width: 0; width: 100%;">
          <!-- 顶部栏 -->
          <el-header height="60px" class="header">
            <div class="header-left">
              <el-breadcrumb separator="/">
                <el-breadcrumb-item :to="{ path: '/' }">Home</el-breadcrumb-item>
                <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
              </el-breadcrumb>
            </div>
            
            <div class="header-right">
              <el-dropdown @command="handleCommand">
                <div class="user-info">
                  <el-avatar :size="32" :icon="User" />
                  <span class="username">{{ userStore.userInfo?.username }}</span>
                  <el-icon class="arrow-down"><ArrowDown /></el-icon>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="profile">
                      <el-icon><User /></el-icon>
                      Profile
                    </el-dropdown-item>
                    <el-dropdown-item divided command="logout">
                      <el-icon><SwitchButton /></el-icon>
                      Logout
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </el-header>
          
          <!-- 主内容 -->
          <el-main class="main-content">
            <router-view />
          </el-main>
        </el-container>
      </el-container>
    </div>
  </el-config-provider>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.sidebar {
  background-color: #304156;
  color: white;
  overflow: hidden;
  flex-shrink: 0;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #3e4853;
}

.logo h3 {
  margin: 0 0 5px 0;
  color: #ffffff;
  font-size: 20px;
  font-weight: bold;
}

.logo p {
  margin: 0;
  color: #bfcbd9;
  font-size: 12px;
}

.sidebar-menu {
  border: none;
  background-color: transparent;
}

.sidebar-menu :deep(.el-menu-item) {
  color: #bfcbd9;
  border-left: 3px solid transparent;
}

.sidebar-menu :deep(.el-menu-item:hover),
.sidebar-menu :deep(.el-menu-item.is-active) {
  background-color: #263445 !important;
  border-left-color: #409eff;
  color: #ffffff;
}

.sidebar-menu :deep(.el-sub-menu__title) {
  color: #bfcbd9;
}

.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background-color: #263445 !important;
  color: #ffffff;
}

.header {
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px !important;
  flex-shrink: 0;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.username {
  font-size: 14px;
  color: #303133;
}

.arrow-down {
  font-size: 12px;
  color: #909399;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  width: 100%;
  max-width: none;
}

/* 全局样式重置 */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* Element Plus 容器修复 */
.el-container {
  width: 100%;
  height: 100%;
}

.el-main {
  padding: 0 !important;
  width: 100%;
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px !important;
  }
  
  .logo h3 {
    font-size: 16px;
  }
  
  .main-content {
    padding: 15px;
  }
}
</style>
