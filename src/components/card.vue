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
} from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  refreshBtn: { type: Boolean, default: false },
  refreshLoading: { type: Boolean, default: false }
});

const emit = defineEmits(['refresh']);

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
};

defineSlots();
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
            <span>{{ t('common.button.refresh') }}</span>
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
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background:
    linear-gradient(var(--gradient-primary)) top / 100% 3px no-repeat,
    var(--color-background-soft);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.3s, border-color 0.3s, transform 0.3s, background-color 0.3s;
  position: relative;
  z-index: 0;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.light-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-lg);
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
  color: var(--color-primary);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.card-refresh-btn {
  background: var(--gradient-primary);
  border: none;
  color: var(--color-text-inverse);
  font-weight: 500;
  padding: 8px 12px;
}

.card-refresh-btn:hover:not(:disabled) {
  background: var(--gradient-primary-hover);
}

.card-refresh-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 暗黑模式覆盖 */
</style>
