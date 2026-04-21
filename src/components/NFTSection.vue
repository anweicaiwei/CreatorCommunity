<script setup>
import { CirclePlus, Delete, Trophy } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref } from 'vue'

defineProps({
  canInteract: Boolean,
  writeLoading: Boolean,
  readData: Object
})

const emit = defineEmits(['mint-bronze', 'mint-silver', 'mint-gold', 'burn-nft'])

const burnTokenId = ref(0)
</script>

<template>
  <Card title="勋章管理" icon="Medal">
    <div class="action-group">
      <h3>铸造勋章</h3>
      <el-space wrap>
        <el-button type="info" :disabled="!canInteract || writeLoading" @click="emit('mint-bronze')">
          <el-icon><CirclePlus /></el-icon>
          <span>青铜 ({{ readData.bronzePrice || '?' }} CTK)</span>
        </el-button>
        <el-button :disabled="!canInteract || writeLoading" @click="emit('mint-silver')">
          <el-icon><CirclePlus /></el-icon>
          <span>白银 ({{ readData.silverPrice || '?' }} CTK)</span>
        </el-button>
        <el-button type="warning" :disabled="!canInteract || writeLoading" @click="emit('mint-gold')">
          <el-icon><CirclePlus /></el-icon>
          <span>黄金 ({{ readData.goldPrice || '?' }} CTK)</span>
        </el-button>
      </el-space>
    </div>

    <div class="action-group" style="margin-top: 16px;">
      <h3>销毁勋章</h3>
      <el-space>
        <el-input-number v-model="burnTokenId" :min="0" :precision="0" controls-position="right" size="small" placeholder="NFT Token ID" style="width: 160px;" />
        <el-button type="danger" :disabled="!canInteract || writeLoading" @click="emit('burn-nft', burnTokenId)">
          <el-icon><Delete /></el-icon>
          <span>销毁返还80%</span>
        </el-button>
      </el-space>
    </div>

    <div class="action-group" style="margin-top: 16px;">
      <h3>我的勋章</h3>
      <el-space v-if="readData.myBronze !== undefined" wrap>
        <el-tag type="info" effect="dark"><el-icon style="margin-right: 4px;"><Trophy /></el-icon>青铜 x{{ readData.myBronze }}</el-tag>
        <el-tag effect="dark"><el-icon style="margin-right: 4px;"><Trophy /></el-icon>白银 x{{ readData.mySilver }}</el-tag>
        <el-tag type="warning" effect="dark"><el-icon style="margin-right: 4px;"><Trophy /></el-icon>黄金 x{{ readData.myGold }}</el-tag>
      </el-space>
    </div>
  </Card>
</template>

<style scoped>
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: #2c5282; }
</style>
