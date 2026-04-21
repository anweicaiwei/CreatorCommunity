import { ref, computed } from 'vue'

/**
 * 统一数据缓存：存储 readData（含 myNFTs）为一个完整对象
 * 缓存 key：chainId + token合约地址 + 账户地址
 */
function getCacheKey(chainId, tokenAddr, accountAddr) {
  return `creatorcommunity_${chainId}_${tokenAddr}_${accountAddr}`
}

function load(chainId, tokenAddr, accountAddr) {
  if (!chainId || !tokenAddr || !accountAddr) return null
  const key = getCacheKey(chainId, tokenAddr, accountAddr)
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function save(chainId, tokenAddr, accountAddr, data) {
  if (!chainId || !tokenAddr || !accountAddr || !data) return
  const key = getCacheKey(chainId, tokenAddr, accountAddr)
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

function savePartial(chainId, tokenAddr, accountAddr, updates) {
  if (!chainId || !tokenAddr || !accountAddr) return
  const cached = load(chainId, tokenAddr, accountAddr)
  if (!cached) return
  Object.assign(cached.data, updates)
  save(chainId, tokenAddr, accountAddr, cached.data)
}

function clear(chainId, tokenAddr, accountAddr) {
  if (!chainId || !tokenAddr || !accountAddr) return
  const key = getCacheKey(chainId, tokenAddr, accountAddr)
  try { localStorage.removeItem(key) } catch {}
}

const hasCache = computed(() => {
  // hasCache 由调用方根据 load 返回值判断
  return true
})

export function useDataCache() {
  return {
    load,
    save,
    savePartial,
    clear
  }
}