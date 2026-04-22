<script setup>
import { Money, RefreshRight, Download, Refresh } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref, computed } from 'vue'
import { Warning } from '@element-plus/icons-vue'

import { formatTokenAmount } from '@/utils/format'

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
const poolLoading = ref(false)

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

async function refreshPools() {
  emit('refresh-pools')
}
</script>

<template>
  <Card title="管理员功能" icon="Setting">
    <div class="pool-info">
      <div class="pool-header">
        <span>代币池额度</span>
        <el-button size="small" @click="refreshPools" :disabled="!canInteract">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
      <div class="pool-grid">
        <div class="pool-item">
          <span class="pool-label">创作者池</span>
          <span class="pool-value">{{ pools.creator }}</span>
        </div>
        <div class="pool-item">
          <span class="pool-label">互动池</span>
          <span class="pool-value">{{ pools.interact }}</span>
        </div>
        <div class="pool-item">
          <div class="pool-label">
            <el-popover
                title="注意"
                content="合约部署时，NFT池中的代币已经全部转移至NFT合约"
                placement="bottom"
            >
              <template #reference>
                <el-icon><Warning /></el-icon>
              </template>
            </el-popover>

            <span >NFT 池</span>
          </div>

          <span class="pool-value">{{ pools.nft }}</span>
        </div>
        <div class="pool-item">
          <span class="pool-label">NFT 合约余额</span>
          <span class="pool-value">{{ pools.nftContract }}</span>
        </div>
      </div>
    </div>

    <div class="action-group" style="margin-top: 16px;">
      <h3>奖励发放</h3>
      <el-space wrap>
        <el-input v-model="adminTo" placeholder="接收地址" size="small" style="width: 200px;" />
        <el-input v-model="adminAmount" placeholder="金额 (CTK)" size="small" style="width: 140px;" />
        <el-button type="primary" size="small" :disabled="!canInteract || writeLoading" @click="emit('send-creator', adminTo, adminAmount)">
          <el-icon><Money /></el-icon>
          创作者池发放
        </el-button>
        <el-button size="small" :disabled="!canInteract || writeLoading" @click="emit('send-interact', adminTo, adminAmount)">
          <el-icon><Money /></el-icon>
          互动池发放
        </el-button>
      </el-space>
    </div>

    <div class="action-group" style="margin-top: 16px;">
      <h3>勋章价格管理</h3>
      <el-space wrap>
        <el-button :disabled="!canInteract || writeLoading" @click="emit('reset-price')">
          <el-icon><RefreshRight /></el-icon>
          重置初始价格
        </el-button>
        <el-button :disabled="!canInteract || writeLoading" @click="emit('adjust-price')">
          <el-icon><RefreshRight /></el-icon>
          随机调价 ±10%
        </el-button>
      </el-space>
    </div>

    <div class="action-group" style="margin-top: 16px;">
      <h3>提取NFT合约代币</h3>
      <div class="withdraw-info">
        <span class="withdraw-label">可提取额度:</span>
        <span class="withdraw-value">{{ pools.withdrawable }} CTK</span>
        <span class="withdraw-label" style="margin-left: 16px;">溢出额度:</span>
        <span class="withdraw-value">{{ pools.overflow }} CTK</span>
      </div>
      <div class="withdraw-form">
        <el-input-number
            v-model="withdrawAmount"
            :min="0"
            :precision="2"
            placeholder="提取金额"
            size="small"
            style="width: 140px;"
        />
        <el-button type="warning" size="small" :disabled="!canInteract || writeLoading || !withdrawAmount || withdrawAmount <= 0" @click="emit('withdraw-ctk', withdrawAmount)">
          <el-icon><Download /></el-icon>
          提取
        </el-button>
        <el-button size="small" :disabled="!canInteract || !pools.withdrawable || pools.withdrawable === '0'" @click="emit('withdraw-all-ctk')">
          提取全部
        </el-button>
        <el-button size="small" :disabled="!canInteract || !pools.overflow || pools.overflow === '0'" @click="emit('withdraw-overflow')">
          <el-icon><Download /></el-icon>
          提取溢出
        </el-button>
      </div>
      <el-text size="small" type="info" style="margin-top: 4px; display: block;">
        <el-icon><Warning /></el-icon> 提取的CTK代币，会按 7:3 的比例分给创作者池和互动池
      </el-text>
    </div>
  </Card>
</template>

<style scoped>
.pool-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}
.pool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 600;
  color: #2c5282;
}
.pool-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.pool-item {
  display: flex;
  justify-content: space-between;
  background: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #e4f2fe;
}
.pool-label {
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中（可选） */
  color: #4a6b8a;
  font-size: 13px;
}
.pool-value {
  color: #2c5282;
  font-weight: 600;
  font-size: 13px;
}
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: #2c5282; }
.withdraw-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: #fff8e6;
  border-radius: 4px;
  border: 1px solid #ffdd99;
}
.withdraw-label {
  color: #856404;
  font-size: 13px;
}
.withdraw-value {
  color: #c18d00;
  font-weight: 600;
  font-size: 13px;
}
</style>
