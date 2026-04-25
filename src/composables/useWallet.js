import { ref, shallowRef, computed, watch } from 'vue'
import { ethers } from 'ethers'
import { getContracts, NETWORK_CONFIG } from '@/contracts'
import { useContractAddress } from '@/composables/useContractAddress'
import { t } from '@/locales'

const account = ref(null)
const chainId = ref(null)
const provider = shallowRef(null)
const signer = shallowRef(null)
const isConnected = computed(() => !!account.value)
const isCorrectNetwork = computed(() => Number(chainId.value) === NETWORK_CONFIG.targetChainId)
const isInitializing = ref(false)
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

const { tokenAddress, nftAddress, loadAddresses, saveChainId, clearAddresses } = useContractAddress()

// 自动恢复连接 - 页面刷新时检查已授权的账户
async function initAutoConnect() {
  if (!window.ethereum) return false
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
    if (accounts.length === 0) return false
    
    isInitializing.value = true
    error.value = null
    
    const browserProvider = new ethers.BrowserProvider(window.ethereum)
    const network = await browserProvider.getNetwork()
    const userSigner = await browserProvider.getSigner()
    
    account.value = accounts[0]
    chainId.value = Number(network.chainId)
    provider.value = browserProvider
    signer.value = userSigner
    
    saveChainId(Number(network.chainId))
    loadAddresses(Number(network.chainId))
    
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

// Watch for address/provider/signer changes to recreate contract instances
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

    account.value = accounts[0]
    chainId.value = Number(network.chainId)
    provider.value = browserProvider
    signer.value = userSigner

    saveChainId(Number(network.chainId))
    loadAddresses(Number(network.chainId))
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
      } catch (addErr) {
        error.value = t('modules.wallet.error.add_network_failed')
      }
    } else {
      error.value = t('modules.wallet.error.switch_network_failed')
    }
  }
}

function disconnect() {
  account.value = null
  chainId.value = null
  provider.value = null
  signer.value = null
  tokenContractRead.value = null
  tokenContractWrite.value = null
  nftContractRead.value = null
  nftContractWrite.value = null
  isOwner.value = false
  error.value = null
  // Do NOT clear localStorage addresses — disconnecting ≠ resetting deployment
}

let listenersSetup = false

function setupListeners() {
  if (!window.ethereum || listenersSetup) return
  listenersSetup = true

  window.ethereum.on('accountsChanged', async (accounts) => {
    if (accounts.length === 0) {
      disconnect()
    } else {
      account.value = accounts[0]
      try {
        const newProvider = new ethers.BrowserProvider(window.ethereum)
        const newSigner = await newProvider.getSigner()
        provider.value = newProvider
        signer.value = newSigner
      } catch {
        disconnect()
      }
    }
  })

  window.ethereum.on('chainChanged', async () => {
    try {
      const newProvider = new ethers.BrowserProvider(window.ethereum)
      const network = await newProvider.getNetwork()
      const newSigner = await newProvider.getSigner()
      provider.value = newProvider
      signer.value = newSigner
      chainId.value = Number(network.chainId)
      saveChainId(Number(network.chainId))
      loadAddresses(Number(network.chainId))
    } catch {
      disconnect()
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
