<script setup>
import { Money, RefreshRight, Download } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref } from 'vue'

defineProps({
  canInteract: Boolean,
  writeLoading: Boolean
})

const emit = defineEmits([
  'send-creator',
  'send-interact',
  'reset-price',
  'adjust-price',
  'withdraw-ctk'
])

const adminTo = ref('')
const adminAmount = ref('')
</script>

<template>
  <Card title="管理员功能" icon="Setting">
    <div class="action-group">
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
      <h3>NFT 合约提取</h3>
      <el-button type="warning" :disabled="!canInteract || writeLoading" @click="emit('withdraw-ctk')">
        <el-icon><Download /></el-icon>
        提取溢出 CTK
      </el-button>
    </div>
  </Card>
</template>

<style scoped>
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: #2c5282; }
</style>
