<script setup>
import { CirclePlus, Delete, Trophy, Promotion, InfoFilled } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
  <Card :title="t('modules.nft.title')" icon="Medal">
    <div class="nft-layout">
      <!-- 左侧：我的勋章 -->
      <div class="my-nfts">
        <div class="nft-section-card">
          <div class="nft-section-header">
            <div class="nft-section-icon">
              <el-icon><Trophy /></el-icon>
            </div>
            <span>{{ t('modules.nft.my.title') }}</span>
          </div>
          <div v-if="readData.theoreticalBoost" class="boost-summary">
            <span class="boost-item">{{ t('modules.nft.my.theoretical_boost', { value: readData.theoreticalBoost }) }}</span>
            <span class="boost-divider">|</span>
            <el-tooltip :content="t('modules.nft.my.actual_boost_tip')" placement="top">
              <span class="boost-item actual-boost">{{ t('modules.nft.my.actual_boost', { value: readData.nftBoost }) }}</span>
            </el-tooltip>
          </div>
        </div>
        <el-scrollbar class="nft-scrollbar">
          <div class="nft-columns">
            <!-- 青铜 -->
            <div class="nft-column">
              <div class="column-header">
                <el-tag type="info" size="small" effect="plain">{{ t('modules.nft.tier.bronze') }} x{{ readData.myBronze || 0 }}</el-tag>
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
                <el-empty v-else :description="t('common.status.empty')" :image-size="30" />
              </el-scrollbar>
            </div>

            <!-- 白银 -->
            <div class="nft-column">
              <div class="column-header">
                <el-tag size="small" effect="plain">{{ t('modules.nft.tier.silver') }} x{{ readData.mySilver || 0 }}</el-tag>
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
                <el-empty v-else :description="t('common.status.empty')" :image-size="30" />
              </el-scrollbar>
            </div>

            <!-- 黄金 -->
            <div class="nft-column">
              <div class="column-header">
                <el-tag type="warning" size="small" effect="plain">{{ t('modules.nft.tier.gold') }} x{{ readData.myGold || 0 }}</el-tag>
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
                <el-empty v-else :description="t('common.status.empty')" :image-size="30" />
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
            <span>{{ t('modules.nft.mint.title') }}</span>
          </div>
        </div>
        <div class="mint-list">
          <el-button class="mint-btn mint-btn--bronze" type="info" :disabled="!canInteract || writeLoading" @click="emit('mint-bronze')">
            {{ t('modules.nft.mint.button', { tier: t('modules.nft.tier.bronze'), price: readData.bronzePrice || '?' }) }}
          </el-button>
          <el-button class="mint-btn mint-btn--silver" :disabled="!canInteract || writeLoading" @click="emit('mint-silver')">
            {{ t('modules.nft.mint.button', { tier: t('modules.nft.tier.silver'), price: readData.silverPrice || '?' }) }}
          </el-button>
          <el-button class="mint-btn mint-btn--gold" type="warning" :disabled="!canInteract || writeLoading" @click="emit('mint-gold')">
            {{ t('modules.nft.mint.button', { tier: t('modules.nft.tier.gold'), price: readData.goldPrice || '?' }) }}
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
          <span>{{ t('modules.nft.transfer.title') }}</span>
        </div>
      </div>
      <div class="transfer-content">
        <el-space wrap>
          <el-input v-model="nftTransferTo" :placeholder="t('common.label.receiver_address')" size="small" style="width: 200px;" />
          <el-input-number v-model="nftTransferTokenId" :min="0" :precision="0" controls-position="right" size="small" :placeholder="t('common.label.token_id')" style="width: 160px;" />
          <el-button size="small" :disabled="!canInteract || writeLoading" @click="emit('nft-transfer', nftTransferTo, nftTransferTokenId)" class="nft-transfer-btn">
            {{ t('modules.nft.transfer.button') }}
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
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
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
  color: var(--color-text);
}

.nft-section-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
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
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  height: auto;
}

.column-header {
  padding: 10px 12px;
  background: var(--color-background-elevated);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.boost-tag {
  font-size: 12px;
  color: var(--color-success);
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
  background: var(--color-background-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
  position: relative;
}

.nft-item:last-child {
  margin-bottom: 0;
}

.nft-item:hover {
  border-color: var(--color-secondary);
  transform: scale(1.02);
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.nft-id {
  font-family: monospace;
  font-size: 13px;
  color: var(--color-text-muted);
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
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-elevated);
  color: var(--color-primary);
  font-size: 13px;
  padding: 10px 12px;
  transition: all 0.2s ease;
  display: block !important;
  margin-left: 0 !important;
  position: relative;
}

.mint-btn:hover:not(:disabled) {
  border-color: var(--color-secondary);
  background: rgba(139, 92, 246, 0.1);
}

.mint-btn:disabled {
  background: var(--color-background-soft);
  border-color: var(--color-border);
}

.mint-btn--bronze {
  border-left: 3px solid #909399;
}

.mint-btn--silver {
  border-left: 3px solid #c0c4cc;
}

.mint-btn--gold {
  border-left: 3px solid var(--color-warning);
}

.boost-summary {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.boost-item {
  color: var(--color-success);
  font-weight: 500;
}

.boost-divider {
  color: var(--color-text-muted);
}

.actual-boost {
  cursor: pointer;
  text-decoration: underline dotted;
}

.transfer-section {
  margin-top: 16px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
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
  border: 1px solid var(--color-border) !important;
  color: var(--color-primary) !important;
}

.nft-transfer-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2) !important;
}

/* 暗黑模式样式 */
html.dark .nft-item,
html.dark .mint-btn,
html.dark .column-header {
  background: var(--color-background-mute);
}
</style>
