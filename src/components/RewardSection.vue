<script setup>
import { computed, ref } from 'vue'
import { Wallet, Promotion } from '@element-plus/icons-vue'
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
    <div class="action-group">
      <h3>初始奖励</h3>
      <el-button
        type="primary"
        :disabled="!canInteract || writeLoading"
        @click="emit('claim-initial')"
      >
        <el-icon><Wallet /></el-icon>
        <span>领取 1 CTK 初始奖励</span>
      </el-button>
    </div>

    <div class="action-group" style="margin-top: 16px;">
      <h3>待提现奖励</h3>
      <template v-if="readData.pendingTotalReward">
        <el-table :data="rewardRows" size="small" border>
          <el-table-column prop="name" label="类型" width="100" />
          <el-table-column prop="amount" label="金额" />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="success" size="small" :disabled="!canInteract || writeLoading" @click="emit(row.event)">
                <el-icon><Wallet /></el-icon>
                提现
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <el-empty v-else description="刷新数据后查看待提现奖励" :image-size="40" />
    </div>

    <div v-if="showTransfer" class="action-group" style="margin-top: 16px;">
      <h3>CTK 转账</h3>
      <el-space wrap>
        <el-input v-model="transferTo" placeholder="接收地址" size="small" style="width: 200px;" />
        <el-input v-model="transferAmount" placeholder="金额 (CTK)" size="small" style="width: 140px;" />
        <el-button type="primary" size="small" :disabled="!canInteract || writeLoading" @click="emit('ctk-transfer', transferTo, transferAmount)">
          <el-icon><Promotion /></el-icon>
          转账
        </el-button>
      </el-space>
    </div>
  </Card>
</template>

<style scoped>
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: #2c5282; }
</style>
