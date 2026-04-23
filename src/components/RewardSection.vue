<script setup>
import { computed, ref } from 'vue'
import { Wallet, Promotion, Coin } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

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
  { name: '帖子奖励', amount: `${props.readData.pendingPostReward || '0'} CTK`, event: 'withdraw-post' },
  { name: '评论奖励', amount: `${props.readData.pendingCommentReward || '0'} CTK`, event: 'withdraw-comment' },
  { name: '初始奖励', amount: `${props.readData.pendingInitialReward || '0'} CTK`, event: 'withdraw-initial' },
  { name: '合计', amount: `${props.readData.pendingTotalReward || '0'} CTK`, event: 'withdraw-all' }
])
</script>

<template>
  <Card title="奖励管理" icon="Coin">
    <!-- 初始奖励领取 -->
    <div class="reward-card">
      <div class="reward-card-header">
        <div class="reward-card-icon">
          <el-icon><Coin /></el-icon>
        </div>
        <div class="reward-card-info">
          <span class="reward-card-title">初始奖励</span>
          <span class="reward-card-desc">新用户可领取 1 CTK</span>
        </div>
      </div>
      <el-button
        type="primary"
        :disabled="!canInteract || writeLoading"
        @click="emit('claim-initial')"
        class="reward-claim-btn"
      >
        领取 1 CTK
      </el-button>
    </div>

    <!-- 待提现奖励 -->
    <div class="reward-card">
      <div class="reward-card-header">
        <div class="reward-card-icon reward-card-icon--secondary">
          <el-icon><Coin /></el-icon>
        </div>
        <div class="reward-card-info">
          <span class="reward-card-title">待提现奖励</span>
          <span class="reward-card-desc">社区互动产生的奖励</span>
        </div>
      </div>
      <template v-if="readData.pendingTotalReward">
        <div class="reward-stats">
          <div class="reward-stat">
            <span class="reward-stat-label">帖子</span>
            <span class="reward-stat-value">{{ readData.pendingPostReward || '0' }}</span>
          </div>
          <div class="reward-stat">
            <span class="reward-stat-label">评论</span>
            <span class="reward-stat-value">{{ readData.pendingCommentReward || '0' }}</span>
          </div>
          <div class="reward-stat reward-stat--highlight">
            <span class="reward-stat-label">合计</span>
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
            提取帖子奖励
          </el-button>
          <el-button 
            size="small" 
            @click="emit('withdraw-comment')"
            :disabled="!canInteract || writeLoading"
            class="reward-action-btn"
          >
            提取评论奖励
          </el-button>
          <el-button 
            size="small" 
            @click="emit('withdraw-initial')"
            :disabled="!canInteract || writeLoading"
            class="reward-action-btn"
          >
            提取初始奖励
          </el-button>
          <el-button 
            size="small" 
            @click="emit('withdraw-all')"
            :disabled="!canInteract || writeLoading"
            class="reward-action-btn reward-action-btn--primary"
          >
            一键提取全部
          </el-button>
        </div>
      </template>
      <el-empty v-else description="刷新数据后查看待提现奖励" :image-size="40" />
    </div>

    <!-- CTK 转账 -->
    <div v-if="showTransfer" class="reward-card">
      <div class="reward-card-header">
        <div class="reward-card-icon reward-card-icon--accent">
          <el-icon><Promotion /></el-icon>
        </div>
        <div class="reward-card-info">
          <span class="reward-card-title">CTK 转账</span>
          <span class="reward-card-desc">将 CTK 转账给其他用户</span>
        </div>
      </div>
      <div class="reward-transfer-form">
        <el-input v-model="transferTo" placeholder="接收地址" size="small" />
        <el-input v-model="transferAmount" placeholder="金额 (CTK)" size="small" />
        <el-button type="primary" size="small" :disabled="!canInteract || writeLoading" @click="emit('ctk-transfer', transferTo, transferAmount)">
          转账
        </el-button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.reward-card {
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  transition: all 0.2s ease;
}

.reward-card:last-child {
  margin-bottom: 0;
}

.reward-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
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
  color: #6366f1;
}

.reward-card-icon--secondary {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.reward-card-icon--accent {
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
}

.reward-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reward-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e1b4b;
}

.reward-card-desc {
  font-size: 12px;
  color: #64748b;
}

.reward-claim-btn {
  width: 100%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: #fff;
  font-weight: 600;
}

.reward-claim-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
}

.reward-actions :deep(.el-button) {
  background: rgba(99, 102, 241, 0.1) !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  color: #6366f1 !important;
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
  border-color: rgba(99, 102, 241, 0.4) !important;
}

.reward-action-btn--primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  border: none !important;
  color: #fff !important;
}

.reward-action-btn--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%) !important;
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
  color: #64748b;
}

.reward-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e1b4b;
}

.reward-stat--highlight .reward-stat-value {
  color: #10b981;
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