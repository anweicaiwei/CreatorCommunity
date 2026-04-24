<script setup>
import {FolderDelete, Warning, Check, CircleCheck, Document, Coin } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

defineProps({
  isConnected: Boolean,
  isCorrectNetwork: Boolean,
  hasAddresses: Boolean,
  deployStatus: String,
  deployError: String,
  deployedTokenAddress: String,
  deployedNftAddress: String,
  tokenAddress: String,
  nftAddress: String,
  blockExplorer: String,
  showTransfer: Boolean
})

const emit = defineEmits(['deploy', 'clear-addresses', 'toggle-transfer'])

function shorten(addr) {
  if (!addr) return ''
  return addr.slice(0, 8) + '...' + addr.slice(-6)
}
</script>

<template>
  <Card title="合约部署" icon="Coin">
    <!-- 未部署：显示部署按钮 -->
    <div v-if="!hasAddresses" class="deploy-prompt">
      <div class="status-card">
        <div class="status-icon">
          <el-icon :size="40"><Document /></el-icon>
        </div>
        <div class="status-info">
          <h4>未检测到已部署的合约</h4>
          <p>部署 CreatorToken 合约将自动创建配套的 CreatorNFT 合约</p>
        </div>
      </div>

      <div class="info-list">
        <div class="info-item">
          <el-icon><Coin /></el-icon>
          <span>CreatorToken (CTK)</span>
          <el-tag size="small" type="info" effect="plain">ERC20 代币</el-tag>
        </div>
        <div class="info-item">
          <el-icon><Coin /></el-icon>
          <span>CreatorNFT (CMN)</span>
          <el-tag size="small" type="info" effect="plain">ERC721 勋章</el-tag>
        </div>
      </div>

      <el-button
        type="primary"
        size="large"
        :disabled="['deploying', 'confirming', 'fetching-nft'].includes(deployStatus)"
        @click="emit('deploy')"
        class="deploy-btn"
      >
        <template v-if="deployStatus === 'deploying'">部署中...</template>
        <template v-else-if="deployStatus === 'confirming'">等待确认...</template>
        <template v-else-if="deployStatus === 'fetching-nft'">获取NFT地址...</template>
        <template v-else>部署合约</template>
      </el-button>
      <el-text v-if="deployStatus === 'success'" type="success" style="margin-top: 8px; display: block;">
        部署成功!
      </el-text>
      <el-text v-if="deployError" type="danger" style="margin-top: 8px; display: block;">{{ deployError }}</el-text>
    </div>

    <!-- 已部署：显示地址摘要 -->
    <div v-else class="deploy-info">
      <div class="deploy-info-content">
        <div>
          <div class="status-active">
            <el-icon :size="20"><CircleCheck /></el-icon>
            <span>合约已部署</span>
          </div>

          <div class="contract-list">
            <div class="contract-item">
              <div class="contract-header">
                <el-tag size="small" type="success" effect="plain">CTK</el-tag>
                <span class="contract-name">CreatorToken</span>
              </div>
              <el-text class="mono" size="small">{{ tokenAddress }}</el-text>
              <el-link v-if="blockExplorer" :href="`${blockExplorer}/address/${tokenAddress}`" target="_blank" size="small">在区块浏览器查看</el-link>
            </div>

            <div class="contract-item">
              <div class="contract-header">
                <el-tag size="small" type="warning" effect="plain">CMN</el-tag>
                <span class="contract-name">CreatorNFT</span>
              </div>
              <el-text class="mono" size="small">{{ nftAddress }}</el-text>
              <el-link v-if="blockExplorer" :href="`${blockExplorer}/address/${nftAddress}`" target="_blank" size="small">在区块浏览器查看</el-link>
            </div>
          </div>

          <el-divider style="margin: 16px 0;" />

          <div class="transfer-toggle">
            <el-switch
              :model-value="showTransfer"
              @update:model-value="emit('toggle-transfer')"
              inline-prompt
              active-text="转移功能"
              inactive-text="转移功能"
              size="small"
            />
            <div class="note">
              <el-icon><Warning /></el-icon>
              <span>开启后，会显示代币转账和勋章转移功能</span>
            </div>
          </div>
        </div>

        <el-button type="danger" size="default" @click="emit('clear-addresses')" class="danger-btn">
          <el-icon><FolderDelete /></el-icon>
          停用合约
        </el-button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.mono { 
  font-family: monospace; 
  color: var(--color-primary); 
  word-break: break-all; 
}

.deploy-prompt {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 10px;
}

.status-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--color-background-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  color: var(--color-text-muted);
}

.status-info h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
  color: var(--color-text);
}

.status-info p {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--color-background-soft);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.info-item .el-icon {
  color: var(--color-primary);
}

.deploy-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  margin-top: 8px;
  background: var(--gradient-primary);
  border: none;
}

.deploy-btn:hover:not(:disabled) {
  background: var(--gradient-primary-hover);
}

.deploy-info {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.deploy-info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 0;
}

.status-active {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-success);
}

.contract-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contract-item {
  padding: 12px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contract-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contract-name {
  font-weight: 500;
  color: var(--color-text);
  font-size: 14px;
}

.transfer-toggle {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-warning);
}

.note .el-icon {
  color: var(--color-warning);
}

.danger-btn {
  width: 100%;
  margin-top: 16px;
  height: 40px;
}

/* 暗黑模式样式 */
html.dark .status-card {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.2);
}

html.dark .status-icon {
  background: var(--color-background-mute);
  color: var(--color-text-muted);
}
</style>