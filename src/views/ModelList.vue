<template>
  <div class="model-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>设备型号管理</h3>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增型号
          </el-button>
        </div>
      </template>
      
      <div class="content">
        <p>设备型号管理页面正在开发中...</p>
        <p>这里将显示所有设备型号，支持创建、编辑、删除型号，并管理对应的序列号。</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'

const handleAdd = () => {
  console.log('新增型号')
}
</script>

<style scoped>
.model-list {
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