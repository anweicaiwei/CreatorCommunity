<script setup>
import { Money, RefreshRight, Download, Refresh, ChatDotRound, Coin, Setting, Select, Medal } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Warning } from '@element-plus/icons-vue'

const { t } = useI18n()

const props = defineProps({
  canInteract: Boolean,
  writeLoading: Boolean,
  tokenContractRead: Object,
  nftContractRead: Object,
  poolData: Object
})

const emit = defineEmits([
  'send-creator',
  'send-interact',
  'reset-price',
  'adjust-price',
  'withdraw-ctk',
  'withdraw-all-ctk',
  'withdraw-overflow',
  'refresh-pools'
])

const adminTo = ref('')
const adminAmount = ref('')
const withdrawAmount = ref(0)

const pools = computed(() => {
  const d = props.poolData || {}
  return {
    creator: d.creatorPool || '0',
    interact: d.interactPool || '0',
    nft: d.nftPool || '0',
    nftContract: d.nftContractBalance || '0',
    withdrawable: d.withdrawableAmount || '0',
    overflow: d.overflowAmount || '0'
  }
})

function refreshPools() {
  emit('refresh-pools')
}
</script>

<template>
  <Card :title="t('modules.admin.title')" icon="Setting">
    <!-- 顶部池额度统计 - 2*2布局 -->
    <div class="pools-overview">
      <div class="pools-header">
        <span class="pools-title">{{ t('modules.admin.pools.overview') }}</span>
        <el-button size="small" @click="refreshPools" :disabled="!canInteract" class="refresh-btn">
          <el-icon><Refresh /></el-icon>
          {{ t('common.button.refresh') }}
        </el-button>
      </div>
      <div class="pools-cards">
        <div class="pool-card pool-card-creator">
          <div class="pool-card-icon"><el-icon><Money /></el-icon></div>
          <div class="pool-card-info">
            <span class="pool-card-label">{{ t('modules.admin.pools.creator') }}</span>
            <span class="pool-card-value">{{ pools.creator }}</span>
          </div>
        </div>
        <div class="pool-card pool-card-interact">
          <div class="pool-card-icon"><el-icon><ChatDotRound /></el-icon></div>
          <div class="pool-card-info">
            <span class="pool-card-label">{{ t('modules.admin.pools.interact') }}</span>
            <span class="pool-card-value">{{ pools.interact }}</span>
          </div>
        </div>
        <div class="pool-card pool-card-nft">
          <div class="pool-card-icon"><el-icon><Medal /></el-icon></div>
          <div class="pool-card-info">
            <span class="pool-card-label">
              {{ t('modules.admin.pools.nft') }}
              <el-popover :title="t('modules.admin.pools.popover_title')" :content="t('modules.admin.pools.popover_content')" placement="top">
                <template #reference>
                  <el-icon class="warning-icon"><Warning /></el-icon>
                </template>
              </el-popover>
            </span>
            <span class="pool-card-value">{{ pools.nft }}</span>
          </div>
        </div>
        <div class="pool-card pool-card-balance">
          <div class="pool-card-icon"><el-icon><Coin /></el-icon></div>
          <div class="pool-card-info">
            <span class="pool-card-label">{{ t('modules.admin.pools.nft_balance') }}</span>
            <span class="pool-card-value">{{ pools.nftContract }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能区域 - 两列布局 -->
    <div class="functions-grid">
      <!-- 左列：奖励发放 -->
      <div class="function-card">
        <div class="function-header">
          <el-icon><Money /></el-icon>
          <span>{{ t('modules.admin.reward.title') }}</span>
        </div>
        <div class="function-body">
          <div class="input-row">
            <el-input v-model="adminTo" :placeholder="t('common.label.receiver_address')" size="default" clearable />
          </div>
          <div class="input-row">
            <el-input v-model="adminAmount" :placeholder="t('common.label.amount_ctk')" size="default" clearable>
              <template #append>CTK</template>
            </el-input>
          </div>
          <div class="action-buttons">
            <el-button :disabled="!canInteract || writeLoading" @click="emit('send-creator', adminTo, adminAmount)" class="action-btn action-btn--creator">
              <el-icon><Select /></el-icon>
              {{ t('modules.admin.reward.creator_button') }}
            </el-button>
            <el-button :disabled="!canInteract || writeLoading" @click="emit('send-interact', adminTo, adminAmount)" class="action-btn action-btn--interact">
              <el-icon><Select /></el-icon>
              {{ t('modules.admin.reward.interact_button') }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 右列：勋章价格管理 -->
      <div class="function-card">
        <div class="function-header">
          <el-icon><RefreshRight /></el-icon>
          <span>{{ t('modules.admin.price.title') }}</span>
        </div>
        <div class="function-body">
          <div class="price-actions">
            <div class="price-action-item" @click="emit('reset-price')" :class="{ disabled: !canInteract || writeLoading }">
              <div class="price-action-icon reset-icon">
                <el-icon><Refresh /></el-icon>
              </div>
              <div class="price-action-text">
                <span class="price-action-title">{{ t('modules.admin.price.reset_title') }}</span>
                <span class="price-action-desc">{{ t('modules.admin.price.reset_desc') }}</span>
              </div>
              <el-button type="info" size="small" :disabled="!canInteract || writeLoading">{{ t('common.button.execute') }}</el-button>
            </div>
            <div class="price-action-item" @click="emit('adjust-price')" :class="{ disabled: !canInteract || writeLoading }">
              <div class="price-action-icon adjust-icon">
                <el-icon><Setting /></el-icon>
              </div>
              <div class="price-action-text">
                <span class="price-action-title">{{ t('modules.admin.price.adjust_title') }}</span>
                <span class="price-action-desc">{{ t('modules.admin.price.adjust_desc') }}</span>
              </div>
              <el-button size="small" :disabled="!canInteract || writeLoading">{{ t('common.button.execute') }}</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：提取NFT合约代币 - 跨宽布局 -->
    <div class="withdraw-section">
      <div class="withdraw-header">
        <el-icon><Download /></el-icon>
        <span>{{ t('modules.admin.withdraw.title') }}</span>
      </div>
      <div class="withdraw-content">
        <div class="withdraw-stats">
          <div class="withdraw-stat">
            <span class="stat-label">{{ t('modules.admin.withdraw.withdrawable') }}</span>
            <span class="stat-value highlight">{{ pools.withdrawable }} CTK</span>
          </div>
          <div class="withdraw-stat">
            <span class="stat-label">{{ t('modules.admin.withdraw.overflow') }}</span>
            <span class="stat-value warning">{{ pools.overflow }} CTK</span>
          </div>
        </div>
        <div class="withdraw-actions">
          <el-input-number
            v-model="withdrawAmount"
            :min="0"
            :precision="2"
            :placeholder="t('modules.admin.withdraw.placeholder')"
            size="default"
            class="withdraw-input"
          />
          <el-button :disabled="!canInteract || writeLoading || !withdrawAmount || withdrawAmount <= 0" @click="emit('withdraw-ctk', withdrawAmount)">
            {{ t('modules.admin.withdraw.withdraw') }}
          </el-button>
          <el-button :disabled="!canInteract || !pools.withdrawable || pools.withdrawable === '0'" @click="emit('withdraw-all-ctk')">
            {{ t('modules.admin.withdraw.withdraw_all') }}
          </el-button>
          <el-button :disabled="!canInteract || !pools.overflow || pools.overflow === '0'" @click="emit('withdraw-overflow')">
            {{ t('modules.admin.withdraw.withdraw_overflow') }}
          </el-button>
        </div>
        <div class="withdraw-note">
          <el-icon><Warning /></el-icon>
          <span v-html="t('modules.admin.withdraw.note')" />
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.pools-overview {
  margin-bottom: 20px;
}

.pools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.pools-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.refresh-btn {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border: 1px solid var(--color-border);
}

.refresh-btn:hover {
  background: rgba(99, 102, 241, 0.2);
}

.pools-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.pool-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--color-background-elevated);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  transition: all 0.3s ease;
}

.pool-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.pool-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.pool-card-creator .pool-card-icon {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
}

.pool-card-interact .pool-card-icon {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-secondary);
}

.pool-card-nft .pool-card-icon {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-accent);
}

.warning-icon {
  cursor: pointer;
  color: var(--color-accent);
}

.warning-icon:hover {
  color: var(--color-accent-soft);
}

.pool-card-balance .pool-card-icon {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.pool-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pool-card-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.pool-card-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* 功能区域两列布局 */
.functions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.function-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
}

.function-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.function-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-row {
  width: 100%;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.action-btn {
  flex: 1;
  width: 100%;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  padding: 10px 12px;
  transition: all 0.2s ease;
  display: block !important;
  margin-left: 0 !important;
  max-width: 260px;
}

.action-btn--creator {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border-left: 3px solid var(--color-primary);
}

.action-btn--creator:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2);
}

.action-btn--interact {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-secondary);
  border-left: 3px solid var(--color-secondary);
}

.action-btn--interact:hover:not(:disabled) {
  background: rgba(139, 92, 246, 0.2);
}

/* 价格管理操作项 */
.price-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.price-action-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--color-background-elevated);
  border-radius: 10px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
}

.price-action-item:hover:not(.disabled) {
  border-color: var(--color-primary);
  background: rgba(99, 102, 241, 0.05);
}

.price-action-item .el-button {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border: 1px solid var(--color-border-hover);
}

.price-action-item .el-button:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2);
}

.price-action-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.price-action-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.reset-icon {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
}

.adjust-icon {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
}

.price-action-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-action-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.price-action-desc {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* 提取区域 */
.withdraw-section {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 18px;
}

.withdraw-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.withdraw-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.withdraw-stats {
  display: flex;
  gap: 24px;
}

.withdraw-stat {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
}

.stat-value.highlight {
  color: var(--color-text);
}

.stat-value.warning {
  color: var(--color-warning);
}

.withdraw-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.withdraw-actions .el-button {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  border: 1px solid var(--color-border-hover);
}

.withdraw-actions .el-button:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2);
}

.withdraw-actions .el-button:disabled {
  background: var(--color-background-soft);
  color: var(--color-text-muted);
}

.withdraw-input {
  width: 160px;
}

.withdraw-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-warning);
  padding: 10px 12px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

/* 响应式布局 */
@media (max-width: 900px) {
  .pools-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .functions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .pools-cards {
    grid-template-columns: 1fr;
  }

  .withdraw-stats {
    flex-direction: column;
    gap: 8px;
  }

  .withdraw-actions {
    flex-wrap: wrap;
  }
}

/* 暗黑模式样式 */
html.dark .pool-card,
html.dark .price-action-item {
  background: var(--color-background-mute);
}
</style>
