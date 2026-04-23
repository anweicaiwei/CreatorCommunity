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
              <el-tag size="small" :class="getTagClass(tx.label)">{{ tx.label }}</el-tag>
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
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 0;
}

.tx-item:hover {
  border-color: #79b8ff;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
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
  color: #6366f1;
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

/* 自定义交易类型标签颜色 */
:deep(.el-tag.tag-mint-bronze) {
  background-color: #f0f4f8;
  border-color: rgba(99, 102, 241, 0.3);
  color: #6366f1;
}

:deep(.el-tag.tag-mint-silver) {
  background-color: #f5f5f5;
  border-color: #d9d9d9;
  color: #595959;
}

:deep(.el-tag.tag-mint-gold) {
  background-color: #fff8e6;
  border-color: #ffd591;
  color: #856404;
}

:deep(.el-tag.tag-burn) {
  background-color: #fff2f0;
  border-color: #ffccc7;
  color: #a8071a;
}

:deep(.el-tag.tag-transfer) {
  background-color: #fff7e6;
  border-color: #ffd8b8;
  color: #d46b08;
}

:deep(.el-tag.tag-withdraw) {
  background-color: #f9f0ff;
  border-color: #d3adf7;
  color: #722ed1;
}

:deep(.el-tag.tag-post) {
  background-color: #e6fffb;
  border-color: #87e8de;
  color: #08979c;
}

:deep(.el-tag.tag-comment) {
  background-color: #f0f5ff;
  border-color: #adc6ff;
  color: #1d39c4;
}

:deep(.el-tag.tag-initial) {
  background-color: #f9f5ff;
  border-color: #b37feb;
  color: #531dab;
}

:deep(.el-tag.tag-creator) {
  background-color: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: #6366f1;
}

:deep(.el-tag.tag-interact) {
  background-color: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: #8b5cf6;
}

:deep(.el-tag.tag-transfer-token) {
  background-color: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.3);
  color: #06b6d4;
}

:deep(.el-tag.tag-default) {
  background-color: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
  color: #6366f1;
}
</style>