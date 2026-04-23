<script setup>
import {
  Wallet,
  List,
  Switch,
  Coin,
  ChatDotRound,
  Medal,
  DataAnalysis,
  Setting,
  Refresh
} from '@element-plus/icons-vue'

const props = defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  refreshBtn: { type: Boolean, default: false },
  refreshLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['refresh'])

// 图标名称到组件的映射
const iconMap = {
  Wallet,
  List,
  Switch,
  Coin,
  ChatDotRound,
  Medal,
  DataAnalysis,
  Setting,
  Refresh
}

defineSlots()
</script>

<template>
  <el-card class="light-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="card-header-left">
          <el-icon v-if="icon && iconMap[icon]" class="card-icon">
            <component :is="iconMap[icon]" />
          </el-icon>
          <span class="card-title">{{ title }}</span>
        </div>
        <div class="card-header-right">
          <el-button
            v-if="refreshBtn"
            type="primary"
            size="small"
            :loading="refreshLoading"
            @click="emit('refresh')"
            class="card-refresh-btn"
          >
            <span>刷新</span>
          </el-button>
        </div>
      </div>
    </template>
    <div class="card-body">
      <slot />
    </div>
  </el-card>
</template>

<style scoped>
.light-card {
  --el-card-header-padding: 14px 20px;
  --el-card-padding: 20px;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.06);
  transition: box-shadow 0.3s, border-color 0.3s, transform 0.3s;
  position: relative;
  z-index: 0;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.light-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
  opacity: 0.9;
  border-radius: 12px 12px 0 0;
}

.light-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header-right {
  display: flex;
  align-items: center;
}

.card-icon {
  font-size: 20px;
  color: #6366f1;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e1b4b;
}

.card-refresh-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: #fff;
  font-weight: 500;
  padding: 8px 12px;
}

.card-refresh-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
}

.card-refresh-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
