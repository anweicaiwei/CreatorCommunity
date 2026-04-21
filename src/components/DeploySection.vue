<script setup>
import { CirclePlus, FolderDelete } from '@element-plus/icons-vue'
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
  blockExplorer: String
})

const emit = defineEmits(['deploy', 'clear-addresses'])
</script>

<template>
  <Card v-if="isConnected && isCorrectNetwork" title="合约部署" icon="Coin">
    <!-- 未部署：显示部署按钮 -->
    <div v-if="!hasAddresses" class="deploy-prompt">
      <el-alert title="未检测到已部署的合约地址" type="warning" :closable="false" show-icon>
        <template #default>部署 CreatorToken 合约将自动创建 CreatorNFT 合约，两个合约在同一交易中部署完成。</template>
      </el-alert>
      <el-button
        type="primary"
        :disabled="['deploying', 'confirming', 'fetching-nft'].includes(deployStatus)"
        @click="emit('deploy')"
        style="margin-top: 12px;"
      >
        <template v-if="deployStatus === 'deploying'">部署中...</template>
        <template v-else-if="deployStatus === 'confirming'">等待确认...</template>
        <template v-else-if="deployStatus === 'fetching-nft'">获取NFT地址...</template>
        <template v-else>部署合约</template>
      </el-button>
      <el-text v-if="deployStatus === 'success'" type="success" style="margin-top: 8px; display: block;">
        部署成功! Token: {{ deployedTokenAddress }} | NFT: {{ deployedNftAddress }}
      </el-text>
      <el-text v-if="deployError" type="danger" style="margin-top: 8px; display: block;">{{ deployError }}</el-text>
    </div>

    <!-- 已部署：显示完整地址 -->
    <div v-else class="deploy-info">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="Token 合约">
          <el-text class="mono" size="small">{{ tokenAddress }}</el-text>
          <el-link v-if="blockExplorer" :href="`${blockExplorer}/address/${tokenAddress}`" target="_blank" size="small" style="margin-left: 8px;">查看</el-link>
        </el-descriptions-item>
        <el-descriptions-item label="NFT 合约">
          <el-text class="mono" size="small">{{ nftAddress }}</el-text>
          <el-link v-if="blockExplorer" :href="`${blockExplorer}/address/${nftAddress}`" target="_blank" size="small" style="margin-left: 8px;">查看</el-link>
        </el-descriptions-item>
      </el-descriptions>
      <el-button type="danger" size="small" @click="emit('clear-addresses')" style="margin-top: 8px;">
        <el-icon><FolderDelete /></el-icon>
        停用当前合约
      </el-button>
    </div>
  </Card>

  <Card v-if="!hasAddresses && (!isConnected || !isCorrectNetwork)" title="合约部署" icon="Coin">
    <el-alert title="未检测到合约地址" type="warning" :closable="false" show-icon>
      <template #default>请连接钱包并切换到正确网络后部署合约。所有合约交互功能在部署前不可使用。</template>
    </el-alert>
  </Card>
</template>

<style scoped>
.mono { font-family: monospace; word-break: break-all; }
.deploy-prompt { display: flex; flex-direction: column; align-items: flex-start; }
</style>
