import { ref, computed } from 'vue'

const tokenAddress = ref(null)
const nftAddress = ref(null)
const addressesLoaded = ref(false)

const hasAddresses = computed(() =>
  addressesLoaded.value && !!tokenAddress.value && !!nftAddress.value
)

function loadAddresses(chainId) {
  try {
    const tokenKey = `creatorcommunity_${chainId}_token_address`
    const nftKey = `creatorcommunity_${chainId}_nft_address`
    tokenAddress.value = localStorage.getItem(tokenKey) || null
    nftAddress.value = localStorage.getItem(nftKey) || null
  } catch {
    tokenAddress.value = null
    nftAddress.value = null
  }
  addressesLoaded.value = true
}

function saveAddresses(token, nft) {
  tokenAddress.value = token
  nftAddress.value = nft
  const chainId = localStorage.getItem('creatorcommunity_current_chainId') || '11155111'
  try {
    localStorage.setItem(`creatorcommunity_${chainId}_token_address`, token)
    localStorage.setItem(`creatorcommunity_${chainId}_nft_address`, nft)
  } catch {}
}

function clearAddresses() {
  tokenAddress.value = null
  nftAddress.value = null
  const chainId = localStorage.getItem('creatorcommunity_current_chainId') || '11155111'
  try {
    localStorage.removeItem(`creatorcommunity_${chainId}_token_address`)
    localStorage.removeItem(`creatorcommunity_${chainId}_nft_address`)
  } catch {}
}

function saveChainId(chainId) {
  try {
    localStorage.setItem('creatorcommunity_current_chainId', String(chainId))
  } catch {}
}

// Initialize — load from last known chainId
const lastChainId = (() => {
  try { return localStorage.getItem('creatorcommunity_current_chainId') || '11155111' }
  catch { return '11155111' }
})()
loadAddresses(lastChainId)

export function useContractAddress() {
  return {
    tokenAddress,
    nftAddress,
    hasAddresses,
    addressesLoaded,
    loadAddresses,
    saveAddresses,
    clearAddresses,
    saveChainId
  }
}