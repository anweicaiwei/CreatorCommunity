<script setup>
import { computed, ref } from 'vue'
import { Refresh, Wallet, ChatLineSquare, Medal, Coin, Loading } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

const props = defineProps({
  readData: Object,
  readError: String,
  readLoading: Boolean,
  labelMap: Object,
  isWalletConnected: Boolean
})

const emit = defineEmits(['refresh'])

// 排除的字段（不在此处显示）
const excluding = ['myNFTs','myBronzeBoost', 'mySilverBoost', 'myGoldBoost', 'theoreticalBoost']

// 定义分类
const categories = [
  {
    key: 'account',
    title: '账户信息',
    icon: Wallet,
    fields: ['ctkBalance', 'hasClaimedInitial']
  },
  {
    key: 'interaction',
    title: '互动状态',
    icon: ChatLineSquare,
    fields: ['postCooldown', 'commentCooldown']
  },
  {
    key: 'nft',
    title: '勋章信息',
    icon: Medal,
    fields: ['nftBoost', 'bronzePrice', 'silverPrice', 'goldPrice', 'nftCount', 'myBronze', 'mySilver', 'myGold']
  },
  {
    key: 'rewards',
    title: '待提现奖励',
    icon: Coin,
    fields: ['pendingPostReward', 'pendingCommentReward', 'pendingInitialReward', 'pendingTotalReward']
  }
]

// 格式化布尔值
function formatValue(key, val) {
  if (typeof val === 'boolean') {
    return val ? '是' : '否'
  }
  return val
}

// 获取分类后的数据
const categorizedData = computed(() => {
  return categories.map(cat => ({
    ...cat,
    items: cat.fields
      .filter(field => !excluding.includes(field) && props.readData[field] !== undefined)
      .map(field => ({
        label: props.labelMap[field] || field,
        value: formatValue(field, props.readData[field])
      }))
  })).filter(cat => cat.items.length > 0)
})
</script>

<template>
  <Card title="当前账户相关信息" icon="DataAnalysis" :refresh-btn="true" :refresh-loading="readLoading" @refresh="emit('refresh')">
    <!-- 重新连接时的加载动画 -->
    <div v-if="props.isWalletConnected && readLoading" class="reconnecting-overlay">
      <el-icon class="reconnect-spinner" :size="28"><Loading /></el-icon>
      <span class="reconnect-text">正在重新加载账户数据...</span>
    </div>

    <!-- 错误提示 -->
    <el-text v-else-if="readError" type="danger" size="small" class="data-error">{{ readError }}</el-text>

    <!-- 分类卡片展示 -->
    <el-scrollbar v-else-if="Object.keys(readData).length" class="data-scrollbar">
      <div class="data-category-container">
        <div v-for="category in categorizedData" :key="category.key" class="data-category-card">
          <div class="data-category-header">
            <div class="data-category-icon">
              <el-icon><component :is="category.icon" /></el-icon>
            </div>
            <span class="data-category-title">{{ category.title }}</span>
          </div>
          <div class="data-category-items">
            <div v-for="item in category.items" :key="item.label" class="data-item">
              <span class="data-item-label">{{ item.label }}</span>
              <span class="data-item-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>

    <!-- 无数据提示 -->
    <el-empty v-else description="暂无账户数据，请先连接钱包并刷新" :image-size="60" />
  </Card>
</template>

<style scoped>
.data-error {
  display: block;
  margin-bottom: 12px;
}

.data-scrollbar {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.data-category-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  padding: 0 4px 4px 0;
}

.data-category-card {
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.2s ease;
}

.data-category-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
}

.data-category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
}

.data-category-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.data-category-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e1b4b;
}

.data-category-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.data-item:not(:last-child) {
  border-bottom: 1px dashed rgba(99, 102, 241, 0.08);
}

.data-item-label {
  font-size: 13px;
  color: #64748b;
}

.data-item-value {
  font-size: 13px;
  font-weight: 500;
  color: #1e1b4b;
  text-align: right;
  max-width: 55%;
  word-break: break-all;
}

.reconnecting-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.reconnect-spinner {
  color: #409eff;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.reconnect-text {
  font-size: 14px;
  color: #909399;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
