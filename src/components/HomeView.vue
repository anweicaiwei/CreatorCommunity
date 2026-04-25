<script setup>
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { QuestionFilled, Loading, Sunny, Moon } from '@element-plus/icons-vue'
import WalletSection from '@/components/WalletSection.vue'
import DeploySection from '@/components/DeploySection.vue'
import ChainDataSection from '@/components/ChainDataSection.vue'
import TxHistorySection from '@/components/TxHistorySection.vue'
import RewardSection from '@/components/RewardSection.vue'
import PostSection from '@/components/PostSection.vue'
import NFTSection from '@/components/NFTSection.vue'
import AdminSection from '@/components/AdminSection.vue'
import { setLocale } from '@/locales'

const { t, locale } = useI18n()

const STORAGE_KEY = 'creatorcommunity-dark-mode'
const isDark = ref(localStorage.getItem(STORAGE_KEY) === 'true')

function toggleDark() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem(STORAGE_KEY, 'true')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem(STORAGE_KEY, 'false')
  }
}

if (isDark.value) {
  document.documentElement.classList.add('dark')
}

const readData = inject('readData')
const readError = inject('readError')
const readLoading = inject('readLoading')
const labelMap = inject('labelMap')
const canInteract = inject('canInteract')
const writeLoading = inject('writeLoading')
const isConnected = inject('isConnected')
const isOwner = inject('isOwner')
const postLoading = inject('postLoading')
const posts = inject('posts')
const poolData = inject('poolData')
const txList = inject('txList')
const dataLoadingProgress = inject('dataLoadingProgress')
const blockExplorer = inject('blockExplorer')
const showTransfer = inject('showTransfer')
const tokenContractRead = inject('tokenContractRead')
const nftContractRead = inject('nftContractRead')
const emit = inject('emit')
const isDataLoaded = inject('isDataLoaded')
const currentNetwork = inject('currentNetwork')
const account = inject('account')
const chainId = inject('chainId')
const error = inject('error')
const hasAddresses = inject('hasAddresses')
const deployStatus = inject('deployStatus')
const deployError = inject('deployError')
const deployedTokenAddress = inject('deployedTokenAddress')
const deployedNftAddress = inject('deployedNftAddress')
const tokenAddress = inject('tokenAddress')
const nftAddress = inject('nftAddress')
const isInitializing = inject('isInitializing')
const isCorrectNetwork = inject('isCorrectNetwork')

function switchLocale(value) {
  setLocale(value)
}
</script>

<template>
  <div class="app-page">
    <div class="app-header">
      <h1 class="app-title">CreatorCommunity {{ t('common.app.title') }}</h1>
      <div class="header-actions">
        <router-link class="manual-link" to="/CreatorCommunity/manual">
          <el-icon><QuestionFilled /></el-icon>
          <span>{{ t('modules.manual.title') }}</span>
        </router-link>
        <el-segmented
          class="language-switch"
          :model-value="locale"
          :options="[
            { label: t('common.language.zh'), value: 'zh' },
            { label: t('common.language.en'), value: 'en' }
          ]"
          @update:model-value="switchLocale"
        />
        <el-button class="theme-toggle" circle @click="toggleDark">
          <el-icon v-if="isDark"><Sunny /></el-icon>
          <el-icon v-else><Moon /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="layout-grid">
      <div class="left-col">
        <WalletSection
          :is-dark="isDark" :is-connected="isConnected" :is-initializing="isInitializing"
          :is-correct-network="isCorrectNetwork" :is-owner="isOwner"
          :current-network="currentNetwork" :account="account" :chain-id="chainId" :error="error"
          :has-addresses="hasAddresses" :deploy-status="deployStatus"
          :deploy-error="deployError" :deployed-token-address="deployedTokenAddress"
          :deployed-nft-address="deployedNftAddress"
          :token-address="tokenAddress" :nft-address="nftAddress"
          :block-explorer="blockExplorer"
          :show-transfer="showTransfer"
          @connect="emit('connect')" @disconnect="emit('disconnect')" @switch-network="emit('switch-network')"
          @deploy="emit('deploy')" @clear-addresses="emit('clear-addresses')"
          @toggle-transfer="emit('toggle-transfer')"
        />
        <template v-if="isConnected && !isDataLoaded">
          <div class="loading-state">
            <el-icon class="loading-icon" :size="32"><Loading /></el-icon>
            <span>{{ dataLoadingProgress || t('common.message.loading') }}</span>
          </div>
        </template>

        <template v-if="isDataLoaded && canInteract">
          <div class="user-grid">
            <RewardSection
              :can-interact="canInteract" :write-loading="writeLoading"
              :read-data="readData" :show-transfer="showTransfer"
              @claim-initial="emit('claim-initial')"
              @withdraw-post="emit('withdraw-post')"
              @withdraw-comment="emit('withdraw-comment')"
              @withdraw-initial="emit('withdraw-initial')"
              @withdraw-all="emit('withdraw-all')"
              @ctk-transfer="emit('ctk-transfer')"
            />

            <PostSection
              :can-interact="canInteract" :write-loading="writeLoading"
              :post-loading="postLoading" :post-list="posts"
              :read-data="readData"
              @reward-post="emit('reward-post')"
              @reward-comment="emit('reward-comment')"
              @refresh-posts="emit('refresh-posts')"
            />
          </div>

          <NFTSection
            :can-interact="canInteract" :write-loading="writeLoading"
            :read-data="readData" :show-transfer="showTransfer"
            @mint-bronze="emit('mint-bronze')" @mint-silver="emit('mint-silver')"
            @mint-gold="emit('mint-gold')" @burn-nft="emit('burn-nft')"
            @nft-transfer="emit('nft-transfer')"
          />

          <div class="admin-wrapper">
            <AdminSection
              v-if="isOwner && canInteract"
              :can-interact="canInteract" :write-loading="writeLoading"
              :token-contract-read="tokenContractRead"
              :nft-contract-read="nftContractRead"
              :pool-data="poolData"
              @send-creator="emit('send-creator')"
              @send-interact="emit('send-interact')"
              @reset-price="emit('reset-price')" @adjust-price="emit('adjust-price')"
              @withdraw-ctk="emit('withdraw-ctk')"
              @withdraw-all-ctk="emit('withdraw-all-ctk')"
              @withdraw-overflow="emit('withdraw-overflow')"
              @refresh-pools="emit('refresh-pools')"
            />
          </div>
        </template>
      </div>

      <aside class="sticky-sidebar">
        <ChainDataSection
          :read-data="readData" :read-error="readError"
          :read-loading="readLoading" :label-map="labelMap"
          :is-wallet-connected="isConnected"
          @refresh="emit('refresh-data')"
        />
        <TxHistorySection
          :tx-list="txList"
          :block-explorer="blockExplorer"
          @clear="emit('clear-tx')"
        />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.app-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  padding: 16px 24px;
  background: var(--gradient-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  transition: background 0.3s ease, border-color 0.3s ease;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-toggle {
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid var(--color-border-hover);
  transition: all 0.2s ease;
}

.language-switch {
  --el-segmented-item-selected-bg-color: var(--color-primary);
  --el-segmented-item-selected-color: var(--color-text-inverse);
}

.theme-toggle:hover {
  background: var(--gradient-primary);
  border-color: transparent;
  color: var(--color-text-inverse);
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary);
}

/* 暗黑模式下的头部样式 */
html.dark .app-header {
  background: var(--gradient-surface);
  border: 1px solid var(--color-border-hover);
}

html.dark .theme-toggle {
  background: rgba(167, 139, 250, 0.15);
  border-color: rgba(167, 139, 250, 0.45);
  color: var(--color-primary-hover);
}

html.dark .theme-toggle:hover {
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
}

.app-title {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.manual-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.06);
  transition: all 0.2s ease;
}

.manual-link:hover {
  background: var(--gradient-primary);
  border-color: transparent;
  color: var(--color-text-inverse);
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary);
}

.layout-grid {
  display: grid;
  grid-template-columns: 1fr 0.5fr;
  gap: 20px;
  align-items: stretch;
  position: relative;
}

.left-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  align-self: start;
  position: relative;
}

.sticky-sidebar {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: fit-content;
  max-height: calc(100vh - 40px);
  overflow: hidden;
}

.sticky-sidebar > :deep(.el-card) {
  flex-shrink: 0;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sticky-sidebar > :deep(.el-card .el-card__body) {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sticky-sidebar > :deep(.el-card .card-body) {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.loading-state .loading-icon {
  margin-bottom: 16px;
  color: var(--color-primary);
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  align-items: stretch;
}

.user-grid > :deep(.el-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.el-descriptions__label) {
  color: var(--color-primary);
  font-weight: 500;
}

html.dark :deep(.el-descriptions__label) {
  color: var(--color-primary-hover);
}

:deep(.el-table) {
  --el-table-border-color: #e4f2fe;
  --el-table-header-bg-color: #f0f8ff;
}

html.dark :deep(.el-table) {
  --el-table-border-color: rgba(167, 139, 250, 0.3);
  --el-table-header-bg-color: rgba(30, 41, 59, 0.8);
}

/* 暗黑模式下的 manual-link */
html.dark .manual-link {
  color: var(--color-primary-hover);
  border-color: rgba(167, 139, 250, 0.4);
  background: rgba(167, 139, 250, 0.12);
}

html.dark .manual-link:hover {
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
}

@media (max-width: 1024px) {
  .user-grid { grid-template-columns: 1fr; }
}

@media (max-width: 800px) {
  .app-page { padding: 12px; }
  .layout-grid { grid-template-columns: 1fr; }
  .sticky-sidebar { position: static; height: auto; }
  .sticky-sidebar > :deep(.el-card) { flex: none; }
  .sticky-sidebar > :deep(.el-card .card-body) { overflow: visible; }
}
</style>
