import { h, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/composables/useDataStore'
import { useTransaction } from '@/composables/useTransaction'
import { NETWORK_CONFIG } from '@/contracts'
import { t } from '@/locales'

function normalizeAddress(address) {
  return typeof address === 'string' ? address.trim().toLowerCase() : ''
}

function normalizeFieldList(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return null
  return [...new Set(fields)]
}

function mergeFieldLists(currentFields, nextFields) {
  if (currentFields === null || nextFields === null) return null
  return [...new Set([...(currentFields || []), ...(nextFields || [])])]
}

export function useCommunityTransactions({
  account,
  saveActiveStore,
  getCachedAccounts,
  isCurrentAccount,
  refreshAccountData,
  refreshAccountFields,
  fetchPosts,
  refreshPools
}) {
  const tx = useTransaction()
  const { addTxToHistory } = useDataStore()
  const writeLoading = ref(false)

  function notifyTxPending(label) {
    return ElMessage({
      message: t('common.message.transaction_pending', { label }),
      type: 'warning',
      duration: 0
    })
  }

  function notifyTxSuccess(hash, label) {
    ElMessage.closeAll()
    const txUrl = NETWORK_CONFIG.blockExplorer ? `${NETWORK_CONFIG.blockExplorer}/tx/${hash}` : '#'
    ElMessage({
      message: h('div', null, [
        h('span', null, t('common.message.transaction_success', { label: label || t('common.message.transaction') })),
        h('a', { href: txUrl, target: '_blank', class: 'tx-link' }, hash)
      ]),
      type: 'success',
      duration: 6000,
      showClose: true,
      offset: 40
    })
  }

  function notifyTxError(message) {
    ElMessage.closeAll()
    ElMessage({
      message: message || t('common.message.unknown_error'),
      type: 'error',
      duration: 5000
    })
  }

  function recordTxHistory(hash, label, txMeta = null) {
    if (!hash || !label) return
    addTxToHistory({
      hash,
      label,
      label_key: txMeta?.key,
      label_params: txMeta?.params,
      timestamp: Date.now()
    }, account.value)
    saveActiveStore()
  }

  function buildRefreshTargets({ refreshCurrentAccount = true, currentAccountFields = null, affectedAccounts = [] }) {
    const targets = new Map()

    if (refreshCurrentAccount && account.value) {
      targets.set(normalizeAddress(account.value), normalizeFieldList(currentAccountFields))
    }

    for (const item of affectedAccounts) {
      const address = typeof item === 'string' ? item : item?.address
      const normalized = normalizeAddress(address)
      if (!normalized) continue

      const nextFields = typeof item === 'string'
        ? null
        : normalizeFieldList(item?.fields)

      if (!targets.has(normalized)) {
        targets.set(normalized, nextFields)
        continue
      }

      targets.set(normalized, mergeFieldLists(targets.get(normalized), nextFields))
    }

    return [...targets.entries()].map(([address, fields]) => ({ address, fields }))
  }

  function getCachedAccountFieldTargets(fields) {
    return getCachedAccounts().map((address) => ({ address, fields }))
  }

  async function refreshTargets(targets) {
    for (const target of targets) {
      if (target.fields) {
        await refreshAccountFields(target.address, target.fields, {
          fetchPostsAfter: false,
          showErrors: isCurrentAccount(target.address)
        })
      } else {
        await refreshAccountData(target.address, {
          fetchPostsAfter: false,
          showSummary: false,
          showErrors: isCurrentAccount(target.address)
        })
      }
    }
  }

  async function doWrite(fn, options = {}) {
    const {
      txLabel = '',
      txMeta = null,
      refreshCurrentAccount = true,
      currentAccountFields = null,
      affectedAccounts = [],
      refreshPostsAfter = false,
      refreshPoolsAfter = false,
      onSuccess = null
    } = options

    writeLoading.value = true
    notifyTxPending(txLabel || t('common.message.transaction'))

    try {
      const receipt = await tx.execute(fn)
      const hash = String(receipt.hash || '')

      if (txLabel && hash) {
        recordTxHistory(hash, txLabel, txMeta)
      }

      // 交易后按账户合并刷新目标，避免同一地址被重复查询。
      await refreshTargets(buildRefreshTargets({
        refreshCurrentAccount,
        currentAccountFields,
        affectedAccounts
      }))

      if (refreshPostsAfter) {
        await fetchPosts()
      }

      if (refreshPoolsAfter) {
        await refreshPools()
      }

      notifyTxSuccess(hash, txLabel)
      if (onSuccess) onSuccess(receipt)
    } catch (e) {
      const message = tx.errorMessage.value || e.message || t('common.message.transaction_failed')
      notifyTxError(message)
    } finally {
      writeLoading.value = false
    }
  }

  return {
    tx,
    writeLoading,
    notifyTxPending,
    notifyTxSuccess,
    notifyTxError,
    recordTxHistory,
    getCachedAccountFieldTargets,
    refreshTargets,
    doWrite
  }
}
