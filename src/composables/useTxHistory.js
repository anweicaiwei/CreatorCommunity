import { ref, computed } from 'vue'

const txList = ref([])
const listLoaded = ref(false)

function getStorageKey(chainId, tokenAddr) {
  return `creatorcommunity_${chainId}_${tokenAddr}_tx_history`
}

function loadHistory(chainId, tokenAddr) {
  if (!chainId || !tokenAddr) {
    txList.value = []
    listLoaded.value = true
    return
  }
  const key = getStorageKey(chainId, tokenAddr)
  try {
    const raw = localStorage.getItem(key)
    txList.value = raw ? JSON.parse(raw) : []
  } catch {
    txList.value = []
  }
  listLoaded.value = true
}

function saveHistory(chainId, tokenAddr) {
  if (!chainId || !tokenAddr) return
  const key = getStorageKey(chainId, tokenAddr)
  try {
    localStorage.setItem(key, JSON.stringify(txList.value))
  } catch {}
}

function addTx(chainId, tokenAddr, { hash, label, timestamp }) {
  // Deduplicate by hash
  if (txList.value.some(t => t.hash === hash)) return
  txList.value.unshift({ hash, label, timestamp })
  saveHistory(chainId, tokenAddr)
}

function clearHistory(chainId, tokenAddr) {
  txList.value = []
  saveHistory(chainId, tokenAddr)
}

export function useTxHistory() {
  return {
    txList,
    listLoaded,
    loadHistory,
    addTx,
    clearHistory,
    saveHistory
  }
}