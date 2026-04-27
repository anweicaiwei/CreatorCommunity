import { ref, shallowRef, computed, watch } from 'vue'
import { ethers } from 'ethers'
import { getContracts, NETWORK_CONFIG } from '@/contracts'
import { useContractAddress } from '@/composables/useContractAddress'
import { t } from '@/locales'

const WALLET_ACCOUNT_KEY = 'creatorcommunity_last_wallet_account'
const WALLET_CHAIN_ID_KEY = 'creatorcommunity_current_chainId'

function loadCachedWalletAccount() {
  try {
    return localStorage.getItem(WALLET_ACCOUNT_KEY) || null
  } catch {
    return null
  }
}

function hasWalletSession() {
  return !!loadCachedWalletAccount()
}

function loadCachedChainId() {
  try {
    const cached = localStorage.getItem(WALLET_CHAIN_ID_KEY)
    return cached ? Number(cached) : null
  } catch {
    return null
  }
}

function saveWalletSession(address, networkId) {
  try {
    if (address) localStorage.setItem(WALLET_ACCOUNT_KEY, address)
    if (networkId) localStorage.setItem(WALLET_CHAIN_ID_KEY, String(networkId))
  } catch {}
}

function clearWalletSession() {
  try {
    localStorage.removeItem(WALLET_ACCOUNT_KEY)
  } catch {}
}

function normalizeAddress(address) {
  return typeof address === 'string' ? address.trim().toLowerCase() : ''
}

function getConnectTimeKey(address, networkId) {
  return `creatorcommunity_${networkId || 'unknown'}_${address || ''}_connect_time`
}

function clearConnectTimeCache(address, networkId) {
  if (!address) return

  const normalizedAccount = normalizeAddress(address)
  try {
    localStorage.removeItem(getConnectTimeKey(address, networkId))

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (
        key &&
        key.startsWith('creatorcommunity_') &&
        key.endsWith('_connect_time') &&
        key.toLowerCase().includes(`_${normalizedAccount}_connect_time`)
      ) {
        localStorage.removeItem(key)
      }
    }
  } catch {}
}

async function revokeAccountPermission() {
  if (!window.ethereum?.request) return

  try {
    await window.ethereum.request({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }]
    })
  } catch (e) {
    console.warn('MetaMask permission revoke failed:', e)
  }
}

const account = ref(loadCachedWalletAccount())
const chainId = ref(loadCachedChainId())
const provider = shallowRef(null)
const signer = shallowRef(null)
const isConnected = computed(() => !!account.value)
const isCorrectNetwork = computed(() => Number(chainId.value) === NETWORK_CONFIG.targetChainId)
const isInitializing = ref(!!account.value)
const error = ref(null)
const currentNetwork = computed(() => {
  if (Number(chainId.value) === NETWORK_CONFIG.targetChainId) return NETWORK_CONFIG
  return { name: `${t('modules.wallet.status.unknown_network')} (${chainId.value})` }
})
const isOwner = ref(false)

const tokenContractRead = shallowRef(null)
const tokenContractWrite = shallowRef(null)
const nftContractRead = shallowRef(null)
const nftContractWrite = shallowRef(null)

const contractsReady = computed(() =>
  !!tokenContractRead.value && !!nftContractRead.value
)

const { tokenAddress, nftAddress, loadAddresses, saveChainId } = useContractAddress()

// 自动恢复连接：页面刷新时检查钱包已授权账户。
async function initAutoConnect() {
  if (!hasWalletSession()) {
    account.value = null
    provider.value = null
    signer.value = null
    isOwner.value = false
    isInitializing.value = false
    return false
  }

  if (!window.ethereum) {
    clearWalletSession()
    account.value = null
    chainId.value = null
    isInitializing.value = false
    return false
  }

  isInitializing.value = true
  error.value = null

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
    if (accounts.length === 0) {
      disconnect()
      return false
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum)
    const network = await browserProvider.getNetwork()
    const userSigner = await browserProvider.getSigner()
    const networkId = Number(network.chainId)

    account.value = accounts[0]
    chainId.value = networkId
    provider.value = browserProvider
    signer.value = userSigner

    saveWalletSession(accounts[0], networkId)
    saveChainId(networkId)
    loadAddresses(networkId)

    return true
  } catch (e) {
    console.error('Auto connect failed:', e)
    error.value = t('modules.wallet.error.auto_connect_failed', { message: e.message })
    return false
  } finally {
    isInitializing.value = false
  }
}

function createContractInstances() {
  const contracts = getContracts()
  const tokenAddr = contracts.CreatorToken.address
  const nftAddr = contracts.CreatorNFT.address

  if (!tokenAddr || !nftAddr || !provider.value) {
    tokenContractRead.value = null
    tokenContractWrite.value = null
    nftContractRead.value = null
    nftContractWrite.value = null
    return
  }

  tokenContractRead.value = new ethers.Contract(tokenAddr, contracts.CreatorToken.abi, provider.value)
  nftContractRead.value = new ethers.Contract(nftAddr, contracts.CreatorNFT.abi, provider.value)

  if (signer.value) {
    tokenContractWrite.value = new ethers.Contract(tokenAddr, contracts.CreatorToken.abi, signer.value)
    nftContractWrite.value = new ethers.Contract(nftAddr, contracts.CreatorNFT.abi, signer.value)
  }
}

async function checkOwner() {
  if (!tokenContractRead.value || !account.value) {
    isOwner.value = false
    return
  }
  try {
    const ownerAddr = await tokenContractRead.value.owner()
    isOwner.value = ownerAddr.toLowerCase() === account.value.toLowerCase()
  } catch {
    isOwner.value = false
  }
}

// 地址、provider 或 signer 变化后重建合约实例。
watch([tokenAddress, nftAddress, provider, signer], () => {
  createContractInstances()
  checkOwner()
})

async function connect() {
  if (!window.ethereum) {
    error.value = t('modules.wallet.error.install_metamask')
    return
  }

  isInitializing.value = true
  error.value = null

  try {
    const browserProvider = new ethers.BrowserProvider(window.ethereum)
    const accounts = await browserProvider.send('eth_requestAccounts', [])
    const network = await browserProvider.getNetwork()
    const userSigner = await browserProvider.getSigner()
    const networkId = Number(network.chainId)

    account.value = accounts[0]
    chainId.value = networkId
    provider.value = browserProvider
    signer.value = userSigner

    saveWalletSession(accounts[0], networkId)
    saveChainId(networkId)
    loadAddresses(networkId)
  } catch (e) {
    if (e.code === 4001) {
      error.value = t('modules.wallet.error.rejected')
    } else {
      error.value = t('modules.wallet.error.connect_failed', { message: e.message })
    }
  } finally {
    isInitializing.value = false
  }
}

async function switchNetwork() {
  if (!window.ethereum) return

  const targetHex = `0x${NETWORK_CONFIG.targetChainId.toString(16)}`
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetHex }]
    })
  } catch (e) {
    if (e.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: targetHex,
            chainName: NETWORK_CONFIG.name,
            rpcUrls: [NETWORK_CONFIG.rpcUrl],
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
          }]
        })
      } catch {
        error.value = t('modules.wallet.error.add_network_failed')
      }
    } else {
      error.value = t('modules.wallet.error.switch_network_failed')
    }
  }
}

async function disconnect(options = {}) {
  const { revokePermissions = false } = options
  const disconnectedAccount = account.value
  const disconnectedChainId = chainId.value

  if (revokePermissions) {
    await revokeAccountPermission()
  }

  clearWalletSession()
  clearConnectTimeCache(disconnectedAccount, disconnectedChainId)
  account.value = null
  chainId.value = null
  provider.value = null
  signer.value = null
  tokenContractRead.value = null
  tokenContractWrite.value = null
  nftContractRead.value = null
  nftContractWrite.value = null
  isOwner.value = false
  isInitializing.value = false
  error.value = null
  // 断开钱包不清除部署地址；重置部署走独立入口。
}

async function syncWalletAuthorization() {
  if (!window.ethereum || !account.value) return

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
    const activeAccount = normalizeAddress(account.value)
    const stillAuthorized = accounts.some((address) => normalizeAddress(address) === activeAccount)
    if (!stillAuthorized) {
      disconnect()
    }
  } catch (e) {
    console.error('Wallet authorization check failed:', e)
  }
}

let listenersSetup = false

function setupListeners() {
  if (!window.ethereum || listenersSetup) return
  listenersSetup = true

  // 钱包事件只注册一次，账户或网络变化后刷新 provider、signer 和链 ID。
  window.ethereum.on('accountsChanged', async (accounts) => {
    if (accounts.length === 0) {
      disconnect()
    } else {
      if (!account.value && !hasWalletSession()) return

      account.value = accounts[0]
      try {
        const newProvider = new ethers.BrowserProvider(window.ethereum)
        const network = await newProvider.getNetwork()
        const newSigner = await newProvider.getSigner()
        provider.value = newProvider
        signer.value = newSigner
        chainId.value = Number(network.chainId)
        saveWalletSession(accounts[0], Number(network.chainId))
        saveChainId(Number(network.chainId))
        loadAddresses(Number(network.chainId))
      } catch {
        disconnect()
      }
    }
  })

  window.ethereum.on('chainChanged', async () => {
    if (!account.value && !hasWalletSession()) return

    try {
      const newProvider = new ethers.BrowserProvider(window.ethereum)
      const network = await newProvider.getNetwork()
      const newSigner = await newProvider.getSigner()
      provider.value = newProvider
      signer.value = newSigner
      chainId.value = Number(network.chainId)
      saveWalletSession(account.value, Number(network.chainId))
      saveChainId(Number(network.chainId))
      loadAddresses(Number(network.chainId))
    } catch {
      disconnect()
    }
  })

  window.ethereum.on('disconnect', disconnect)

  window.addEventListener('focus', syncWalletAuthorization)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncWalletAuthorization()
    }
  })
}

export function useWallet() {
  setupListeners()

  return {
    account,
    chainId,
    provider,
    signer,
    isConnected,
    isCorrectNetwork,
    isInitializing,
    error,
    currentNetwork,
    isOwner,
    contractsReady,
    tokenContractRead,
    tokenContractWrite,
    nftContractRead,
    nftContractWrite,
    connect,
    disconnect,
    switchNetwork,
    initAutoConnect
  }
}
