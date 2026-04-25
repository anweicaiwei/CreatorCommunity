<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { SwitchButton, Connection, Coin, User, Odometer, Link, Clock, InfoFilled, FolderDelete, Warning, CircleCheck, Document } from '@element-plus/icons-vue'
import { NETWORK_CONFIG } from '@/contracts'
import Card from '@/components/card.vue'

const { t } = useI18n()

const props = defineProps({
  isDark: Boolean,
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
  if (seconds < 60) return t('modules.wallet.time.second', { count: seconds })
  if (seconds < 3600) return t('modules.wallet.time.minute_second', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })
  if (seconds < 86400) return t('modules.wallet.time.hour_minute', { hours: Math.floor(seconds / 3600), minutes: Math.floor((seconds % 3600) / 60) })
  return t('modules.wallet.time.day_hour', { days: Math.floor(seconds / 86400), hours: Math.floor((seconds % 86400) / 3600) })
}
</script>

<template>
  <Card :title="t('modules.wallet.title')" icon="Wallet">
    <!-- 未连接状态 -->
    <div v-if="!isConnected" class="wallet-connect-card">
      <div class="wallet-connect-icon">
        <el-icon><Coin /></el-icon>
      </div>
      <div class="wallet-connect-info">
        <span class="wallet-connect-title">{{ t('modules.wallet.connect.title') }}</span>
        <span class="wallet-connect-desc">{{ t('modules.wallet.connect.desc') }}</span>
      </div>
      <el-button
        type="primary"
        :loading="isInitializing"
        @click="emit('connect')"
        class="wallet-connect-btn"
      >
        {{ isInitializing ? t('modules.wallet.connect.connecting') : t('modules.wallet.connect.button') }}
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
            <el-tag :type="isCorrectNetwork ? 'success' : 'danger'" size="small" effect="plain">
              {{ isCorrectNetwork ? t('modules.wallet.status.connected') : t('modules.wallet.status.network_error') }}
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
            <span class="contract-status-title">{{ t('modules.wallet.contract.status') }}</span>
            <el-tag :type="hasAddresses ? 'success' : 'warning'" size="small" effect="plain">
              {{ hasAddresses ? t('modules.wallet.status.deployed') : t('modules.wallet.status.not_deployed') }}
            </el-tag>
          </div>
        </div>
        
        <!-- 未部署：显示部署按钮 -->
        <div v-if="!hasAddresses" class="contract-deploy-prompt">
          <p class="deploy-desc">{{ t('modules.wallet.contract.deploy_desc') }}</p>
          <div class="deploy-info-list">
            <div class="deploy-info-item">
              <el-tag size="small" type="success" effect="plain">CTK</el-tag>
              <span>{{ t('modules.wallet.contract.creator_token') }}</span>
            </div>
            <div class="deploy-info-item">
              <el-tag size="small" type="warning" effect="plain">CMN</el-tag>
              <span>{{ t('modules.wallet.contract.creator_nft') }}</span>
            </div>
          </div>
          <el-button
            type="primary"
            :disabled="['deploying', 'confirming', 'fetching-nft'].includes(deployStatus)"
            @click="emit('deploy')"
            class="contract-deploy-btn"
          >
            <template v-if="deployStatus === 'deploying'">{{ t('modules.deploy.status.deploying') }}</template>
            <template v-else-if="deployStatus === 'confirming'">{{ t('modules.deploy.status.confirming') }}</template>
            <template v-else-if="deployStatus === 'fetching-nft'">{{ t('modules.deploy.status.fetching_nft') }}</template>
            <template v-else>{{ t('modules.deploy.button.deploy') }}</template>
          </el-button>
          <el-text v-if="deployStatus === 'success'" type="success" class="deploy-status-text">
            {{ t('modules.deploy.status.success') }}
          </el-text>
          <el-text v-if="deployError" type="danger" class="deploy-status-text">{{ deployError }}</el-text>
        </div>

        <!-- 已部署：显示地址 -->
        <div v-else class="contract-addresses">
          <div class="contract-address-item">
            <div class="contract-address-label">
              <el-tag size="small" type="success" effect="plain">CTK</el-tag>
              <span>CreatorToken</span>
            </div>
            <div class="contract-address-value">
              <span class="mono">{{ tokenAddress }}</span>
              <el-link v-if="blockExplorer" :href="`${blockExplorer}/address/${tokenAddress}`" target="_blank" size="small">{{ t('modules.wallet.contract.view') }}</el-link>
            </div>
          </div>
          <div class="contract-address-item">
            <div class="contract-address-label">
              <el-tag size="small" type="warning" effect="plain">CMN</el-tag>
              <span>CreatorNFT</span>
            </div>
            <div class="contract-address-value">
              <span class="mono">{{ nftAddress }}</span>
              <el-link v-if="blockExplorer" :href="`${blockExplorer}/address/${nftAddress}`" target="_blank" size="small">{{ t('modules.wallet.contract.view') }}</el-link>
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
            <span class="wallet-status-label">{{ t('modules.wallet.status.current_network') }}</span>
            <el-tag :type="isCorrectNetwork ? 'success' : 'danger'" size="small" effect="plain">
              {{ currentNetwork?.name || t('modules.wallet.status.unknown_network') }}
            </el-tag>
          </div>
        </div>

        <div class="wallet-status-card">
          <div class="wallet-status-icon" :class="isOwner ? 'warning' : 'info'">
            <el-icon><User /></el-icon>
          </div>
          <div class="wallet-status-info">
            <span class="wallet-status-label">{{ t('modules.wallet.status.admin_permission') }}</span>
            <el-tag :type="isOwner ? 'warning' : 'info'" size="small" effect="plain">
              {{ isOwner ? t('common.status.yes') : t('common.status.no') }}
            </el-tag>
          </div>
        </div>

        <div class="wallet-status-card">
          <div class="wallet-status-icon info">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="wallet-status-info">
            <span class="wallet-status-label">{{ t('modules.wallet.status.connect_time') }}</span>
            <span class="wallet-status-value time-value">{{ timeSinceConnect || t('modules.wallet.status.calculating') }}</span>
          </div>
        </div>

        <div class="wallet-status-card">
          <div class="wallet-status-icon primary">
            <el-icon><Link /></el-icon>
          </div>
          <div class="wallet-status-info">
            <span class="wallet-status-label">{{ t('modules.wallet.status.block_explorer') }}</span>
            <a :href="explorerUrl" target="_blank" class="wallet-explorer-link">{{ t('modules.wallet.status.view_address') }}</a>
          </div>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="wallet-tip">
        <el-icon class="wallet-tip-icon"><InfoFilled /></el-icon>
        <span v-if="!isCorrectNetwork" class="wallet-tip-text warning">
          {{ t('modules.wallet.tip.wrong_network', { network: NETWORK_CONFIG.networkName || 'Sepolia' }) }}
        </span>
        <span v-else-if="isOwner" class="wallet-tip-text success">
          {{ t('modules.wallet.tip.owner') }}
        </span>
        <span v-else class="wallet-tip-text">
          {{ t('modules.wallet.tip.connected') }}
        </span>
      </div>

      <!-- 错误提示 -->
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="wallet-alert" />

      <!-- 管理员管理区域 -->
      <div v-if="isOwner && hasAddresses" class="admin-section">
        <div class="admin-section-header">
          <div class="admin-title">
            <el-icon><User /></el-icon>
            <span>{{ t('modules.wallet.admin.advanced') }}</span>
          </div>
        </div>
        <div class="admin-options">
          <div class="admin-option">
            <div class="admin-option-label">
              <span>{{ t('modules.wallet.admin.transfer_feature') }}</span>
            </div>
            <div class="admin-option-control">
              <el-switch
                :model-value="showTransfer"
                @update:model-value="emit('toggle-transfer')"
                inline-prompt
                :active-text="t('modules.wallet.admin.on')"
                :inactive-text="t('modules.wallet.admin.off')"
                size="small"
              />
            </div>
          </div>
          <div class="admin-option-hint">
            <el-icon :color="isDark ? '#fbbf24' : '#856404'"><Warning /></el-icon>
            <span>{{ t('modules.wallet.admin.transfer_hint') }}</span>
          </div>
        </div>
        <div class="admin-danger-zone">
          <el-button type="danger" size="small" @click="emit('clear-addresses')">
            <el-icon><FolderDelete /></el-icon>
            {{ t('modules.wallet.admin.disable_contract') }}
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
          <span>{{ t('modules.wallet.button.switch_network') }}</span>
        </el-button>
        <el-button @click="emit('disconnect')" class="wallet-action-btn wallet-action-btn--secondary">
          <el-icon><Connection /></el-icon>
          <span>{{ t('modules.wallet.button.disconnect') }}</span>
        </el-button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.wallet-connect-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.2s ease;
}

.wallet-connect-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

.wallet-connect-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: var(--gradient-surface);
  color: var(--color-primary);
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
  color: var(--color-text);
}

.wallet-connect-desc {
  font-size: 13px;
  color: var(--color-text-muted);
}

.wallet-connect-btn {
  width: 100%;
  background: var(--gradient-primary);
  border: none;
  color: var(--color-text-inverse);
  font-weight: 600;
  padding: 12px 24px;
}

.wallet-connect-btn:hover:not(:disabled) {
  background: var(--gradient-primary-hover);
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
  background: var(--gradient-surface);
  border: 1px solid var(--color-border);
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
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
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
  color: var(--color-text);
  font-family: monospace;
}

.wallet-address-full {
  font-size: 11px;
  color: var(--color-text-muted);
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
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  min-height: 56px;
}

.wallet-status-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
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
  color: var(--color-success);
}

.wallet-status-icon.danger {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-danger);
}

.wallet-status-icon.warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning);
}

.wallet-status-icon.info {
  background: rgba(100, 116, 139, 0.12);
  color: var(--color-text-muted);
}

.wallet-status-icon.primary {
  background: rgba(99, 102, 241, 0.12);
  color: var(--color-primary);
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
  color: var(--color-text-muted);
}

.wallet-status-value {
  font-size: 12px;
  color: var(--color-text);
  font-weight: 500;
  font-family: monospace;
}

.wallet-status-value.time-value {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 13px;
}

.wallet-explorer-link {
  font-size: 12px;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.wallet-explorer-link:hover {
  text-decoration: underline;
}

/* 提示信息 */
.wallet-tip {
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wallet-tip-icon {
  color: var(--color-primary);
  font-size: 14px;
  flex-shrink: 0;
}

.wallet-tip-text {
  font-size: 12px;
  color: var(--color-text-muted);
}

.wallet-tip-text.success {
  color: var(--color-success);
}

.wallet-tip-text.warning {
  color: var(--color-warning);
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
  color: var(--color-primary) !important;
  font-weight: 500;
  padding: 10px 16px;
}

.wallet-action-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2) !important;
  border-color: var(--color-border-hover) !important;
}

.wallet-action-btn--secondary {
  background: rgba(100, 116, 139, 0.1) !important;
  border: 1px solid rgba(100, 116, 139, 0.2) !important;
  color: var(--color-text-muted) !important;
}

.wallet-action-btn--secondary:hover:not(:disabled) {
  background: rgba(100, 116, 139, 0.2) !important;
  border-color: rgba(100, 116, 139, 0.4) !important;
}

/* 合约状态卡片 */
.contract-status-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
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
  color: var(--color-primary);
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
  color: var(--color-text);
}

.contract-deploy-prompt {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.deploy-desc {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
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
  color: var(--color-text);
}

.contract-deploy-btn {
  width: 100%;
  background: var(--gradient-primary);
  border: none;
  color: var(--color-text-inverse);
  font-weight: 600;
}

.contract-deploy-btn:hover:not(:disabled) {
  background: var(--gradient-primary-hover);
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
  border: 1px solid var(--color-border);
}

.contract-address-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.contract-address-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mono {
  font-family: monospace;
  color: var(--color-primary);
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
  color: var(--color-warning);
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
  color: var(--color-text);
}

.admin-option-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-warning);
}

.admin-danger-zone {
  padding-top: 10px;
  border-top: 1px dashed rgba(245, 158, 11, 0.2);
}

/* 暗黑模式覆盖 */
html.dark .wallet-connect-card {
  background: var(--color-background-soft);
}

html.dark .wallet-connect-icon {
  background: var(--gradient-surface);
  color: var(--color-primary);
}

html.dark .wallet-connect-title {
  color: var(--color-text);
}

html.dark .wallet-connect-desc {
  color: var(--color-text-muted);
}

html.dark .wallet-overview-card {
  background: var(--gradient-surface);
}

html.dark .wallet-address-short {
  color: var(--color-text);
}

html.dark .wallet-address-full {
  color: var(--color-text-muted);
}

html.dark .wallet-status-card {
  background: var(--color-background-soft);
}

html.dark .wallet-status-label {
  color: var(--color-text-muted);
}

html.dark .wallet-status-value {
  color: var(--color-text);
}

html.dark .wallet-status-value.time-value {
  color: var(--color-primary);
}

html.dark .wallet-explorer-link {
  color: var(--color-primary);
}

html.dark .wallet-tip-icon {
  color: var(--color-primary);
}

html.dark .wallet-tip-text {
  color: var(--color-text-muted);
}

html.dark .contract-status-card {
  background: var(--color-background-soft);
}

html.dark .contract-status-title {
  color: var(--color-text);
}

html.dark .deploy-desc {
  color: var(--color-text-muted);
}

html.dark .deploy-info-item {
  color: var(--color-text);
}

html.dark .contract-address-item {
  background: var(--color-background-mute);
}

html.dark .contract-address-label {
  color: var(--color-text);
}

html.dark .mono {
  color: var(--color-primary);
}

html.dark .admin-title {
  color: var(--color-warning);
}

html.dark .admin-option-label {
  color: var(--color-text);
}

html.dark .admin-option-hint {
  color: var(--color-warning);
}

/* 暗黑模式下修正半透明背景 */
html.dark .admin-section {
  background: rgba(245, 158, 11, 0.1);
}

html.dark .contract-address-item {
  background: var(--color-background-mute);
}
</style>
