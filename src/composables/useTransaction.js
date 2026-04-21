import { ref, shallowRef, computed } from 'vue'
import { NETWORK_CONFIG } from '@/contracts'

const status = ref('idle') // idle | pending | success | error
const txHash = ref(null)
const receipt = shallowRef(null)
const errorMessage = ref(null)

const isLoading = computed(() => status.value === 'pending')
const isSuccess = computed(() => status.value === 'success')
const isError = computed(() => status.value === 'error')

function reset() {
  status.value = 'idle'
  txHash.value = null
  receipt.value = null
  errorMessage.value = null
}

function getTxLink(hash) {
  if (!hash || !NETWORK_CONFIG.blockExplorer) return ''
  return `${NETWORK_CONFIG.blockExplorer}/tx/${hash}`
}

async function execute(fn) {
  reset()
  try {
    status.value = 'pending'
    const txResponse = await fn()
    txHash.value = String(txResponse.hash)
    receipt.value = await txResponse.wait()
    status.value = 'success'
    return receipt.value
  } catch (e) {
    status.value = 'error'
    if (e.code === 4001 || e.code === 'ACTION_REJECTED') {
      errorMessage.value = '您取消了交易'
    } else if (e.code === 'INSUFFICIENT_FUNDS') {
      errorMessage.value = 'ETH 余额不足以支付燃气费'
    } else if (e.reason) {
      errorMessage.value = e.reason
    } else if (e.info?.error?.message) {
      errorMessage.value = e.info.error.message
    } else {
      errorMessage.value = e.shortMessage || e.message || '交易失败'
    }
    throw e
  }
}

export function useTransaction() {
  return {
    status,
    txHash,
    receipt,
    errorMessage,
    isLoading,
    isSuccess,
    isError,
    reset,
    getTxLink,
    execute
  }
}