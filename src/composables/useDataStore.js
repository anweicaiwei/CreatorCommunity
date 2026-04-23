import { ref, computed, shallowRef, triggerRef } from 'vue'

/**
 * 统一数据存储 - 所有数据使用同一缓存 key，按类型分区存储
 * 缓存 key: creatorcommunity_${chainId}_${tokenAddr}
 * 子存储: userData / pools / txHistory / posts / settings
 */

function getCacheKey(chainId, tokenAddr) {
  return `creatorcommunity_${chainId}_${tokenAddr}`
}

// 内存缓存（跨组件共享）
const store = shallowRef({})

// 交易历史使用独立的响应式引用，确保 UI 能自动更新
const txHistoryRef = ref([])

function refreshTxHistory() {
  txHistoryRef.value = [...(store.value.txHistory || [])]
}

function loadStore(chainId, tokenAddr) {
  if (!chainId || !tokenAddr) {
    store.value = {}
    refreshTxHistory()
    return
  }
  const key = getCacheKey(chainId, tokenAddr)
  try {
    const raw = localStorage.getItem(key)
    store.value = raw ? JSON.parse(raw) : {}
  } catch {
    store.value = {}
  }
  refreshTxHistory()
}

function saveStore(chainId, tokenAddr) {
  if (!chainId || !tokenAddr) return
  const key = getCacheKey(chainId, tokenAddr)
  try {
    localStorage.setItem(key, JSON.stringify(store.value))
  } catch {}
}

// ==================== 用户数据 ====================

function getUserDataKey(accountAddr) {
  return `userData_${accountAddr}`
}

function loadUserData(accountAddr) {
  if (!accountAddr) return null
  return store.value[getUserDataKey(accountAddr)] || null
}

function saveUserData(accountAddr, data) {
  if (!accountAddr || !data) return
  store.value[getUserDataKey(accountAddr)] = { data, ts: Date.now() }
}

function clearUserData(accountAddr) {
  if (!accountAddr) return
  delete store.value[getUserDataKey(accountAddr)]
}

// ==================== 池子数据（全局） ====================

function loadPools() {
  return store.value.pools || null
}

function savePoolsData(data) {
  if (!data) return
  store.value.pools = { data, ts: Date.now() }
}

function clearPools() {
  delete store.value.pools
}

// ==================== 交易历史 ====================

function loadTxHistory() {
  return txHistoryRef.value
}

function saveTxHistory(list) {
  store.value.txHistory = list
  refreshTxHistory()
}

function addTxToHistory(tx) {
  const list = store.value.txHistory || []
  if (list.some(t => t.hash === tx.hash)) return
  list.unshift(tx)
  store.value.txHistory = list
  refreshTxHistory()
}

function clearTxHistory() {
  store.value.txHistory = []
  refreshTxHistory()
}

// ==================== 帖子列表 ====================

function loadPosts() {
  return store.value.posts || null
}

function savePosts(data) {
  if (!data) return
  store.value.posts = { data, ts: Date.now() }
}

// ==================== UI设置 ====================

function loadSettings() {
  return store.value.settings || {}
}

function saveSetting(key, value) {
  if (!key) return
  store.value.settings = store.value.settings || {}
  store.value.settings[key] = value
}

// ==================== 整体操作 ====================

function clearAllWithChainToken(chainId, tokenAddr) {
  const key = getCacheKey(chainId, tokenAddr)
  try { localStorage.removeItem(key) } catch {}
  store.value = {}
  refreshTxHistory()
}

export function useDataStore() {
  return {
    store,
    // 初始化
    loadStore,
    saveStore,
    // 用户数据
    loadUserData,
    saveUserData,
    clearUserData,
    // 池子数据
    loadPools,
    savePoolsData,
    // 交易历史
    loadTxHistory,
    saveTxHistory,
    addTxToHistory,
    clearTxHistory,
    // 帖子
    loadPosts,
    savePosts,
    // 设置
    loadSettings,
    saveSetting,
    // 整体
    clearAllWithChainToken
  }
}