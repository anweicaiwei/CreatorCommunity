import { ref, computed } from 'vue'

const cachedData = ref(null)
const lastRefresh = ref(0)

/**
 * 缓存 key：chainId + Token合约地址 + 账户地址
 * 只有切换网络/合约/账户时才认为数据过期
 * 常规页面刷新直接读缓存，仅在交易成功后更新对应字段
 */
function getCacheKey(chainId, tokenAddr, accountAddr) {
  return `creatorcommunity_cache_${chainId}_${tokenAddr}_${accountAddr}`
}

function load(chainId, tokenAddr, accountAddr) {
  if (!chainId || !tokenAddr || !accountAddr) {
    cachedData.value = null
    lastRefresh.value = 0
    return
  }
  const key = getCacheKey(chainId, tokenAddr, accountAddr)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      cachedData.value = parsed.data
      lastRefresh.value = parsed.ts
    } else {
      cachedData.value = null
      lastRefresh.value = 0
    }
  } catch {
    cachedData.value = null
    lastRefresh.value = 0
  }
}

function save(chainId, tokenAddr, accountAddr, data) {
  if (!chainId || !tokenAddr || !accountAddr) return
  const key = getCacheKey(chainId, tokenAddr, accountAddr)
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

function savePartial(chainId, tokenAddr, accountAddr, updates) {
  if (!chainId || !tokenAddr || !accountAddr || !cachedData.value) return
  Object.assign(cachedData.value, updates)
  save(chainId, tokenAddr, accountAddr, cachedData.value)
}

function clear(chainId, tokenAddr, accountAddr) {
  if (!chainId || !tokenAddr || !accountAddr) return
  const key = getCacheKey(chainId, tokenAddr, accountAddr)
  try { localStorage.removeItem(key) } catch {}
  cachedData.value = null
  lastRefresh.value = 0
}

const hasCache = computed(() => cachedData.value !== null)
const cacheAge = computed(() => {
  if (!lastRefresh.value) return Infinity
  return Date.now() - lastRefresh.value
})

export function useChainDataCache() {
  return {
    cachedData,
    lastRefresh,
    hasCache,
    cacheAge,
    load,
    save,
    savePartial,
    clear
  }
}
