<script setup>
import { computed } from 'vue'
import { Link, Loading } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card.vue'

const { t } = useI18n()

const props = defineProps({
  txList: Array,
  scope: {
    type: String,
    default: 'account'
  },
  loading: Boolean,
  blockExplorer: String
})

const emit = defineEmits(['change-scope'])

const historyScopeOptions = computed(() => [
  { label: t('modules.tx_history.scope.account'), value: 'account' },
  { label: t('modules.tx_history.scope.shared'), value: 'shared' }
])

const activeScopeIndex = computed(() =>
  historyScopeOptions.value.findIndex((option) => option.value === props.scope) === 1 ? 1 : 0
)

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

const LEGACY_LABEL_KEY_MAP = {
  '铸造青铜勋章': 'modules.tx_history.label.mint_bronze',
  '铸造白银勋章': 'modules.tx_history.label.mint_silver',
  '铸造黄金勋章': 'modules.tx_history.label.mint_gold',
  '销毁勋章': 'modules.tx_history.label.burn',
  '转移勋章': 'modules.tx_history.label.transfer_medal',
  '领取初始奖励': 'modules.tx_history.label.claim_initial',
  '创作者池发放': 'modules.tx_history.label.creator_reward',
  '互动池发放': 'modules.tx_history.label.interact_reward',
  'CTK转账': 'modules.tx_history.label.ctk_transfer',
  '重置勋章价格': 'modules.tx_history.label.reset_price',
  '随机调价': 'modules.tx_history.label.adjust_price',
  '提现帖奖': 'modules.tx_history.label.withdraw_post',
  '提现评奖': 'modules.tx_history.label.withdraw_comment',
  '提现初始奖': 'modules.tx_history.label.withdraw_initial',
  '全部提现': 'modules.tx_history.label.withdraw_all',
  '提取全部可提取CTK': 'modules.tx_history.label.withdraw_all_ctk',
  '提取溢出CTK': 'modules.tx_history.label.withdraw_overflow'
}

function getTxLabel(tx) {
  if (tx.label_key) return t(tx.label_key, tx.label_params || {})
  if (!tx.label) return t('modules.tx_history.label.default')
  const exactKey = LEGACY_LABEL_KEY_MAP[tx.label]
  if (exactKey) return t(exactKey)
  if (tx.label.includes('发帖')) return `${t('modules.tx_history.label.post')} ${tx.label.replace('发帖', '').trim()}`
  if (tx.label.includes('评论帖子')) return `${t('modules.tx_history.label.comment')} ${tx.label.replace('评论帖子', '').trim()}`
  if (tx.label.includes('销毁勋章')) return `${t('modules.tx_history.label.burn')} ${tx.label.replace('销毁勋章', '').trim()}`
  if (tx.label.includes('转移勋章')) return `${t('modules.tx_history.label.transfer_medal')} ${tx.label.replace('转移勋章', '').trim()}`
  if (tx.label.includes('提取') && tx.label.includes('CTK')) return tx.label
  return tx.label
}

// 获取标签CSS类名
function getTagClass(tx) {
  const label = tx?.label || ''
  const key = tx?.label_key || ''
  if (key.includes('mint_bronze')) return 'tag-mint-bronze'
  if (key.includes('mint_silver')) return 'tag-mint-silver'
  if (key.includes('mint_gold')) return 'tag-mint-gold'
  if (key.includes('burn')) return 'tag-burn'
  if (key.includes('transfer_medal')) return 'tag-transfer'
  if (key.includes('withdraw')) return 'tag-withdraw'
  if (key.includes('post')) return 'tag-post'
  if (key.includes('comment')) return 'tag-comment'
  if (key.includes('claim_initial')) return 'tag-initial'
  if (key.includes('creator_reward')) return 'tag-creator'
  if (key.includes('interact_reward')) return 'tag-interact'
  if (key.includes('ctk_transfer')) return 'tag-transfer-token'
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
  <Card :title="t('modules.tx_history.title')" icon="List">
    <template #header>
      <div class="card-header">
        <span>{{ t('modules.tx_history.title') }}</span>
        <div
          class="history-scope"
          role="tablist"
          :style="{ '--active-index': activeScopeIndex }"
        >
          <span class="history-scope__thumb" aria-hidden="true"></span>
          <button
            v-for="option in historyScopeOptions"
            :key="option.value"
            class="history-scope__item"
            :class="{ 'is-active': (scope || 'account') === option.value }"
            type="button"
            role="tab"
            :aria-selected="(scope || 'account') === option.value"
            @click="emit('change-scope', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </template>
    <div class="tx-body">
      <div v-if="loading" class="tx-reconnecting-overlay">
        <el-icon class="tx-reconnect-spinner" :size="28"><Loading /></el-icon>
        <span class="tx-reconnect-text">{{ t('modules.tx_history.loading_all') }}</span>
      </div>
      <el-scrollbar v-else-if="txList && txList.length > 0" class="tx-scrollbar">
        <div class="tx-list">
          <div v-for="tx in txList" :key="tx.hash" class="tx-item">
            <div class="tx-main">
              <el-tag size="small" effect="plain" :class="getTagClass(tx)">{{ getTxLabel(tx) }}</el-tag>
              <el-text class="mono" size="small">{{ shortenHash(tx.hash) }}</el-text>
              <el-text class="tx-time" size="small" type="info">{{ formatTime(tx.timestamp) }}</el-text>
            </div>
            <el-link v-if="blockExplorer" :href="`${blockExplorer}/tx/${tx.hash}`" target="_blank" size="small">
              <el-icon><Link /></el-icon>
            </el-link>
          </div>
        </div>
      </el-scrollbar>
      <el-empty v-else :description="t('modules.tx_history.empty')" :image-size="40" />
    </div>
  </Card>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.history-scope {
  --active-index: 0;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(74px, 1fr));
  position: relative;
  isolation: isolate;
  max-width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 2px;
  background: var(--color-background-mute);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
  overflow: hidden;
}

.history-scope:hover {
  border-color: var(--color-border-hover);
}

.history-scope__thumb {
  position: absolute;
  z-index: 0;
  top: 2px;
  bottom: 2px;
  left: 2px;
  width: calc((100% - 4px) / 2);
  border-radius: 6px;
  background: var(--gradient-primary);
  box-shadow: var(--shadow-primary);
  transform: translateX(calc(var(--active-index) * 100%));
  transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.2, 1), box-shadow 0.2s ease;
}

.history-scope__item {
  position: relative;
  z-index: 1;
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 26px;
  white-space: nowrap;
  transition: color 0.18s ease, background-color 0.18s ease;
}

.history-scope__item:focus-visible {
  outline: 2px solid var(--color-primary-hover);
  outline-offset: -2px;
}

.history-scope__item:hover:not(.is-active) {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.08);
}

.history-scope__item.is-active {
  color: var(--color-text-inverse);
}

html.dark .history-scope {
  background: var(--color-background-elevated);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

html.dark .history-scope__item.is-active {
  color: #0f172a;
}

.tx-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.tx-reconnecting-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 40px 20px;
  color: var(--color-text-muted);
}

.tx-reconnect-spinner {
  color: var(--color-primary);
  animation: tx-spin 1s linear infinite;
  margin-bottom: 12px;
}

.tx-reconnect-text {
  font-size: 14px;
  color: var(--color-text-muted);
}

@keyframes tx-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tx-scrollbar {
  height: auto;
  flex: 1 1 auto;
  overflow: hidden;
  min-height: 0;
}

.tx-scrollbar :deep(.el-scrollbar__view) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
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
  gap: 10px;
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
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
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

@media (max-width: 1380px) {
  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .history-scope {
    width: 100%;
  }

  .history-scope__item {
    min-width: 0;
  }

  .tx-item {
    align-items: flex-start;
  }

  .tx-main {
    flex-wrap: wrap;
  }

  .tx-time {
    width: 100%;
    padding-left: 2px;
  }
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
