import { ref, shallowRef } from 'vue'

function getCacheKey(chainId, tokenAddr) {
  return `creatorcommunity_${chainId}_${tokenAddr}`
}

function normalizeAddress(address) {
  return typeof address === 'string' ? address.trim().toLowerCase() : ''
}

function cloneValue(value) {
  if (value == null) return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

function dedupeTxList(list) {
  const seen = new Set()
  const nextList = []
  for (const item of Array.isArray(list) ? list : []) {
    if (!item?.hash || seen.has(item.hash)) continue
    seen.add(item.hash)
    nextList.push(cloneValue(item))
  }
  return nextList
}

function createEmptyStore() {
  return {
    userDataByAccount: {},
    txHistoryShared: [],
    txHistoryByAccount: {},
    pools: null,
    posts: null,
    settings: {}
  }
}

function sanitizeStore(rawStore) {
  const nextStore = createEmptyStore()
  if (!rawStore || typeof rawStore !== 'object') {
    return nextStore
  }

  if (rawStore.userDataByAccount && typeof rawStore.userDataByAccount === 'object') {
    for (const [address, entry] of Object.entries(rawStore.userDataByAccount)) {
      const normalized = normalizeAddress(address)
      if (!normalized || !entry || typeof entry !== 'object') continue
      nextStore.userDataByAccount[normalized] = {
        data: cloneValue(entry.data || null),
        cooldowns: cloneValue(entry.cooldowns || {}),
        ts: Number(entry.ts) || Date.now()
      }
    }
  }

  if (Array.isArray(rawStore.txHistoryShared)) {
    nextStore.txHistoryShared = dedupeTxList(rawStore.txHistoryShared)
  }

  if (rawStore.txHistoryByAccount && typeof rawStore.txHistoryByAccount === 'object') {
    for (const [address, list] of Object.entries(rawStore.txHistoryByAccount)) {
      const normalized = normalizeAddress(address)
      if (!normalized) continue
      nextStore.txHistoryByAccount[normalized] = dedupeTxList(list)
    }
  }

  if (rawStore.pools) nextStore.pools = cloneValue(rawStore.pools)
  if (rawStore.posts) nextStore.posts = cloneValue(rawStore.posts)
  if (rawStore.settings && typeof rawStore.settings === 'object') {
    nextStore.settings = cloneValue(rawStore.settings)
  }

  return nextStore
}

const store = shallowRef(createEmptyStore())
const txHistoryRef = ref([])
const sharedTxHistoryRef = ref([])
let currentTxHistoryAccount = null

function refreshSharedTxHistory() {
  sharedTxHistoryRef.value = [...(store.value.txHistoryShared || [])]
}

function refreshAccountTxHistory(accountAddr = currentTxHistoryAccount) {
  currentTxHistoryAccount = normalizeAddress(accountAddr) || null
  if (!currentTxHistoryAccount) {
    txHistoryRef.value = []
    return
  }
  txHistoryRef.value = [...(store.value.txHistoryByAccount?.[currentTxHistoryAccount] || [])]
}

function replaceStore(nextStore) {
  store.value = sanitizeStore(nextStore)
  refreshSharedTxHistory()
  refreshAccountTxHistory(currentTxHistoryAccount)
}

function updateStore(mutator) {
  const nextStore = sanitizeStore(store.value)
  mutator(nextStore)
  replaceStore(nextStore)
}

function loadStore(chainId, tokenAddr) {
  if (!chainId || !tokenAddr) {
    replaceStore(createEmptyStore())
    return
  }

  const key = getCacheKey(chainId, tokenAddr)
  try {
    const raw = localStorage.getItem(key)
    replaceStore(raw ? JSON.parse(raw) : createEmptyStore())
  } catch {
    replaceStore(createEmptyStore())
  }
}

function saveStore(chainId, tokenAddr) {
  if (!chainId || !tokenAddr) return
  const key = getCacheKey(chainId, tokenAddr)
  try {
    localStorage.setItem(key, JSON.stringify(store.value))
  } catch {}
}

function loadUserData(accountAddr) {
  const normalized = normalizeAddress(accountAddr)
  if (!normalized) return null
  const entry = store.value.userDataByAccount?.[normalized]
  return entry ? cloneValue(entry) : null
}

function loadUserCooldowns(accountAddr) {
  return cloneValue(loadUserData(accountAddr)?.cooldowns || {})
}

function getCachedAccounts() {
  return Object.keys(store.value.userDataByAccount || {})
}

function saveUserData(accountAddr, data, options = {}) {
  const normalized = normalizeAddress(accountAddr)
  if (!normalized || !data) return

  updateStore((nextStore) => {
    const previous = nextStore.userDataByAccount[normalized] || {}
    nextStore.userDataByAccount = { ...nextStore.userDataByAccount }
    nextStore.userDataByAccount[normalized] = {
      data: cloneValue(data),
      cooldowns: {
        ...(previous.cooldowns || {}),
        ...(options.cooldowns || {})
      },
      ts: Date.now()
    }
  })
}

function saveUserCooldowns(accountAddr, cooldowns = {}) {
  const normalized = normalizeAddress(accountAddr)
  if (!normalized) return

  updateStore((nextStore) => {
    const previous = nextStore.userDataByAccount[normalized] || {}
    nextStore.userDataByAccount = { ...nextStore.userDataByAccount }
    nextStore.userDataByAccount[normalized] = {
      data: cloneValue(previous.data || null),
      cooldowns: {
        ...(previous.cooldowns || {}),
        ...cloneValue(cooldowns)
      },
      ts: Number(previous.ts) || Date.now()
    }
  })
}

function saveUserSnapshots(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return

  updateStore((nextStore) => {
    nextStore.userDataByAccount = { ...nextStore.userDataByAccount }
    for (const entry of entries) {
      const normalized = normalizeAddress(entry?.accountAddr || entry?.address)
      if (!normalized || !entry?.data) continue
      const previous = nextStore.userDataByAccount[normalized] || {}
      nextStore.userDataByAccount[normalized] = {
        data: cloneValue(entry.data),
        cooldowns: {
          ...(previous.cooldowns || {}),
          ...(entry.cooldowns || {})
        },
        ts: Date.now()
      }
    }
  })
}

function clearUserData(accountAddr) {
  const normalized = normalizeAddress(accountAddr)
  if (!normalized) return

  updateStore((nextStore) => {
    if (!nextStore.userDataByAccount[normalized]) return
    nextStore.userDataByAccount = { ...nextStore.userDataByAccount }
    delete nextStore.userDataByAccount[normalized]
  })
}

function loadPools() {
  return store.value.pools ? cloneValue(store.value.pools) : null
}

function savePoolsData(data) {
  if (!data) return
  updateStore((nextStore) => {
    nextStore.pools = { data: cloneValue(data), ts: Date.now() }
  })
}

function clearPools() {
  updateStore((nextStore) => {
    nextStore.pools = null
  })
}

function loadTxHistory(accountAddr) {
  refreshAccountTxHistory(accountAddr)
  return txHistoryRef.value
}

function loadSharedTxHistory() {
  refreshSharedTxHistory()
  return sharedTxHistoryRef.value
}

function saveTxHistory(list, accountAddr) {
  const normalized = normalizeAddress(accountAddr)
  if (!normalized) return

  updateStore((nextStore) => {
    nextStore.txHistoryByAccount = { ...nextStore.txHistoryByAccount }
    nextStore.txHistoryByAccount[normalized] = dedupeTxList(list)
  })
}

function saveSharedTxHistory(list) {
  updateStore((nextStore) => {
    nextStore.txHistoryShared = dedupeTxList(list)
  })
}

function addTxToHistory(tx, accountAddr) {
  if (!tx?.hash) return
  const normalized = normalizeAddress(accountAddr)

  updateStore((nextStore) => {
    nextStore.txHistoryShared = dedupeTxList([tx, ...(nextStore.txHistoryShared || [])])

    if (normalized) {
      nextStore.txHistoryByAccount = { ...nextStore.txHistoryByAccount }
      nextStore.txHistoryByAccount[normalized] = dedupeTxList([
        tx,
        ...(nextStore.txHistoryByAccount[normalized] || [])
      ])
    }
  })
}

function clearTxHistory(accountAddr) {
  const normalized = normalizeAddress(accountAddr)
  if (!normalized) return

  updateStore((nextStore) => {
    nextStore.txHistoryByAccount = { ...nextStore.txHistoryByAccount }
    nextStore.txHistoryByAccount[normalized] = []
  })
}

function clearSharedTxHistory() {
  updateStore((nextStore) => {
    nextStore.txHistoryShared = []
  })
}

function loadPosts() {
  return store.value.posts ? cloneValue(store.value.posts) : null
}

function savePosts(data) {
  if (!Array.isArray(data)) return
  updateStore((nextStore) => {
    nextStore.posts = { data: cloneValue(data), ts: Date.now() }
  })
}

function loadSettings() {
  return cloneValue(store.value.settings || {})
}

function saveSetting(key, value) {
  if (!key) return
  updateStore((nextStore) => {
    nextStore.settings = {
      ...(nextStore.settings || {}),
      [key]: value
    }
  })
}

function clearAllWithChainToken(chainId, tokenAddr) {
  const key = getCacheKey(chainId, tokenAddr)
  try {
    localStorage.removeItem(key)
  } catch {}
  replaceStore(createEmptyStore())
}

export function useDataStore() {
  return {
    store,
    txHistoryRef,
    sharedTxHistoryRef,
    loadStore,
    saveStore,
    loadUserData,
    loadUserCooldowns,
    getCachedAccounts,
    saveUserData,
    saveUserCooldowns,
    saveUserSnapshots,
    clearUserData,
    loadPools,
    savePoolsData,
    clearPools,
    loadTxHistory,
    loadSharedTxHistory,
    saveTxHistory,
    saveSharedTxHistory,
    addTxToHistory,
    clearTxHistory,
    clearSharedTxHistory,
    loadPosts,
    savePosts,
    loadSettings,
    saveSetting,
    clearAllWithChainToken
  }
}
