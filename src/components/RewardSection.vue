<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Wallet, Promotion, Coin } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

const { t } = useI18n()

const props = defineProps({
  canInteract: Boolean,
  writeLoading: Boolean,
  readData: Object,
  showTransfer: Boolean
})

const emit = defineEmits([
  'claim-initial',
  'withdraw-post',
  'withdraw-comment',
  'withdraw-initial',
  'withdraw-all',
  'ctk-transfer'
])

const transferTo = ref('')
const transferAmount = ref('')

const rewardRows = computed(() => [
  { name: t('modules.reward.pending.post'), amount: `${props.readData.pendingPostReward || '0'} CTK`, event: 'withdraw-post' },
  { name: t('modules.reward.pending.comment'), amount: `${props.readData.pendingCommentReward || '0'} CTK`, event: 'withdraw-comment' },
  { name: t('modules.reward.pending.initial'), amount: `${props.readData.pendingInitialReward || '0'} CTK`, event: 'withdraw-initial' },
  { name: t('modules.reward.pending.total'), amount: `${props.readData.pendingTotalReward || '0'} CTK`, event: 'withdraw-all' }
])
</script>

<template>
  <Card :title="t('modules.reward.title')" icon="Coin">
    <!-- 初始奖励领取 -->
    <div class="reward-card">
      <div class="reward-card-header">
        <div class="reward-card-icon">
          <el-icon><Coin /></el-icon>
        </div>
        <div class="reward-card-info">
          <span class="reward-card-title">{{ t('modules.reward.initial.title') }}</span>
          <span class="reward-card-desc">{{ t('modules.reward.initial.desc') }}</span>
        </div>
      </div>
      <el-button
        type="primary"
        :disabled="!canInteract || writeLoading"
        @click="emit('claim-initial')"
        class="reward-claim-btn"
      >
        {{ t('modules.reward.initial.button') }}
      </el-button>
    </div>

    <!-- 待提现奖励 -->
    <div class="reward-card">
      <div class="reward-card-header">
        <div class="reward-card-icon reward-card-icon--secondary">
          <el-icon><Coin /></el-icon>
        </div>
        <div class="reward-card-info">
          <span class="reward-card-title">{{ t('modules.reward.pending.title') }}</span>
          <span class="reward-card-desc">{{ t('modules.reward.pending.desc') }}</span>
        </div>
      </div>
      <template v-if="readData.pendingTotalReward">
        <div class="reward-stats">
          <div class="reward-stat">
            <span class="reward-stat-label">{{ t('modules.reward.pending.post') }}</span>
            <span class="reward-stat-value">{{ readData.pendingPostReward || '0' }}</span>
          </div>
          <div class="reward-stat">
            <span class="reward-stat-label">{{ t('modules.reward.pending.comment') }}</span>
            <span class="reward-stat-value">{{ readData.pendingCommentReward || '0' }}</span>
          </div>
          <div class="reward-stat reward-stat--highlight">
            <span class="reward-stat-label">{{ t('modules.reward.pending.total') }}</span>
            <span class="reward-stat-value">{{ readData.pendingTotalReward || '0' }}</span>
          </div>
        </div>
        <div class="reward-actions">
          <el-button 
            size="small" 
            @click="emit('withdraw-post')"
            :disabled="!canInteract || writeLoading"
            class="reward-action-btn"
          >
            {{ t('modules.reward.button.withdraw_post') }}
          </el-button>
          <el-button 
            size="small" 
            @click="emit('withdraw-comment')"
            :disabled="!canInteract || writeLoading"
            class="reward-action-btn"
          >
            {{ t('modules.reward.button.withdraw_comment') }}
          </el-button>
          <el-button 
            size="small" 
            @click="emit('withdraw-initial')"
            :disabled="!canInteract || writeLoading"
            class="reward-action-btn"
          >
            {{ t('modules.reward.button.withdraw_initial') }}
          </el-button>
          <el-button 
            size="small" 
            @click="emit('withdraw-all')"
            :disabled="!canInteract || writeLoading"
            class="reward-action-btn reward-action-btn--primary"
          >
            {{ t('modules.reward.button.withdraw_all') }}
          </el-button>
        </div>
      </template>
      <el-empty v-else :description="t('modules.reward.pending.empty')" :image-size="40" />
    </div>

    <!-- CTK 转账 -->
    <div v-if="showTransfer" class="reward-card">
      <div class="reward-card-header">
        <div class="reward-card-icon reward-card-icon--accent">
          <el-icon><Promotion /></el-icon>
        </div>
        <div class="reward-card-info">
          <span class="reward-card-title">{{ t('modules.reward.transfer.title') }}</span>
          <span class="reward-card-desc">{{ t('modules.reward.transfer.desc') }}</span>
        </div>
      </div>
      <div class="reward-transfer-form">
        <el-input v-model="transferTo" :placeholder="t('common.label.receiver_address')" size="small" />
        <el-input v-model="transferAmount" :placeholder="t('common.label.amount_ctk')" size="small" />
        <el-button type="primary" size="small" :disabled="!canInteract || writeLoading" @click="emit('ctk-transfer', transferTo, transferAmount)">
          {{ t('common.button.transfer') }}
        </el-button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.reward-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  transition: all 0.2s ease;
}

.reward-card:last-child {
  margin-bottom: 0;
}

.reward-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
}

.reward-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.reward-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
}

.reward-card-icon--secondary {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-secondary);
}

.reward-card-icon--accent {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-accent);
}

.reward-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reward-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.reward-card-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.reward-claim-btn {
  width: 100%;
  background: var(--gradient-primary);
  border: none;
  color: var(--color-text-inverse);
  font-weight: 600;
}

.reward-claim-btn:hover:not(:disabled) {
  background: var(--gradient-primary-hover);
}

.reward-actions :deep(.el-button) {
  background: rgba(99, 102, 241, 0.1) !important;
  border: 1px solid var(--color-border) !important;
  color: var(--color-primary) !important;
  font-weight: 500;
  width: 100%;
  box-sizing: border-box;
  padding-left: 0 !important;
  padding-right: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.reward-action-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2) !important;
  border-color: var(--color-border-hover) !important;
}

.reward-action-btn--primary {
  background: var(--gradient-primary) !important;
  border: none !important;
  color: var(--color-text-inverse) !important;
}

.reward-action-btn--primary:hover:not(:disabled) {
  background: var(--gradient-primary-hover) !important;
}

.reward-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
}

.reward-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.reward-stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.reward-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.reward-stat--highlight .reward-stat-value {
  color: var(--color-success);
}

.reward-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.reward-transfer-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.reward-transfer-form .el-input {
  flex: 1;
  min-width: 150px;
}
</style>
