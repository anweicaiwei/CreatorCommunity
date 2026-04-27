<script setup>
import { useI18n } from 'vue-i18n'
import { Loading } from '@element-plus/icons-vue'
import AppTopBar from '@/components/AppTopBar.vue'
import WalletSection from '@/components/WalletSection.vue'
import ChainDataSection from '@/components/ChainDataSection.vue'
import TxHistorySection from '@/components/TxHistorySection.vue'
import RewardSection from '@/components/RewardSection.vue'
import PostSection from '@/components/PostSection.vue'
import NFTSection from '@/components/NFTSection.vue'
import AdminSection from '@/components/AdminSection.vue'
import { setLocale } from '@/locales'
import { useAppearance } from '@/composables/useAppearance'
import { useCommunityApp } from '@/composables/useAppProvide'

const { t, locale } = useI18n()
const { isDark, toggleDark, syncDarkMode } = useAppearance()
syncDarkMode()

const {
  readData,
  readError,
  readErrorType,
  readLoading,
  labelMap,
  canInteract,
  writeLoading,
  isConnected,
  isOwner,
  postLoading,
  posts,
  poolData,
  txHistoryList,
  txHistoryScope,
  setTxHistoryScope,
  globalRefreshLoading,
  dataLoadingProgress,
  blockExplorer,
  showTransfer,
  tokenContractRead,
  nftContractRead,
  emit,
  isDataLoaded,
  currentNetwork,
  account,
  chainId,
  error,
  hasAddresses,
  deployStatus,
  deployError,
  deployedTokenAddress,
  deployedNftAddress,
  tokenAddress,
  nftAddress,
  githubUrl,
  isInitializing,
  isCorrectNetwork
} = useCommunityApp()

function switchLocale(value) {
  setLocale(value)
}
</script>

<template>
  <div class="app-page">
    <AppTopBar
      :title="`CreatorCommunity ${t('common.app.title')}`"
      nav-to="/CreatorCommunity/manual"
      :nav-label="t('modules.manual.title')"
      nav-icon="manual"
      :locale="locale"
      :is-dark="isDark"
      :github-url="githubUrl"
      @switch-locale="switchLocale"
      @toggle-dark="toggleDark"
    />

    <div class="layout-grid">
      <div class="left-col">
        <WalletSection
          :is-dark="isDark"
          :is-connected="isConnected"
          :is-initializing="isInitializing"
          :is-correct-network="isCorrectNetwork"
          :is-owner="isOwner"
          :current-network="currentNetwork"
          :account="account"
          :chain-id="chainId"
          :error="error"
          :has-addresses="hasAddresses"
          :deploy-status="deployStatus"
          :deploy-error="deployError"
          :deployed-token-address="deployedTokenAddress"
          :deployed-nft-address="deployedNftAddress"
          :token-address="tokenAddress"
          :nft-address="nftAddress"
          :block-explorer="blockExplorer"
          :show-transfer="showTransfer"
          @connect="emit('connect')"
          @disconnect="emit('disconnect')"
          @switch-network="emit('switch-network')"
          @deploy="emit('deploy')"
          @clear-addresses="emit('clear-addresses')"
          @toggle-transfer="emit('toggle-transfer')"
        />

        <template v-if="canInteract && !isDataLoaded">
          <div class="loading-state">
            <el-icon class="loading-icon" :size="32"><Loading /></el-icon>
            <span>{{ dataLoadingProgress || t('common.message.loading') }}</span>
          </div>
        </template>

        <template v-if="isDataLoaded && canInteract">
          <div class="interactive-stack" :class="{ 'is-refreshing': globalRefreshLoading }">
            <div class="interactive-stack__content">
              <div class="user-grid">
                <RewardSection
                  :can-interact="canInteract"
                  :write-loading="writeLoading"
                  :read-data="readData"
                  :show-transfer="showTransfer"
                  @claim-initial="emit('claim-initial')"
                  @withdraw-post="emit('withdraw-post')"
                  @withdraw-comment="emit('withdraw-comment')"
                  @withdraw-initial="emit('withdraw-initial')"
                  @withdraw-all="emit('withdraw-all')"
                  @ctk-transfer="emit('ctk-transfer')"
                />

                <PostSection
                  :can-interact="canInteract"
                  :write-loading="writeLoading"
                  :post-loading="postLoading"
                  :post-list="posts"
                  :read-data="readData"
                  @reward-post="emit('reward-post')"
                  @reward-comment="emit('reward-comment')"
                  @refresh-posts="emit('refresh-posts')"
                />
              </div>

              <NFTSection
                :can-interact="canInteract"
                :write-loading="writeLoading"
                :read-data="readData"
                :show-transfer="showTransfer"
                @mint-bronze="emit('mint-bronze')"
                @mint-silver="emit('mint-silver')"
                @mint-gold="emit('mint-gold')"
                @burn-nft="emit('burn-nft')"
                @nft-transfer="emit('nft-transfer')"
              />

              <div class="admin-wrapper">
                <AdminSection
                  v-if="isOwner && canInteract"
                  :can-interact="canInteract"
                  :write-loading="writeLoading"
                  :token-contract-read="tokenContractRead"
                  :nft-contract-read="nftContractRead"
                  :pool-data="poolData"
                  @send-creator="emit('send-creator')"
                  @send-interact="emit('send-interact')"
                  @reset-price="emit('reset-price')"
                  @adjust-price="emit('adjust-price')"
                  @withdraw-ctk="emit('withdraw-ctk')"
                  @withdraw-all-ctk="emit('withdraw-all-ctk')"
                  @withdraw-overflow="emit('withdraw-overflow')"
                  @refresh-pools="emit('refresh-pools')"
                />
              </div>
            </div>

            <transition name="refresh-fade">
              <div v-if="globalRefreshLoading" class="interactive-stack__overlay">
                <div class="interactive-stack__loader">
                  <el-icon class="interactive-stack__loader-icon" :size="26"><Loading /></el-icon>
                  <span>{{ t('modules.chain_data.loading_all') }}</span>
                </div>
              </div>
            </transition>
          </div>
        </template>
      </div>

      <aside class="sticky-sidebar">
        <div class="sidebar-panel sidebar-panel--data">
          <ChainDataSection
            :read-data="readData"
            :read-error="readError"
            :read-error-type="readErrorType"
            :read-loading="readLoading"
            :label-map="labelMap"
            :is-wallet-connected="isConnected"
            :has-addresses="hasAddresses"
            @refresh="emit('refresh-data')"
          />
        </div>
        <div class="sidebar-panel sidebar-panel--history">
          <TxHistorySection
            :tx-list="txHistoryList"
            :scope="txHistoryScope"
            :loading="globalRefreshLoading"
            :block-explorer="blockExplorer"
            @change-scope="setTxHistoryScope"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.app-page {
  --topbar-offset: 92px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
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
  top: calc(var(--topbar-offset) + 16px);
  display: grid;
  grid-template-rows: minmax(260px, 1fr) minmax(300px, 1fr);
  gap: 20px;
  height: calc(100vh - var(--topbar-offset) - 60px);
  min-height: 0;
  overflow: visible;
}

.sidebar-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
  position: relative;
}

.sidebar-panel :deep(.el-card) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow: visible;
}

.sidebar-panel :deep(.el-card:hover) {
  z-index: 2;
}

.sidebar-panel :deep(.el-card .el-card__body) {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-panel :deep(.el-card .card-body) {
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

.interactive-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.interactive-stack__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: opacity 0.24s ease, transform 0.24s ease, filter 0.24s ease;
}

.interactive-stack.is-refreshing .interactive-stack__content {
  opacity: 0.4;
  transform: translateY(2px) scale(0.995);
  filter: saturate(0.9);
  pointer-events: none;
}

.interactive-stack__overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-radius: 16px;
}

.interactive-stack__overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.18), rgba(241, 245, 249, 0.42)),
    rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(8px);
}

.interactive-stack__loader {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 12px 18px;
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-md);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
}

.interactive-stack__loader-icon {
  animation: rotate 0.9s linear infinite;
}

.refresh-fade-enter-active,
.refresh-fade-leave-active {
  transition: opacity 0.22s ease;
}

.refresh-fade-enter-from,
.refresh-fade-leave-to {
  opacity: 0;
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

html.dark .interactive-stack__overlay {
}

html.dark .interactive-stack__overlay::before {
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.18), rgba(15, 23, 42, 0.46)),
    rgba(15, 23, 42, 0.3);
}

html.dark .interactive-stack__loader {
  background: rgba(30, 41, 59, 0.92);
  border-color: rgba(167, 139, 250, 0.22);
  color: var(--color-primary-hover);
  box-shadow: var(--shadow-lg);
}


@media (max-width: 1024px) {
  .user-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .app-page {
    --topbar-offset: 152px;
  }
}

@media (max-width: 800px) {
  .app-page {
    padding: 12px;
  }

  .layout-grid {
    grid-template-columns: 1fr;
  }

  .sticky-sidebar {
    position: static;
    display: flex;
    flex-direction: column;
    height: auto;
  }

  .sidebar-panel {
    overflow: visible;
  }

  .sidebar-panel :deep(.el-card) {
    height: auto;
  }

  .sidebar-panel :deep(.el-card .card-body) {
    overflow: visible;
  }
}
</style>
