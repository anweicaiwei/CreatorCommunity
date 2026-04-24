<script setup>
import { Link, Delete } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

defineProps({
  txList: Array,
  blockExplorer: String
})

const emit = defineEmits(['clear'])

function shortenHash(hash) {
  if (!hash) return ''
  return hash.slice(0, 10) + '...' + hash.slice(-8)
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 交易类型与颜色的映射关系 - 使用自定义CSS类名
const TX_TYPE_MAP = {
  // 铸造相关 - 绿色系
  '铸造青铜勋章': 'tag-mint-bronze',
  '铸造白银勋章': 'tag-mint-silver',
  '铸造黄金勋章': 'tag-mint-gold',
  'Mint Bronze': 'tag-mint-bronze',
  'Mint Silver': 'tag-mint-silver',
  'Mint Gold': 'tag-mint-gold',
  // 销毁相关 - 红色系
  '销毁勋章': 'tag-burn',
  'Burn': 'tag-burn',
  // 转移相关 - 橙色系
  '转移勋章': 'tag-transfer',
  'Transfer': 'tag-transfer',
  // 提现相关 - 紫色系
  '提现': 'tag-withdraw',
  'Withdraw': 'tag-withdraw',
  // 奖励相关 - 青色系
  '发帖': 'tag-post',
  'Post': 'tag-post',
  '评论帖子': 'tag-comment',
  'Comment': 'tag-comment',
  '领取初始奖励': 'tag-initial',
  'Claim Initial': 'tag-initial',
  // 池操作相关 - 蓝色系
  '创作者池发放': 'tag-creator',
  '互动池发放': 'tag-interact',
  // 转账 - 灰色系
  'CTK转账': 'tag-transfer-token',
  '转账': 'tag-transfer-token',
  // 默认
  'default': 'tag-default'
}

// 获取标签CSS类名
function getTagClass(label) {
  if (!label) return TX_TYPE_MAP['default']
  // 精确匹配
  if (TX_TYPE_MAP[label]) return TX_TYPE_MAP[label]
  // 关键字匹配
  if (label.includes('铸造') || label.includes('Mint')) return 'tag-mint-gold'
  if (label.includes('销毁') || label.includes('Burn')) return 'tag-burn'
  if (label.includes('转移') || label.includes('Transfer')) return 'tag-transfer'
  if (label.includes('提现')) return 'tag-withdraw'
  if (label.includes('发帖') || label.includes('Post')) return 'tag-post'
  if (label.includes('评论')) return 'tag-comment'
  if (label.includes('领取初始') || label.includes('Claim Initial')) return 'tag-initial'
  if (label.includes('创作者池')) return 'tag-creator'
  if (label.includes('互动池')) return 'tag-interact'
  if (label.includes('CTK转账') || label.includes('转账')) return 'tag-transfer-token'
  return TX_TYPE_MAP['default']
}
</script>

<template>
  <Card title="交易历史" icon="List">
    <template #header>
      <div class="card-header">
        <span>交易历史</span>
        <el-button size="small" text @click="emit('clear')" :disabled="!txList || txList.length === 0">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </template>
    <div class="tx-body">
      <el-scrollbar v-if="txList && txList.length > 0" class="tx-scrollbar">
        <div class="tx-list">
          <div v-for="tx in txList" :key="tx.hash" class="tx-item">
            <div class="tx-main">
              <el-tag size="small" effect="plain" :class="getTagClass(tx.label)">{{ tx.label }}</el-tag>
              <el-text class="mono" size="small">{{ shortenHash(tx.hash) }}</el-text>
              <el-text class="tx-time" size="small" type="info">{{ formatTime(tx.timestamp) }}</el-text>
            </div>
            <el-link v-if="blockExplorer" :href="`${blockExplorer}/tx/${tx.hash}`" target="_blank" size="small">
              <el-icon><Link /></el-icon>
            </el-link>
          </div>
        </div>
      </el-scrollbar>
      <el-empty v-else description="暂无交易记录" :image-size="40" />
    </div>
  </Card>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.tx-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.tx-scrollbar {
  height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  min-height: 420px;
}

.tx-scrollbar :deep(.el-scrollbar__view) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  padding: 4px;
  box-sizing: border-box;
}

.tx-scrollbar :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
}

.tx-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  box-sizing: border-box;
}

.tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 0;
}

.tx-item:hover {
  border-color: var(--color-primary);
  transform: scale(1.02);
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.tx-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 1;
  min-width: 0;
}

.mono {
  font-family: monospace;
  color: var(--color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.tx-time {
  flex-shrink: 0;
  white-space: nowrap;
}

@media (min-width: 1100px) and (max-width: 1200px) {
  .tx-time {
    display: none;
  }
}

.tx-body :deep(.el-empty) {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}

/* 暗黑模式样式 */
html.dark .tx-item {
  background: var(--color-background-mute);
}
</style>