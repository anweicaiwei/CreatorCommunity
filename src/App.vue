<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWallet } from '@/composables/useWallet'
import { useContractAddress } from '@/composables/useContractAddress'
import { useDeploy } from '@/composables/useDeploy'
import { useCommunityData } from '@/composables/useCommunityData'
import { useCommunityTransactions } from '@/composables/useCommunityTransactions'
import { useCommunityActions } from '@/composables/useCommunityActions'
import { provideCommunityApp } from '@/composables/useAppProvide'
import { config } from '@/config'
import { NETWORK_CONFIG } from '@/contracts'
import { elementPlusLocale } from '@/locales'

const { locale } = useI18n()

const wallet = useWallet()
const {
  account,
  chainId,
  isConnected,
  isCorrectNetwork,
  isInitializing,
  error,
  currentNetwork,
  isOwner,
  tokenContractRead,
  nftContractRead,
  tokenContractWrite,
  nftContractWrite,
  contractsReady,
  connect,
  disconnect: walletDisconnect,
  switchNetwork,
  initAutoConnect
} = wallet

const { hasAddresses, tokenAddress, nftAddress, clearAllContractData } = useContractAddress()
const { deployStatus, deployError, deployedTokenAddress, deployedNftAddress, deploy, resetDeploy } = useDeploy()

const canInteract = computed(() =>
  isConnected.value && isCorrectNetwork.value && contractsReady.value && hasAddresses.value
)

const communityData = useCommunityData({
  account,
  chainId,
  tokenAddress,
  tokenContractRead,
  nftContractRead,
  isOwner,
  canInteract,
  locale
})

const communityTransactions = useCommunityTransactions({
  account,
  saveActiveStore: communityData.saveActiveStore,
  getCachedAccounts: communityData.getCachedAccounts,
  isCurrentAccount: communityData.isCurrentAccount,
  refreshAccountData: communityData.refreshAccountData,
  refreshAccountFields: communityData.refreshAccountFields,
  fetchPosts: communityData.fetchPosts,
  refreshPools: communityData.refreshPools
})

const communityActions = useCommunityActions({
  account,
  chainId,
  isConnected,
  isCorrectNetwork,
  tokenAddress,
  tokenContractRead,
  nftContractRead,
  tokenContractWrite,
  nftContractWrite,
  connect,
  walletDisconnect,
  deploy,
  deployError,
  resetDeploy,
  clearAllContractData,
  ...communityData,
  ...communityTransactions
})

const eventHandlers = {
  'refresh-data': communityData.refreshData,
  'refresh-posts': communityData.fetchPosts,
  'refresh-pools': communityData.refreshPools,
  connect,
  'switch-network': switchNetwork,
  'toggle-transfer': communityData.toggleTransfer,
  ...communityActions.handlers
}

function emit(event, ...args) {
  eventHandlers[event]?.(...args)
}

provideCommunityApp({
  ...communityData,
  writeLoading: communityTransactions.writeLoading,
  canInteract,
  isConnected,
  isOwner,
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
  isInitializing,
  isCorrectNetwork,
  tokenContractRead,
  nftContractRead,
  blockExplorer: NETWORK_CONFIG.blockExplorer,
  githubUrl: config.app.repositoryUrl,
  emit
})

onMounted(async () => {
  await initAutoConnect()
})
</script>

<template>
  <el-config-provider :locale="elementPlusLocale">
    <router-view />
  </el-config-provider>
</template>

<style>
.el-message .tx-link {
  color: var(--color-accent);
  text-decoration: none;
  margin-left: 6px;
  font-size: 12px;
  word-break: break-all;
}

.el-message .tx-link:hover {
  text-decoration: underline;
}

.el-scrollbar__thumb {
  background-color: rgba(99, 102, 241, 0.25) !important;
}

.el-scrollbar__thumb:hover {
  background-color: rgba(99, 102, 241, 0.4) !important;
}

html.dark .el-scrollbar__thumb {
  background-color: rgba(129, 140, 248, 0.4) !important;
}

html.dark .el-scrollbar__thumb:hover {
  background-color: rgba(165, 180, 252, 0.6) !important;
}

html.dark .el-message .tx-link {
  color: var(--color-accent);
}
</style>
