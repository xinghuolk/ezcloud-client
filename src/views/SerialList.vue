<template>
  <div class="serial-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>序列号管理</h3>
          <el-button type="primary" @click="handleGenerate">
            <el-icon><Setting /></el-icon>
            批量生成
          </el-button>
        </div>
      </template>
      
      <div class="content">
        <p>序列号管理页面正在开发中...</p>
        <p>这里将显示序列号批次，支持批量生成序列号、MAC地址分配、Excel导出等功能。</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'

const handleGenerate = () => {
  console.log('批量生成序列号')
}
</script>

<style scoped>
.serial-list {
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