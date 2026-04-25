import { ref, shallowRef, computed } from 'vue'
import { NETWORK_CONFIG } from '@/contracts'
import { t } from '@/locales'

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
      errorMessage.value = t('modules.tx_history.error.rejected')
    } else if (e.code === 'INSUFFICIENT_FUNDS') {
      errorMessage.value = t('modules.tx_history.error.insufficient_funds')
    } else if (e.reason) {
      errorMessage.value = e.reason
    } else if (e.info?.error?.message) {
      errorMessage.value = e.info.error.message
    } else {
      errorMessage.value = e.shortMessage || e.message || t('common.message.transaction_failed')
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
