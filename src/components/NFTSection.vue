<script setup>
import { CirclePlus, Delete, Trophy, Promotion, InfoFilled } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref, computed } from 'vue'

const props = defineProps({
  canInteract: Boolean,
  writeLoading: Boolean,
  readData: Object,
  showTransfer: Boolean
})

const emit = defineEmits(['mint-bronze', 'mint-silver', 'mint-gold', 'burn-nft', 'nft-transfer'])

const nftTransferTo = ref('')
const nftTransferTokenId = ref(0)

// 安全获取 myNFTs 数据，确保结构完整
const safeMyNFTs = computed(() => {
  const nfts = props.readData?.myNFTs
  if (!nfts) return { bronze: [], silver: [], gold: [] }
  return {
    bronze: Array.isArray(nfts.bronze) ? nfts.bronze : [],
    silver: Array.isArray(nfts.silver) ? nfts.silver : [],
    gold: Array.isArray(nfts.gold) ? nfts.gold : []
  }
})
</script>

<template>
  <Card title="勋章管理" icon="Medal">
    <div class="nft-layout">
      <!-- 左侧：我的勋章 -->
      <div class="my-nfts">
        <div class="nft-section-card">
          <div class="nft-section-header">
            <div class="nft-section-icon">
              <el-icon><Trophy /></el-icon>
            </div>
            <span>我的勋章</span>
          </div>
          <div v-if="readData.theoreticalBoost" class="boost-summary">
            <span class="boost-item">理论收益: {{ readData.theoreticalBoost }}%</span>
            <span class="boost-divider">|</span>
            <el-tooltip content="实际奖励增益（上限为50%）" placement="top">
              <span class="boost-item actual-boost">实际收益: {{ readData.nftBoost }}%</span>
            </el-tooltip>
          </div>
        </div>
        <el-scrollbar class="nft-scrollbar">
          <div class="nft-columns">
            <!-- 青铜 -->
            <div class="nft-column">
              <div class="column-header">
                <el-tag type="info" effect="dark" size="small">青铜 x{{ readData.myBronze || 0 }}</el-tag>
                <span v-if="readData.myBronze > 0" class="boost-tag">+{{ readData.myBronzeBoost }}%</span>
              </div>
              <el-scrollbar class="column-body">
                <template v-if="safeMyNFTs.bronze.length">
                  <div v-for="id in safeMyNFTs.bronze" :key="id" class="nft-item">
                    <span class="nft-id">NFT_ID: {{ id }}</span>
                    <el-button type="danger" size="small" text :disabled="!canInteract || writeLoading" @click="emit('burn-nft', id)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
                <el-empty v-else description="暂无" :image-size="30" />
              </el-scrollbar>
            </div>

            <!-- 白银 -->
            <div class="nft-column">
              <div class="column-header">
                <el-tag effect="dark" size="small">白银 x{{ readData.mySilver || 0 }}</el-tag>
                <span v-if="readData.mySilver > 0" class="boost-tag">+{{ readData.mySilverBoost }}%</span>
              </div>
              <el-scrollbar class="column-body">
                <template v-if="safeMyNFTs.silver.length">
                  <div v-for="id in safeMyNFTs.silver" :key="id" class="nft-item">
                    <span class="nft-id">NFT_ID: {{ id }}</span>
                    <el-button type="danger" size="small" text :disabled="!canInteract || writeLoading" @click="emit('burn-nft', id)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
                <el-empty v-else description="暂无" :image-size="30" />
              </el-scrollbar>
            </div>

            <!-- 黄金 -->
            <div class="nft-column">
              <div class="column-header">
                <el-tag type="warning" effect="dark" size="small">黄金 x{{ readData.myGold || 0 }}</el-tag>
                <span v-if="readData.myGold > 0" class="boost-tag">+{{ readData.myGoldBoost }}%</span>
              </div>
              <el-scrollbar class="column-body">
                <template v-if="safeMyNFTs.gold.length">
                  <div v-for="id in safeMyNFTs.gold" :key="id" class="nft-item">
                    <span class="nft-id">NFT_ID: {{ id }}</span>
                    <el-button type="danger" size="small" text :disabled="!canInteract || writeLoading" @click="emit('burn-nft', id)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
                <el-empty v-else description="暂无" :image-size="30" />
              </el-scrollbar>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- 右侧：铸造勋章 -->
      <div class="mint-nfts">
        <div class="nft-section-card">
          <div class="nft-section-header">
            <div class="nft-section-icon">
              <el-icon><CirclePlus /></el-icon>
            </div>
            <span>铸造勋章</span>
          </div>
        </div>
        <div class="mint-list">
          <el-button class="mint-btn mint-btn--bronze" type="info" :disabled="!canInteract || writeLoading" @click="emit('mint-bronze')">
            青铜 ({{ readData.bronzePrice || '?' }} CTK)
          </el-button>
          <el-button class="mint-btn mint-btn--silver" :disabled="!canInteract || writeLoading" @click="emit('mint-silver')">
            白银 ({{ readData.silverPrice || '?' }} CTK)
          </el-button>
          <el-button class="mint-btn mint-btn--gold" type="warning" :disabled="!canInteract || writeLoading" @click="emit('mint-gold')">
            黄金 ({{ readData.goldPrice || '?' }} CTK)
          </el-button>
        </div>
      </div>
    </div>

    <!-- 勋章转移 -->
    <div v-if="showTransfer" class="transfer-section">
      <div class="nft-section-card">
        <div class="nft-section-header">
          <div class="nft-section-icon">
            <el-icon><Promotion /></el-icon>
          </div>
          <span>勋章转移</span>
        </div>
      </div>
      <div class="transfer-content">
        <el-space wrap>
          <el-input v-model="nftTransferTo" placeholder="接收地址" size="small" style="width: 200px;" />
          <el-input-number v-model="nftTransferTokenId" :min="0" :precision="0" controls-position="right" size="small" placeholder="NFT Token ID" style="width: 160px;" />
          <el-button size="small" :disabled="!canInteract || writeLoading" @click="emit('nft-transfer', nftTransferTo, nftTransferTokenId)" class="nft-transfer-btn">
            转移
          </el-button>
        </el-space>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.nft-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 20px;
  min-height: 280px;
  align-items: stretch;
}

.my-nfts {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.nft-section-card {
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.nft-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1e1b4b;
}

.nft-section-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  font-size: 16px;
}

.nft-scrollbar {
  flex: 1 1 auto;
  height: 0;
  min-height: 200px;
  overflow: hidden;
}

.nft-scrollbar :deep(.el-scrollbar__view) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.nft-scrollbar :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
}

.nft-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  height: 100%;
  box-sizing: border-box;
}

.nft-column {
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  overflow: hidden;
  height: auto;
}

.column-header {
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.boost-tag {
  font-size: 12px;
  color: #10b981;
  font-weight: 600;
}

.column-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.column-body :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
}

.column-body :deep(.el-scrollbar__view) {
  padding: 8px;
  box-sizing: border-box;
}

.nft-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
  position: relative;
}

.nft-item:last-child {
  margin-bottom: 0;
}

.nft-item:hover {
  border-color: #a78bfa;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
  z-index: 10;
}

.nft-id {
  font-family: monospace;
  font-size: 13px;
  color: #64748b;
}

.mint-nfts {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding-right: 6px;
  overflow: visible;
}

.mint-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.mint-btn {
  flex: 1;
  width: 100%;
  justify-content: center;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  background: #fff;
  color: #6366f1;
  font-size: 13px;
  padding: 10px 12px;
  transition: all 0.2s ease;
  display: block !important;
  margin-left: 0 !important;
  position: relative;
}

.mint-btn:hover:not(:disabled) {
  border-color: #a78bfa;
  background: rgba(139, 92, 246, 0.1);
}

.mint-btn:disabled {
  background: #f8fafc;
  border-color: rgba(99, 102, 241, 0.15);
}

.mint-btn--bronze {
  border-left: 3px solid #909399;
}

.mint-btn--silver {
  border-left: 3px solid #c0c4cc;
}

.mint-btn--gold {
  border-left: 3px solid #e6a23c;
}

.boost-summary {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
}

.boost-item {
  color: #10b981;
  font-weight: 500;
}

.boost-divider {
  color: #909399;
}

.actual-boost {
  cursor: pointer;
  text-decoration: underline dotted;
}

.transfer-section {
  margin-top: 16px;
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 10px;
  padding: 14px 16px;
}

.transfer-content {
  padding-left: 2px;
}

@media (max-width: 768px) {
  .nft-layout {
    grid-template-columns: 1fr;
  }

  .mint-nfts {
    order: -1;
  }

  .mint-btn {
    flex: 1;
  }
}

.nft-transfer-btn {
  background: rgba(99, 102, 241, 0.1) !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  color: #6366f1 !important;
}

.nft-transfer-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2) !important;
}
</style>