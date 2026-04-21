<script setup>
import { CirclePlus, Delete, Trophy, Promotion } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref } from 'vue'

defineProps({
  canInteract: Boolean,
  writeLoading: Boolean,
  readData: Object,
  showTransfer: Boolean
})

const emit = defineEmits(['mint-bronze', 'mint-silver', 'mint-gold', 'burn-nft', 'nft-transfer'])

const nftTransferTo = ref('')
const nftTransferTokenId = ref(0)
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
      <h3>我的勋章</h3>
      <el-space v-if="readData.myBronze !== undefined" wrap>
        <!-- 青铜勋章 -->
        <el-popover trigger="click" placement="bottom" :width="200">
          <template #reference>
            <el-tag type="info" effect="dark" class="nft-tag">
              <el-icon><Trophy /></el-icon>青铜 x{{ readData.myBronze }}
            </el-tag>
          </template>
          <div class="nft-list">
            <el-empty v-if="!readData.myNFTs?.bronze?.length" description="暂无青铜勋章" :image-size="40" />
            <div v-for="id in readData.myNFTs?.bronze" :key="id" class="nft-item">
              <span class="nft-id">NFT_ID:{{ id }}</span>
              <el-button type="danger" size="small" text :disabled="!canInteract || writeLoading" @click="emit('burn-nft', id)">
                <el-icon><Delete /></el-icon>销毁
              </el-button>
            </div>
          </div>
        </el-popover>

        <!-- 白银勋章 -->
        <el-popover trigger="click" placement="bottom" :width="200">
          <template #reference>
            <el-tag effect="dark" class="nft-tag">
              <el-icon><Trophy /></el-icon>白银 x{{ readData.mySilver }}
            </el-tag>
          </template>
          <div class="nft-list">
            <el-empty v-if="!readData.myNFTs?.silver?.length" description="暂无白银勋章" :image-size="40" />
            <div v-for="id in readData.myNFTs?.silver" :key="id" class="nft-item">
              <span class="nft-id">NFT_ID:{{ id }}</span>
              <el-button type="danger" size="small" text :disabled="!canInteract || writeLoading" @click="emit('burn-nft', id)">
                <el-icon><Delete /></el-icon>销毁
              </el-button>
            </div>
          </div>
        </el-popover>

        <!-- 黄金勋章 -->
        <el-popover trigger="click" placement="bottom" :width="200">
          <template #reference>
            <el-tag type="warning" effect="dark" class="nft-tag">
              <el-icon><Trophy /></el-icon>黄金 x{{ readData.myGold }}
            </el-tag>
          </template>
          <div class="nft-list">
            <el-empty v-if="!readData.myNFTs?.gold?.length" description="暂无黄金勋章" :image-size="40" />
            <div v-for="id in readData.myNFTs?.gold" :key="id" class="nft-item">
              <span class="nft-id">NFT_ID:{{ id }}</span>
              <el-button type="danger" size="small" text :disabled="!canInteract || writeLoading" @click="emit('burn-nft', id)">
                <el-icon><Delete /></el-icon>销毁
              </el-button>
            </div>
          </div>
        </el-popover>
      </el-space>
    </div>

    <div v-if="showTransfer" class="action-group" style="margin-top: 16px;">
      <h3>勋章转移</h3>
      <el-space wrap>
        <el-input v-model="nftTransferTo" placeholder="接收地址" size="small" style="width: 200px;" />
        <el-input-number v-model="nftTransferTokenId" :min="0" :precision="0" controls-position="right" size="small" placeholder="NFT Token ID" style="width: 160px;" />
        <el-button size="small" :disabled="!canInteract || writeLoading" @click="emit('nft-transfer', nftTransferTo, nftTransferTokenId)">
          <el-icon><Promotion /></el-icon>
          转移
        </el-button>
      </el-space>
    </div>
  </Card>
</template>

<style scoped>
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: #2c5282; }
.nft-tag { cursor: pointer; }
.nft-list { max-height: 260px; overflow-y: auto; }
.nft-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.nft-item:last-child { border-bottom: none; }
.nft-id { font-family: monospace; font-size: 13px; }
</style>