<template>
  <div class="dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Welcome back, {{ userStore.userInfo?.username }}!</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon online">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.onlineDevices }}</h3>
            <p>Online Devices</p>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon total">
            <el-icon><Grid /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.totalDevices }}</h3>
            <p>Total Devices</p>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon activated">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.activatedDevices }}</h3>
            <p>Activated Devices</p>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon models">
            <el-icon><Box /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.totalModels }}</h3>
            <p>Device Models</p>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <el-card>
        <template #header>
          <h3>Quick Actions</h3>
        </template>
        
        <div class="actions-grid">
          <el-button 
            type="primary" 
            :icon="Link" 
            size="large"
            @click="$router.push('/devices/bind')"
          >
            Bind Device
          </el-button>
          
          <el-button 
            type="success" 
            :icon="Monitor" 
            size="large"
            @click="$router.push('/devices')"
          >
            View Devices
          </el-button>
          
          <el-button 
            v-if="userStore.isAdmin"
            type="warning" 
            :icon="DocumentAdd" 
            size="large"
            @click="$router.push('/serials')"
          >
            Generate Serials
          </el-button>
          
          <el-button 
            v-if="userStore.isAdmin"
            type="info" 
            :icon="Setting" 
            size="large"
            @click="$router.push('/models')"
          >
            Manage Models
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 最近设备 -->
    <div class="recent-devices">
      <el-card>
        <template #header>
          <div class="card-header">
            <h3>Recent Devices</h3>
            <el-button link @click="$router.push('/devices')">
              View All
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </template>
        
        <el-table :data="recentDevices" style="width: 100%">
          <el-table-column prop="serial" label="Serial Number" width="150" />
          <el-table-column prop="name" label="Device Name" show-overflow-tooltip />
          <el-table-column prop="deviceModel.oemname" label="Brand" width="120" />
          <el-table-column prop="deviceModel.stdname" label="Model" width="120" />
          <el-table-column label="Status" width="100">
            <template #default="{ row }">
              <el-tag :type="row.is_online ? 'success' : 'danger'" size="small">
                {{ row.is_online ? 'Online' : 'Offline' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="last_seen" label="Last Seen" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.last_seen) }}
            </template>
          </el-table-column>
        </el-table>
        
        <div v-if="recentDevices.length === 0" class="empty-state">
          <el-empty description="No devices found">
            <el-button type="primary" @click="$router.push('/devices/bind')">
              Bind Your First Device
            </el-button>
          </el-empty>
        </div>
      </el-card>
    </div>

    <!-- 系统状态（管理员可见） -->
    <div v-if="userStore.isAdmin" class="system-status">
      <el-card>
        <template #header>
          <h3>System Status</h3>
        </template>
        
        <div class="system-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Total Users">
              {{ systemInfo.totalUsers }}
            </el-descriptions-item>
            <el-descriptions-item label="Active Users">
              {{ systemInfo.activeUsers }}
            </el-descriptions-item>
            <el-descriptions-item label="Today's Activations">
              {{ systemInfo.todayActivations }}
            </el-descriptions-item>
            <el-descriptions-item label="Server Uptime">
              {{ systemInfo.uptime }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  Monitor, 
  Grid, 
  CircleCheck, 
  Box, 
  Link, 
  DocumentAdd, 
  Setting, 
  ArrowRight 
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useDeviceStore } from '@/stores/devices'
import { ElMessage } from 'element-plus'
import type { Device } from '@/api/types'

const userStore = useUserStore()
const deviceStore = useDeviceStore()

// 统计数据
const stats = ref({
  totalDevices: 0,
  onlineDevices: 0,
  activatedDevices: 0,
  totalModels: 0
})

// 最近设备
const recentDevices = ref<Device[]>([])

// 系统信息
const systemInfo = ref({
  totalUsers: 0,
  activeUsers: 0,
  todayActivations: 0,
  uptime: '0 days'
})

// 格式化日期时间
const formatDateTime = (dateTime: string | null) => {
  if (!dateTime) return 'Never'
  return new Date(dateTime).toLocaleString()
}

// 加载数据
const loadData = async () => {
  try {
    // 加载设备数据
    await deviceStore.fetchDevices({ limit: 5 })
    recentDevices.value = deviceStore.devices

    // 计算统计数据
    stats.value = {
      totalDevices: deviceStore.deviceCount,
      onlineDevices: deviceStore.onlineDevices.length,
      activatedDevices: deviceStore.activatedDevices.length,
      totalModels: 0 // 需要从模型store获取
    }

    // 如果是管理员，加载系统信息
    if (userStore.isAdmin) {
      // TODO: 调用系统统计API
      systemInfo.value = {
        totalUsers: 156,
        activeUsers: 89,
        todayActivations: 12,
        uptime: '15 days'
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    ElMessage.error('Failed to load dashboard data')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 28px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.online {
  background: linear-gradient(135deg, #67C23A, #85CE61);
}

.stat-icon.total {
  background: linear-gradient(135deg, #409EFF, #66B1FF);
}

.stat-icon.activated {
  background: linear-gradient(135deg, #E6A23C, #EEB969);
}

.stat-icon.models {
  background: linear-gradient(135deg, #909399, #B1B3B8);
}

.stat-info h3 {
  margin: 0 0 5px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.stat-info p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.quick-actions {
  margin-bottom: 30px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.actions-grid .el-button {
  height: 60px;
  font-size: 16px;
}

.recent-devices {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.system-status {
  margin-bottom: 30px;
}

.system-info {
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .page-header h1 {
    font-size: 24px;
  }
  
  .stat-content {
    gap: 10px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .stat-info h3 {
    font-size: 20px;
  }
}
</style>
