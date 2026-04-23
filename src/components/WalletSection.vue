<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { SwitchButton, Connection, Coin, User, Odometer, Link, Clock, InfoFilled, FolderDelete, Warning, CircleCheck, Document } from '@element-plus/icons-vue'
import { NETWORK_CONFIG } from '@/contracts'
import Card from '@/components/card.vue'

const props = defineProps({
  isConnected: Boolean,
  isInitializing: Boolean,
  isCorrectNetwork: Boolean,
  isOwner: Boolean,
  currentNetwork: Object,
  account: String,
  chainId: [String, Number],
  error: String,
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

const emit = defineEmits(['connect', 'disconnect', 'switch-network', 'deploy', 'clear-addresses', 'toggle-transfer'])

function shorten(addr) {
  if (!addr) return ''
  return addr.slice(0, 8) + '...' + addr.slice(-6)
}

// 连接时间 - 持久化存储（绑定到账户和合约）
const connectTime = ref(null) // 存储 Date 对象
const timeSinceConnect = ref('')
let timeTimer = null

// 获取连接时间存储key（绑定到账户和链ID，tokenAddr可能为空）
function getConnectTimeKey() {
  // 使用 props 中的值，或使用 localStorage 中的值
  const chainId = props.chainId || localStorage.getItem('creatorcommunity_last_chain_id') || 'unknown'
  const account = props.account || ''
  // tokenAddr 可能为空（未部署合约时），但连接时间仍然需要绑定到账户
  return `creatorcommunity_${chainId}_${account}_connect_time`
}

const formattedAccount = computed(() => {
  if (!props.account) return ''
  return `${props.account.slice(0, 6)}...${props.account.slice(-4)}`
})

const explorerUrl = computed(() => {
  if (!props.account || !NETWORK_CONFIG.blockExplorer) return '#'
  return `${NETWORK_CONFIG.blockExplorer}/address/${props.account}`
})

// 从 localStorage 恢复连接时间
function loadConnectTime() {
  const key = getConnectTimeKey()
  const saved = localStorage.getItem(key)
  if (saved) {
    connectTime.value = new Date(parseInt(saved, 10))
    updateTimeSinceConnect()
    timeTimer = setInterval(updateTimeSinceConnect, 1000)
  }
}

// 保存连接时间到 localStorage
function saveConnectTime() {
  if (connectTime.value && props.account) {
    const key = getConnectTimeKey()
    localStorage.setItem(key, connectTime.value.getTime().toString())
  }
}

// 清除连接时间（断开连接时）
function clearConnectTime() {
  const key = getConnectTimeKey()
  localStorage.removeItem(key)
}

onMounted(async () => {
  await nextTick()
  loadConnectTime()
})

// 监听账户和连接状态变化
watch([() => props.isConnected, () => props.account], (connected, account) => {
  if (connected && account) {
    const key = getConnectTimeKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      connectTime.value = new Date(parseInt(saved, 10))
    } else {
      connectTime.value = new Date()
      saveConnectTime()
    }
    updateTimeSinceConnect()
    if (timeTimer) clearInterval(timeTimer)
    timeTimer = setInterval(updateTimeSinceConnect, 1000)
  } else if (!connected || !account) {
    connectTime.value = null
    timeSinceConnect.value = ''
    clearConnectTime()
    if (timeTimer) {
      clearInterval(timeTimer)
      timeTimer = null
    }
  }
}, { immediate: true })

function updateTimeSinceConnect() {
  if (connectTime.value) {
    const now = Date.now()
    const elapsed = Math.floor((now - connectTime.value.getTime()) / 1000)
    timeSinceConnect.value = formatDuration(elapsed)
  }
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`
  return `${Math.floor(seconds / 86400)}天${Math.floor((seconds % 86400) / 3600)}小时`
}
</script>

<template>
  <Card title="钱包" icon="Wallet">
    <!-- 未连接状态 -->
    <div v-if="!isConnected" class="wallet-connect-card">
      <div class="wallet-connect-icon">
        <el-icon><Coin /></el-icon>
      </div>
      <div class="wallet-connect-info">
        <span class="wallet-connect-title">连接钱包</span>
        <span class="wallet-connect-desc">连接 MetaMask 钱包以参与社区互动</span>
      </div>
      <el-button
        type="primary"
        :loading="isInitializing"
        @click="emit('connect')"
        class="wallet-connect-btn"
      >
        {{ isInitializing ? '连接中...' : '连接 MetaMask' }}
      </el-button>
      <el-text v-if="error" type="danger" size="small" class="wallet-error">{{ error }}</el-text>
    </div>

    <!-- 已连接状态 -->
    <div v-else class="wallet-cards-container">
      <!-- 钱包概览卡片 -->
      <div class="wallet-overview-card">
        <div class="wallet-avatar">
          <el-icon><Coin /></el-icon>
        </div>
        <div class="wallet-overview-info">
          <div class="wallet-address-row">
            <span class="wallet-address-short">{{ formattedAccount }}</span>
            <el-tag :type="isCorrectNetwork ? 'success' : 'danger'" size="small" effect="plain" class="wallet-status-tag">
              {{ isCorrectNetwork ? '已连接' : '网络错误' }}
            </el-tag>
          </div>
          <div class="wallet-address-full">{{ account }}</div>
        </div>
      </div>

      <!-- 合约状态 -->
      <div class="contract-status-card">
        <div class="contract-status-header">
          <div class="contract-status-icon">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="contract-status-text">
            <span class="contract-status-title">合约状态</span>
            <el-tag :type="hasAddresses ? 'success' : 'warning'" size="small" effect="plain">
              {{ hasAddresses ? '已部署' : '未部署' }}
            </el-tag>
          </div>
        </div>
        
        <!-- 未部署：显示部署按钮 -->
        <div v-if="!hasAddresses" class="contract-deploy-prompt">
          <p class="deploy-desc">部署 CreatorToken 合约将自动创建配套的 CreatorNFT 合约</p>
          <div class="deploy-info-list">
            <div class="deploy-info-item">
              <el-tag size="small" type="success">CTK</el-tag>
              <span>CreatorToken ERC20 代币</span>
            </div>
            <div class="deploy-info-item">
              <el-tag size="small" type="warning">CMN</el-tag>
              <span>CreatorNFT ERC721 勋章</span>
            </div>
          </div>
          <el-button
            type="primary"
            :disabled="['deploying', 'confirming', 'fetching-nft'].includes(deployStatus)"
            @click="emit('deploy')"
            class="contract-deploy-btn"
          >
            <template v-if="deployStatus === 'deploying'">部署中...</template>
            <template v-else-if="deployStatus === 'confirming'">等待确认...</template>
            <template v-else-if="deployStatus === 'fetching-nft'">获取NFT地址...</template>
            <template v-else>部署合约</template>
          </el-button>
          <el-text v-if="deployStatus === 'success'" type="success" class="deploy-status-text">
            部署成功!
          </el-text>
          <el-text v-if="deployError" type="danger" class="deploy-status-text">{{ deployError }}</el-text>
        </div>

        <!-- 已部署：显示地址 -->
        <div v-else class="contract-addresses">
          <div class="contract-address-item">
            <div class="contract-address-label">
              <el-tag size="small" type="success">CTK</el-tag>
              <span>CreatorToken</span>
            </div>
            <div class="contract-address-value">
              <span class="mono">{{ tokenAddress }}</span>
              <el-link v-if="blockExplorer" :href="`${blockExplorer}/address/${tokenAddress}`" target="_blank" size="small">查看</el-link>
            </div>
          </div>
          <div class="contract-address-item">
            <div class="contract-address-label">
              <el-tag size="small" type="warning">CMN</el-tag>
              <span>CreatorNFT</span>
            </div>
            <div class="contract-address-value">
              <span class="mono">{{ nftAddress }}</span>
              <el-link v-if="blockExplorer" :href="`${blockExplorer}/address/${nftAddress}`" target="_blank" size="small">查看</el-link>
            </div>
          </div>
        </div>
      </div>

      <!-- 状态信息网格 -->
      <div class="wallet-status-grid">
        <div class="wallet-status-card">
          <div class="wallet-status-icon" :class="isCorrectNetwork ? 'success' : 'danger'">
            <el-icon><Odometer /></el-icon>
          </div>
          <div class="wallet-status-info">
            <span class="wallet-status-label">当前网络</span>
            <el-tag :type="isCorrectNetwork ? 'success' : 'danger'" size="small" effect="plain">
              {{ currentNetwork?.name || '未知网络' }}
            </el-tag>
          </div>
        </div>

        <div class="wallet-status-card">
          <div class="wallet-status-icon" :class="isOwner ? 'warning' : 'info'">
            <el-icon><User /></el-icon>
          </div>
          <div class="wallet-status-info">
            <span class="wallet-status-label">管理员权限</span>
            <el-tag :type="isOwner ? 'warning' : 'info'" size="small" effect="plain">
              {{ isOwner ? '是' : '否' }}
            </el-tag>
          </div>
        </div>

        <div class="wallet-status-card">
          <div class="wallet-status-icon info">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="wallet-status-info">
            <span class="wallet-status-label">连接时间</span>
            <span class="wallet-status-value time-value">{{ timeSinceConnect || '计算中...' }}</span>
          </div>
        </div>

        <div class="wallet-status-card">
          <div class="wallet-status-icon primary">
            <el-icon><Link /></el-icon>
          </div>
          <div class="wallet-status-info">
            <span class="wallet-status-label">区块浏览器</span>
            <a :href="explorerUrl" target="_blank" class="wallet-explorer-link">查看地址 →</a>
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="wallet-tip">
        <el-icon class="wallet-tip-icon"><InfoFilled /></el-icon>
        <span v-if="!isCorrectNetwork" class="wallet-tip-text warning">
          当前网络不正确，请切换到 {{ NETWORK_CONFIG.networkName || 'Sepolia' }} 网络
        </span>
        <span v-else-if="isOwner" class="wallet-tip-text success">
          您拥有合约管理员权限，可以进行配置管理操作
        </span>
        <span v-else class="wallet-tip-text">
          连接成功！您可以参与社区互动获取奖励
        </span>
      </div>

      <!-- 错误提示 -->
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="wallet-alert" />

      <!-- 管理员管理区域 -->
      <div v-if="isOwner && hasAddresses" class="admin-section">
        <div class="admin-section-header">
          <div class="admin-title">
            <el-icon><User /></el-icon>
            <span>高级管理</span>
          </div>
        </div>
        <div class="admin-options">
          <div class="admin-option">
            <div class="admin-option-label">
              <span>转移功能</span>
            </div>
            <div class="admin-option-control">
              <el-switch
                :model-value="showTransfer"
                @update:model-value="emit('toggle-transfer')"
                inline-prompt
                active-text="开"
                inactive-text="关"
                size="small"
              />
            </div>
          </div>
          <div class="admin-option-hint">
            <el-icon color="#856404"><Warning /></el-icon>
            <span>开启后，会显示代币转账和勋章转移功能</span>
          </div>
        </div>
        <div class="admin-danger-zone">
          <el-button type="danger" size="small" @click="emit('clear-addresses')">
            <el-icon><FolderDelete /></el-icon>
            停用合约
          </el-button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="wallet-actions">
        <el-button
          v-if="!isCorrectNetwork"
          type="warning"
          @click="emit('switch-network')"
          class="wallet-action-btn"
        >
          <el-icon><SwitchButton /></el-icon>
          <span>切换网络</span>
        </el-button>
        <el-button @click="emit('disconnect')" class="wallet-action-btn wallet-action-btn--secondary">
          <el-icon><Connection /></el-icon>
          <span>断开连接</span>
        </el-button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.wallet-connect-card {
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.2s ease;
}

.wallet-connect-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}

.wallet-connect-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  color: #6366f1;
  margin: 0 auto 16px;
}

.wallet-connect-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}

.wallet-connect-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e1b4b;
}

.wallet-connect-desc {
  font-size: 13px;
  color: #64748b;
}

.wallet-connect-btn {
  width: 100%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: #fff;
  font-weight: 600;
  padding: 12px 24px;
}

.wallet-connect-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
}

.wallet-error {
  display: block;
  margin-top: 12px;
}

.wallet-cards-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 钱包概览卡片 */
.wallet-overview-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.wallet-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  flex-shrink: 0;
}

.wallet-overview-info {
  flex: 1;
  min-width: 0;
}

.wallet-address-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.wallet-address-short {
  font-size: 16px;
  font-weight: 600;
  color: #1e1b4b;
  font-family: monospace;
}

.wallet-status-tag {
  font-size: 11px;
}

.wallet-address-full {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
  word-break: break-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 状态网格 */
.wallet-status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.wallet-status-card {
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  min-height: 56px;
}

.wallet-status-card:hover {
  border-color: rgba(99, 102, 241, 0.25);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.06);
}

.wallet-status-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.wallet-status-icon.success {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.wallet-status-icon.danger {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.wallet-status-icon.warning {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.wallet-status-icon.info {
  background: rgba(100, 116, 139, 0.12);
  color: #64748b;
}

.wallet-status-icon.primary {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
}

.wallet-status-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  min-width: 0;
}

.wallet-status-label {
  font-size: 11px;
  color: #64748b;
}

.wallet-status-value {
  font-size: 12px;
  color: #1e1b4b;
  font-weight: 500;
  font-family: monospace;
}

.wallet-status-value.time-value {
  color: #6366f1;
  font-weight: 600;
  font-size: 13px;
}

.wallet-explorer-link {
  font-size: 12px;
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
}

.wallet-explorer-link:hover {
  text-decoration: underline;
}

/* 提示信息 */
.wallet-tip {
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wallet-tip-icon {
  color: #6366f1;
  font-size: 14px;
  flex-shrink: 0;
}

.wallet-tip-text {
  font-size: 12px;
  color: #64748b;
}

.wallet-tip-text.success {
  color: #10b981;
}

.wallet-tip-text.warning {
  color: #f59e0b;
}

.wallet-alert {
  margin: 0;
}

/* 操作按钮 */
.wallet-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.wallet-action-btn {
  background: rgba(99, 102, 241, 0.1) !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  color: #6366f1 !important;
  font-weight: 500;
  padding: 10px 16px;
}

.wallet-action-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2) !important;
  border-color: rgba(99, 102, 241, 0.4) !important;
}

.wallet-action-btn--secondary {
  background: rgba(100, 116, 139, 0.1) !important;
  border: 1px solid rgba(100, 116, 139, 0.2) !important;
  color: #64748b !important;
}

.wallet-action-btn--secondary:hover:not(:disabled) {
  background: rgba(100, 116, 139, 0.2) !important;
  border-color: rgba(100, 116, 139, 0.4) !important;
}

/* 合约状态卡片 */
.contract-status-card {
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 14px;
}

.contract-status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.contract-status-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  font-size: 18px;
}

.contract-status-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contract-status-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e1b4b;
}

.contract-deploy-prompt {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.deploy-desc {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.deploy-info-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.deploy-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #1e1b4b;
}

.contract-deploy-btn {
  width: 100%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: #fff;
  font-weight: 600;
}

.contract-deploy-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%);
}

.deploy-status-text {
  margin-top: 4px;
  display: block;
}

.contract-addresses {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contract-address-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.contract-address-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #1e1b4b;
}

.contract-address-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mono {
  font-family: monospace;
  color: #6366f1;
  word-break: break-all;
  font-size: 12px;
}

/* 管理员管理区域 */
.admin-section {
  background: rgba(245, 158, 11, 0.05);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 10px;
  padding: 12px;
}

.admin-section-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(245, 158, 11, 0.1);
}

.admin-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #f59e0b;
}

.admin-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.admin-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-option-label {
  font-size: 13px;
  color: #1e1b4b;
}

.admin-option-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #856404;
}

.admin-danger-zone {
  padding-top: 10px;
  border-top: 1px dashed rgba(245, 158, 11, 0.2);
}

</style>
