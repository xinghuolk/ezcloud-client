<template>
  <div class="device-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>设备管理</h3>
          <el-button type="primary" @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <div class="content">
        <p>设备列表页面正在开发中...</p>
        <p>这里将显示用户绑定的设备列表，支持筛选、搜索和管理功能。</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'

const handleRefresh = () => {
  console.log('刷新设备列表')
}
</script>

<style scoped>
.device-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
}

.content {
  padding: 20px;
  text-align: center;
  color: #909399;
}
</style> 