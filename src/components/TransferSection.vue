<script setup>
import { Promotion, Avatar } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref } from 'vue'

defineProps({
  canInteract: Boolean,
  writeLoading: Boolean
})

const emit = defineEmits(['ctk-transfer', 'nft-transfer'])

const transferTo = ref('')
const transferAmount = ref('')
const nftTransferTo = ref('')
const nftTransferTokenId = ref(0)
</script>

<template>
  <Card title="资产转移" icon="Switch">
    <div class="action-group">
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

    <div class="action-group" style="margin-top: 16px;">
      <h3>勋章转移</h3>
      <el-space wrap>
        <el-input v-model="nftTransferTo" placeholder="接收地址" size="small" style="width: 200px;" />
        <el-input-number v-model="nftTransferTokenId" :min="0" :precision="0" controls-position="right" size="small" placeholder="NFT Token ID" style="width: 160px;" />
        <el-button size="small" :disabled="!canInteract || writeLoading" @click="emit('nft-transfer', nftTransferTo, nftTransferTokenId)">
          <el-icon><Avatar /></el-icon>
          转移
        </el-button>
      </el-space>
    </div>
  </Card>
</template>

<style scoped>
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: var(--color-text); }
</style>
