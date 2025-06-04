<template>
  <div class="home-container">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <h2>欢迎使用 EzCloud 设备管理平台</h2>
          <p>物联网设备管理的完整解决方案</p>
        </div>
      </template>
      
      <div class="content">
        <el-row :gutter="20">
          <!-- 快速导航 -->
          <el-col :span="24" :md="12" :lg="8">
            <el-card shadow="hover" class="nav-card">
              <div class="nav-item" @click="navigateTo('/models')">
                <el-icon size="40" color="#409EFF">
                  <Setting />
                </el-icon>
                <h3>设备型号管理</h3>
                <p>管理设备型号信息，创建和维护不同厂商的设备型号</p>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="24" :md="12" :lg="8">
            <el-card shadow="hover" class="nav-card">
              <div class="nav-item" @click="navigateTo('/serials')">
                <el-icon size="40" color="#67C23A">
                  <Document />
                </el-icon>
                <h3>序列号管理</h3>
                <p>批量生成和管理设备序列号，支持MAC地址分配</p>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="24" :md="12" :lg="8">
            <el-card shadow="hover" class="nav-card">
              <div class="nav-item" @click="navigateTo('/devices')">
                <el-icon size="40" color="#E6A23C">
                  <Monitor />
                </el-icon>
                <h3>设备管理</h3>
                <p>查看和管理已绑定的设备，监控设备状态</p>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 系统信息 -->
        <el-row :gutter="20" style="margin-top: 30px;">
          <el-col :span="24">
            <el-card>
              <template #header>
                <h3>系统概览</h3>
              </template>
              <el-row :gutter="20">
                <el-col :span="6">
                  <div class="stat-item">
                    <div class="stat-number">{{ stats.totalModels }}</div>
                    <div class="stat-label">设备型号</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-item">
                    <div class="stat-number">{{ stats.totalSerials }}</div>
                    <div class="stat-label">序列号</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-item">
                    <div class="stat-number">{{ stats.totalDevices }}</div>
                    <div class="stat-label">设备总数</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="stat-item">
                    <div class="stat-number">{{ stats.onlineDevices }}</div>
                    <div class="stat-label">在线设备</div>
                  </div>
                </el-col>
              </el-row>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 用户信息 -->
        <el-row style="margin-top: 30px;">
          <el-col :span="24">
            <el-card>
              <template #header>
                <h3>用户信息</h3>
              </template>
              <el-descriptions :column="2" border v-if="userInfo">
                <el-descriptions-item label="用户名">{{ userInfo.username }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{ userInfo.email }}</el-descriptions-item>
                <el-descriptions-item label="角色">
                  <el-tag :type="userInfo.role === 'admin' ? 'danger' : 'primary'">
                    {{ userInfo.role === 'admin' ? '管理员' : '普通用户' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag type="success">{{ userInfo.is_active ? '激活' : '禁用' }}</el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Setting, Document, Monitor } from '@element-plus/icons-vue'

const router = useRouter()

// 用户信息
const userInfo = ref<any>(null)

// 统计数据
const stats = reactive({
  totalModels: 0,
  totalSerials: 0,
  totalDevices: 0,
  onlineDevices: 0
})

// 导航到指定页面
const navigateTo = (path: string) => {
  router.push(path)
}

// 获取用户信息
const getUserInfo = () => {
  const userInfoStr = localStorage.getItem('user_info')
  if (userInfoStr) {
    userInfo.value = JSON.parse(userInfoStr)
  }
}

// 获取统计数据
const getStats = async () => {
  // TODO: 调用实际的统计API
  // 这里先使用模拟数据
  stats.totalModels = 0
  stats.totalSerials = 0
  stats.totalDevices = 0
  stats.onlineDevices = 0
}

onMounted(() => {
  getUserInfo()
  getStats()
})
</script>

<style scoped>
.home-container {
  padding: 20px;
}

.welcome-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-weight: 600;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 16px;
}

.content {
  padding: 20px 0;
}

.nav-card {
  height: 180px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.nav-item {
  text-align: center;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.nav-item h3 {
  margin: 15px 0 10px 0;
  color: #303133;
  font-size: 18px;
}

.nav-item p {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.stat-item {
  text-align: center;
  padding: 20px;
}

.stat-number {
  font-size: 36px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
}

@media (max-width: 768px) {
  .home-container {
    padding: 10px;
  }
  
  .nav-card {
    height: auto;
  }
  
  .nav-item {
    padding: 15px;
  }
  
  .stat-number {
    font-size: 24px;
  }
}
</style>
