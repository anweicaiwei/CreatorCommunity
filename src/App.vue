<script setup>
import { ref, computed, watch, h, provide, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { ethers } from 'ethers'
import { useWallet } from '@/composables/useWallet'
import { useTransaction } from '@/composables/useTransaction'
import { useContractAddress } from '@/composables/useContractAddress'
import { useDeploy } from '@/composables/useDeploy'
import { useDataStore } from '@/composables/useDataStore'
import { config } from '@/config'
import { formatTokenAmount, formatCooldown, getCooldownStatus, shortenAddress } from '@/utils/format'
import { DECIMALS } from '@/utils/constants'
import { NETWORK_CONFIG } from '@/contracts'
import { elementPlusLocale, t } from '@/locales'

const { locale } = useI18n()

const wallet = useWallet()
const {
  account,
  chainId,
  isConnected,
  isCorrectNetwork,
  isInitializing,
  error,
  currentNetwork,
  isOwner,
  tokenContractRead,
  nftContractRead,
  tokenContractWrite,
  nftContractWrite,
  contractsReady,
  connect,
  disconnect: walletDisconnect,
  switchNetwork,
  initAutoConnect
} = wallet

const tx = useTransaction()
const { hasAddresses, tokenAddress, nftAddress, clearAllContractData } = useContractAddress()
const { deployStatus, deployError, deployedTokenAddress, deployedNftAddress, deploy, resetDeploy } = useDeploy()

const {
  txHistoryRef,
  sharedTxHistoryRef,
  loadStore,
  saveStore,
  loadUserData,
  loadUserCooldowns,
  getCachedAccounts,
  saveUserData,
  saveUserCooldowns,
  clearUserData,
  loadPools,
  savePoolsData,
  loadTxHistory,
  loadSharedTxHistory,
  addTxToHistory,
  loadPosts,
  savePosts,
  loadSettings,
  saveSetting,
  clearAllWithChainToken
} = useDataStore()

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

function isCurrentAccount(address) {
  return normalizeAddress(address) === normalizeAddress(account.value)
}

function saveActiveStore() {
  saveStore(Number(chainId.value), tokenAddress.value)
}

function loadTxHistories(targetAddr = account.value) {
  loadTxHistory(targetAddr)
  loadSharedTxHistory()
}

function setTxHistoryScope(scope) {
  txHistoryScope.value = scope === 'shared' ? 'shared' : 'account'
}

const canInteract = computed(() =>
  isConnected.value && isCorrectNetwork.value && contractsReady.value && hasAddresses.value
)

const isDataLoaded = ref(false)
const dataLoadingProgress = ref(`${t('common.status.pending')}...`)
const showTransfer = ref(false)
const globalRefreshLoading = ref(false)
const txHistoryScope = ref('account')
const txHistoryList = computed(() =>
  txHistoryScope.value === 'shared' ? sharedTxHistoryRef.value : txHistoryRef.value
)

const labelMap = computed(() => ({
  ctkBalance: t('modules.chain_data.field.ctk_balance'),
  hasClaimedInitial: t('modules.chain_data.field.has_claimed_initial'),
  postCooldown: t('modules.chain_data.field.post_cooldown'),
  commentCooldown: t('modules.chain_data.field.comment_cooldown'),
  nftBoost: t('modules.chain_data.field.nft_boost'),
  bronzePrice: t('modules.chain_data.field.bronze_price'),
  silverPrice: t('modules.chain_data.field.silver_price'),
  goldPrice: t('modules.chain_data.field.gold_price'),
  nftCount: t('modules.chain_data.field.nft_count'),
  myBronze: t('modules.chain_data.field.my_bronze'),
  mySilver: t('modules.chain_data.field.my_silver'),
  myGold: t('modules.chain_data.field.my_gold'),
  pendingPostReward: t('modules.chain_data.field.pending_post_reward'),
  pendingCommentReward: t('modules.chain_data.field.pending_comment_reward'),
  pendingInitialReward: t('modules.chain_data.field.pending_initial_reward'),
  pendingTotalReward: t('modules.chain_data.field.pending_total_reward')
}))

const readData = ref({})
const readError = ref(null)
const readLoading = ref(false)
const poolData = ref({})
const posts = ref([])
const postLoading = ref(false)
const writeLoading = ref(false)

const postCooldownEnd = ref(0)
const commentCooldownEnd = ref(0)
let cooldownTimer = null

function initStore() {
  loadStore(Number(chainId.value), tokenAddress.value)
}

function initTransferToggle() {
  const settings = loadSettings()
  showTransfer.value = settings.showTransfer === true
}

function toggleTransfer() {
  showTransfer.value = !showTransfer.value
  saveSetting('showTransfer', showTransfer.value)
  saveActiveStore()
}

function loadPersistedCooldowns(targetAddr) {
  const cached = loadUserCooldowns(targetAddr)
  return {
    post: Number(cached.post) || 0,
    comment: Number(cached.comment) || 0
  }
}

function cooldownWaitingPrefix() {
  return t('modules.chain_data.cooldown.waiting', { time: '' }).trim()
}

function isCooldownWaitingText(value) {
  return typeof value === 'string' && (
    value.startsWith(cooldownWaitingPrefix()) ||
    value.startsWith('等待') ||
    value.startsWith('Wait')
  )
}

function formatCooldownText(type, remaining) {
  const readyKey = type === 'post'
    ? 'modules.chain_data.cooldown.ready_post'
    : 'modules.chain_data.cooldown.ready_comment'
  if (remaining <= 0) return t(readyKey)
  return t('modules.chain_data.cooldown.waiting', { time: formatCooldown(remaining) })
}

function getCurrentCooldownSnapshot() {
  return {
    post: postCooldownEnd.value,
    comment: commentCooldownEnd.value
  }
}

function stopCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

function applyCurrentCooldowns(cooldowns = {}) {
  postCooldownEnd.value = Number(cooldowns.post) || 0
  commentCooldownEnd.value = Number(cooldowns.comment) || 0

  const now = Date.now()
  const nextData = { ...readData.value }
  if (Object.prototype.hasOwnProperty.call(nextData, 'postCooldown') || postCooldownEnd.value > 0) {
    nextData.postCooldown = formatCooldownText('post', Math.max(0, postCooldownEnd.value - now))
  }
  if (Object.prototype.hasOwnProperty.call(nextData, 'commentCooldown') || commentCooldownEnd.value > 0) {
    nextData.commentCooldown = formatCooldownText('comment', Math.max(0, commentCooldownEnd.value - now))
  }
  readData.value = nextData

  if (postCooldownEnd.value > now || commentCooldownEnd.value > now) {
    startCooldownTimer()
  } else {
    stopCooldownTimer()
  }
}

function startCooldownTimer() {
  stopCooldownTimer()
  cooldownTimer = setInterval(() => {
    const now = Date.now()
    let changed = false
    const nextData = { ...readData.value }

    if (postCooldownEnd.value > now) {
      if (Object.prototype.hasOwnProperty.call(nextData, 'postCooldown')) {
        nextData.postCooldown = formatCooldownText('post', postCooldownEnd.value - now)
      }
    } else if (postCooldownEnd.value > 0) {
      postCooldownEnd.value = 0
      changed = true
      if (Object.prototype.hasOwnProperty.call(nextData, 'postCooldown')) {
        nextData.postCooldown = formatCooldownText('post', 0)
      }
    }

    if (commentCooldownEnd.value > now) {
      if (Object.prototype.hasOwnProperty.call(nextData, 'commentCooldown')) {
        nextData.commentCooldown = formatCooldownText('comment', commentCooldownEnd.value - now)
      }
    } else if (commentCooldownEnd.value > 0) {
      commentCooldownEnd.value = 0
      changed = true
      if (Object.prototype.hasOwnProperty.call(nextData, 'commentCooldown')) {
        nextData.commentCooldown = formatCooldownText('comment', 0)
      }
    }

    readData.value = nextData

    if (changed && account.value) {
      saveUserCooldowns(account.value, getCurrentCooldownSnapshot())
      saveActiveStore()
    }

    if (postCooldownEnd.value === 0 && commentCooldownEnd.value === 0) {
      stopCooldownTimer()
    }
  }, 1000)
}

function relocalizeCooldownLabels() {
  const nextData = { ...readData.value }
  if (postCooldownEnd.value > 0 || isCooldownWaitingText(nextData.postCooldown)) {
    nextData.postCooldown = formatCooldownText('post', Math.max(0, postCooldownEnd.value - Date.now()))
  }
  if (commentCooldownEnd.value > 0 || isCooldownWaitingText(nextData.commentCooldown)) {
    nextData.commentCooldown = formatCooldownText('comment', Math.max(0, commentCooldownEnd.value - Date.now()))
  }
  readData.value = nextData
}

function hydrateCurrentAccountFromCache(targetAddr) {
  const userCache = loadUserData(targetAddr)
  if (!userCache?.data) return false

  readData.value = cloneValue(userCache.data)
  readError.value = null
  applyCurrentCooldowns(loadPersistedCooldowns(targetAddr))
  return true
}

async function fetchPosts() {
  if (!tokenContractRead.value) return
  postLoading.value = true
  try {
    const total = Number(await tokenContractRead.value.postIdCounter())
    if (total === 0) {
      posts.value = []
      savePosts([])
      saveActiveStore()
      return
    }

    const list = []
    for (let i = 0; i < total; i++) {
      const author = await tokenContractRead.value.postAuthor(i)
      list.push({
        postId: i,
        author,
        authorShort: shortenAddress(author)
      })
    }

    posts.value = list.reverse()
    savePosts(posts.value)
    saveActiveStore()
  } catch (e) {
    console.error('fetchPosts error:', e)
  } finally {
    postLoading.value = false
  }
}

async function queryUserNFTBreakdown(targetAddr) {
  if (!nftContractRead.value) {
    return {
      myBronze: 0,
      mySilver: 0,
      myGold: 0,
      myBronzeBoost: '0.0',
      mySilverBoost: '0.0',
      myGoldBoost: '0.0',
      theoreticalBoost: '0.0',
      myNFTs: { bronze: [], silver: [], gold: [] }
    }
  }

  const nftIds = await nftContractRead.value.getNFTsByOwner(targetAddr)
  const bronze = []
  const silver = []
  const gold = []

  for (const id of nftIds) {
    const rank = Number(await nftContractRead.value.nftRank(id))
    if (rank === 0) bronze.push(Number(id))
    else if (rank === 1) silver.push(Number(id))
    else if (rank === 2) gold.push(Number(id))
  }

  return {
    myBronze: bronze.length,
    mySilver: silver.length,
    myGold: gold.length,
    myBronzeBoost: (bronze.length * 0.5).toFixed(1),
    mySilverBoost: (silver.length * 2).toFixed(1),
    myGoldBoost: (gold.length * 12).toFixed(1),
    theoreticalBoost: (bronze.length * 0.5 + silver.length * 2 + gold.length * 12).toFixed(1),
    myNFTs: { bronze, silver, gold }
  }
}

async function queryAccountSnapshot(targetAddr) {
  if (!tokenContractRead.value || !nftContractRead.value) {
    throw new Error(t('common.message.contract_not_initialized'))
  }

  const tokenContract = tokenContractRead.value
  const nftContract = nftContractRead.value
  const [
    balance,
    hasClaimedInitial,
    lastPostRaw,
    postIntervalRaw,
    lastCommentRaw,
    commentIntervalRaw,
    nftBoostRaw,
    bronzePriceRaw,
    silverPriceRaw,
    goldPriceRaw,
    nftBalanceRaw,
    pendingRewards
  ] = await Promise.all([
    tokenContract.balanceOf(targetAddr),
    tokenContract.hasClaimedInitialReward(targetAddr),
    tokenContract.lastPostTime(targetAddr),
    tokenContract.POST_INTERVAL(),
    tokenContract.lastCommentTime(targetAddr),
    tokenContract.COMMENT_INTERVAL(),
    tokenContract.calculateNFTBoost(targetAddr),
    nftContract.bronzePrice(),
    nftContract.silverPrice(),
    nftContract.goldPrice(),
    nftContract.balanceOf(targetAddr),
    tokenContract.getPendingRewards(targetAddr)
  ])

  const lastPost = Number(lastPostRaw)
  const postInterval = Number(postIntervalRaw)
  const lastComment = Number(lastCommentRaw)
  const commentInterval = Number(commentIntervalRaw)

  const postCooldown = getCooldownStatus(lastPost, postInterval * 1000)
  const commentCooldown = getCooldownStatus(lastComment, commentInterval * 1000)
  const nftBreakdown = await queryUserNFTBreakdown(targetAddr)

  const cooldowns = {
    post: postCooldown.ready ? 0 : (lastPost * 1000 + postInterval * 1000),
    comment: commentCooldown.ready ? 0 : (lastComment * 1000 + commentInterval * 1000)
  }

  return {
    data: {
      ctkBalance: formatTokenAmount(balance),
      hasClaimedInitial,
      postCooldown: formatCooldownText('post', postCooldown.remaining),
      commentCooldown: formatCooldownText('comment', commentCooldown.remaining),
      nftBoost: Number(nftBoostRaw),
      bronzePrice: formatTokenAmount(bronzePriceRaw),
      silverPrice: formatTokenAmount(silverPriceRaw),
      goldPrice: formatTokenAmount(goldPriceRaw),
      nftCount: Number(nftBalanceRaw),
      ...nftBreakdown,
      pendingPostReward: formatTokenAmount(pendingRewards.post),
      pendingCommentReward: formatTokenAmount(pendingRewards.comment),
      pendingInitialReward: formatTokenAmount(pendingRewards.initial),
      pendingTotalReward: formatTokenAmount(pendingRewards.total)
    },
    cooldowns,
    meta: {
      nftCount: Number(nftBalanceRaw),
      pendingTotal: pendingRewards.total
    }
  }
}

async function refreshAccountData(targetAddr, options = {}) {
  const normalized = normalizeAddress(targetAddr)
  if (!normalized) return null

  const targetIsCurrent = options.syncCurrent !== false && isCurrentAccount(normalized)
  if (targetIsCurrent && options.setLoading) {
    readLoading.value = true
    readError.value = null
  }

  try {
    const snapshot = await queryAccountSnapshot(normalized)
    saveUserData(normalized, snapshot.data, { cooldowns: snapshot.cooldowns })
    saveActiveStore()

    if (targetIsCurrent) {
      readData.value = snapshot.data
      readError.value = null
      applyCurrentCooldowns(snapshot.cooldowns)

      if (options.showSummary) {
        const parts = [t('modules.chain_data.summary.medal_count', {
          ctk: snapshot.data.ctkBalance,
          count: snapshot.meta.nftCount
        })]
        if (snapshot.meta.pendingTotal > 0n) {
          parts.push(t('modules.chain_data.summary.pending', {
            amount: formatTokenAmount(snapshot.meta.pendingTotal)
          }))
        }
        ElMessage({ message: parts.join(' | '), type: 'success', duration: 3000 })
      }
    }

    if (options.fetchPostsAfter) {
      await fetchPosts()
    }

    return snapshot
  } catch (e) {
    const message = e.message || String(e)
    if (targetIsCurrent) {
      readError.value = message
      if (options.showErrors !== false) {
        ElMessage({
          message: t('modules.chain_data.summary.query_failed', { message }),
          type: 'error',
          duration: 5000
        })
      }
    } else {
      console.error('refreshAccountData error:', e)
    }
    return null
  } finally {
    if (targetIsCurrent && options.setLoading) {
      readLoading.value = false
    }
  }
}

function buildAccountRefreshSummary(snapshot) {
  if (!snapshot?.data || !snapshot?.meta) return ''
  const parts = [t('modules.chain_data.summary.medal_count', {
    ctk: snapshot.data.ctkBalance,
    count: snapshot.meta.nftCount
  })]

  if (snapshot.meta.pendingTotal > 0n) {
    parts.push(t('modules.chain_data.summary.pending', {
      amount: formatTokenAmount(snapshot.meta.pendingTotal)
    }))
  }

  return parts.join(' | ')
}

const fieldQueries = {
  ctkBalance: async (tokenContract, nftContract, targetAddr) => ({
    data: { ctkBalance: formatTokenAmount(await tokenContract.balanceOf(targetAddr)) }
  }),
  hasClaimedInitial: async (tokenContract, nftContract, targetAddr) => ({
    data: { hasClaimedInitial: await tokenContract.hasClaimedInitialReward(targetAddr) }
  }),
  postCooldown: async (tokenContract, nftContract, targetAddr) => {
    const lastPost = Number(await tokenContract.lastPostTime(targetAddr))
    const interval = Number(await tokenContract.POST_INTERVAL())
    const cooldown = getCooldownStatus(lastPost, interval * 1000)
    return {
      data: { postCooldown: formatCooldownText('post', cooldown.remaining) },
      cooldowns: { post: cooldown.ready ? 0 : (lastPost * 1000 + interval * 1000) }
    }
  },
  commentCooldown: async (tokenContract, nftContract, targetAddr) => {
    const lastComment = Number(await tokenContract.lastCommentTime(targetAddr))
    const interval = Number(await tokenContract.COMMENT_INTERVAL())
    const cooldown = getCooldownStatus(lastComment, interval * 1000)
    return {
      data: { commentCooldown: formatCooldownText('comment', cooldown.remaining) },
      cooldowns: { comment: cooldown.ready ? 0 : (lastComment * 1000 + interval * 1000) }
    }
  },
  nftBoost: async (tokenContract, nftContract, targetAddr) => ({
    data: { nftBoost: Number(await tokenContract.calculateNFTBoost(targetAddr)) }
  }),
  bronzePrice: async (tokenContract, nftContract) => ({
    data: { bronzePrice: formatTokenAmount(await nftContract.bronzePrice()) }
  }),
  silverPrice: async (tokenContract, nftContract) => ({
    data: { silverPrice: formatTokenAmount(await nftContract.silverPrice()) }
  }),
  goldPrice: async (tokenContract, nftContract) => ({
    data: { goldPrice: formatTokenAmount(await nftContract.goldPrice()) }
  }),
  nftCount: async (tokenContract, nftContract, targetAddr) => ({
    data: { nftCount: Number(await nftContract.balanceOf(targetAddr)) }
  }),
  pendingPostReward: async (tokenContract, nftContract, targetAddr) => ({
    data: { pendingPostReward: formatTokenAmount((await tokenContract.getPendingRewards(targetAddr)).post) }
  }),
  pendingCommentReward: async (tokenContract, nftContract, targetAddr) => ({
    data: { pendingCommentReward: formatTokenAmount((await tokenContract.getPendingRewards(targetAddr)).comment) }
  }),
  pendingInitialReward: async (tokenContract, nftContract, targetAddr) => ({
    data: { pendingInitialReward: formatTokenAmount((await tokenContract.getPendingRewards(targetAddr)).initial) }
  }),
  pendingTotalReward: async (tokenContract, nftContract, targetAddr) => ({
    data: { pendingTotalReward: formatTokenAmount((await tokenContract.getPendingRewards(targetAddr)).total) }
  }),
  myNFTs: async (tokenContract, nftContract, targetAddr) => ({
    data: await queryUserNFTBreakdown(targetAddr)
  })
}

async function refreshAccountFields(targetAddr, keys, options = {}) {
  const normalized = normalizeAddress(targetAddr)
  const uniqueKeys = [...new Set(Array.isArray(keys) ? keys : [])]
  if (!normalized) return null
  if (!uniqueKeys.length) {
    return refreshAccountData(normalized, options)
  }

  const existingEntry = loadUserData(normalized)
  if (!existingEntry?.data) {
    return refreshAccountData(normalized, {
      ...options,
      showSummary: false
    })
  }

  if (!tokenContractRead.value || !nftContractRead.value) {
    return null
  }

  let cooldowns = loadPersistedCooldowns(normalized)
  const updates = {}

  try {
    for (const key of uniqueKeys) {
      if (!fieldQueries[key]) continue
      const result = await fieldQueries[key](tokenContractRead.value, nftContractRead.value, normalized)
      if (result?.data) Object.assign(updates, result.data)
      if (result?.cooldowns) cooldowns = { ...cooldowns, ...result.cooldowns }
    }
  } catch {
    return refreshAccountData(normalized, {
      ...options,
      showSummary: false
    })
  }

  const mergedData = { ...(existingEntry.data || {}), ...updates }
  saveUserData(normalized, mergedData, { cooldowns })
  saveActiveStore()

  if (options.syncCurrent !== false && isCurrentAccount(normalized)) {
    readData.value = { ...readData.value, ...updates }
    readError.value = null
    applyCurrentCooldowns(cooldowns)
  }

  if (options.fetchPostsAfter) {
    await fetchPosts()
  }

  return { data: mergedData, cooldowns }
}

async function refreshData(options = {}) {
  if (!account.value) return null

  globalRefreshLoading.value = true

  try {
    const currentSnapshot = await refreshAccountData(account.value, {
      setLoading: true,
      showSummary: false,
      showErrors: true,
      fetchPostsAfter: false,
      ...options
    })

    const otherTargets = [...new Set(getCachedAccounts()
      .map((address) => normalizeAddress(address))
      .filter((address) => address && address !== normalizeAddress(account.value)))]
      .map((address) => ({ address, fields: null }))

    await refreshTargets(otherTargets)
    await fetchPosts()
    await refreshPools()
    loadTxHistories(account.value)

    if (options.showSummary !== false) {
      const message = buildAccountRefreshSummary(currentSnapshot)
      if (message) {
        ElMessage({ message, type: 'success', duration: 3000 })
      }
    }

    return currentSnapshot
  } finally {
    globalRefreshLoading.value = false
  }
}

async function refreshFields(keys, options = {}) {
  return refreshAccountFields(account.value, keys, {
    fetchPostsAfter: true,
    ...options
  })
}

async function refreshPools() {
  if (!tokenContractRead.value || !nftContractRead.value) return
  try {
    const NFT_POOL_INITIAL = BigInt(2000000) * BigInt(10 ** 18)
    const [
      creatorTotal,
      creatorUsed,
      interactTotal,
      interactUsed,
      nftTotal,
      nftUsed,
      nftBalance,
      withdrawableAmount
    ] = await Promise.all([
      tokenContractRead.value.CREATOR_POOL(),
      tokenContractRead.value.creatorPoolUsed(),
      tokenContractRead.value.INTERACT_POOL(),
      tokenContractRead.value.interactPoolUsed(),
      tokenContractRead.value.NFT_POOL(),
      tokenContractRead.value.nftPoolUsed(),
      tokenContractRead.value.balanceOf(nftContractRead.value.target),
      nftContractRead.value.getWithdrawableAmount()
    ])

    const overflow = nftBalance > NFT_POOL_INITIAL ? nftBalance - NFT_POOL_INITIAL : 0n
    const data = {
      creatorPool: `${formatTokenAmount(creatorTotal - creatorUsed)} / ${formatTokenAmount(creatorTotal)}`,
      interactPool: `${formatTokenAmount(interactTotal - interactUsed)} / ${formatTokenAmount(interactTotal)}`,
      nftPool: `${formatTokenAmount(nftTotal - nftUsed)} / ${formatTokenAmount(nftTotal)}`,
      nftContractBalance: formatTokenAmount(nftBalance),
      withdrawableAmount: formatTokenAmount(withdrawableAmount),
      overflowAmount: formatTokenAmount(overflow)
    }

    poolData.value = data
    savePoolsData(data)
    saveActiveStore()
  } catch (e) {
    ElMessage({ message: `池子数据查询失败: ${e.message}`, type: 'error', duration: 5000 })
  }
}

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

function normalizeFieldList(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return null
  return [...new Set(fields)]
}

function mergeFieldLists(currentFields, nextFields) {
  if (currentFields === null || nextFields === null) return null
  return [...new Set([...(currentFields || []), ...(nextFields || [])])]
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

function disconnect() {
  ElMessageBox.confirm(
    h('div', null, [
      h('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, t('modules.wallet.message.disconnect_confirm')),
      h('p', { style: 'margin-bottom: 4px; color: #e6a23c;' }, t('modules.wallet.message.disconnect_clear')),
      h('ul', { style: 'margin: 0 0 12px 20px; padding-left: 0; color: #909399; font-size: 13px;' }, [
        h('li', null, t('modules.wallet.message.cache_balance')),
        h('li', null, t('modules.wallet.message.cache_nft')),
        h('li', null, t('modules.wallet.message.cache_cooldown')),
        h('li', null, t('modules.wallet.message.cache_rewards')),
        h('li', null, t('modules.wallet.message.cache_settings'))
      ]),
      h('p', { style: 'margin-bottom: 0; color: #67c23a;' }, t('modules.wallet.message.disconnect_keep')),
      h('ul', { style: 'margin: 0; color: #909399; font-size: 13px;' }, [
        h('li', null, t('modules.wallet.message.keep_tx')),
        h('li', null, t('modules.wallet.message.keep_posts')),
        h('li', null, t('modules.wallet.message.keep_pools'))
      ])
    ]),
    t('modules.wallet.message.disconnect_title'),
    {
      confirmButtonText: t('modules.wallet.message.disconnect_confirm_button'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning',
      draggable: true
    }
  ).then(() => {
    const currentAccount = account.value

    readData.value = {}
    readError.value = null
    poolData.value = {}
    posts.value = []
    isDataLoaded.value = false
    showTransfer.value = false
    applyCurrentCooldowns({ post: 0, comment: 0 })
    stopCooldownTimer()

    if (currentAccount) {
      clearUserData(currentAccount)
      saveActiveStore()
    }

    loadTxHistories(null)
    walletDisconnect()
    ElMessage({ message: t('modules.wallet.message.disconnected'), type: 'info', duration: 2000 })
  }).catch(() => {})
}

async function handleDeploy() {
  if (!isConnected.value) {
    ElMessage.error(t('modules.deploy.message.connect_wallet_first'))
    return
  }
  if (!isCorrectNetwork.value) {
    ElMessage.error(t('modules.deploy.message.switch_correct_network'))
    return
  }

  ElMessage({ message: t('modules.deploy.message.deploying'), type: 'warning', duration: 0 })
  try {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const result = await deploy(signer)
    if (!result) return

    ElMessage.closeAll()
    ElMessage({
      message: h('div', null, [
        h('span', null, t('modules.deploy.message.success_token')),
        h('code', null, result.tokenAddress),
        h('br'),
        h('span', null, 'NFT: '),
        h('code', null, result.nftAddress)
      ]),
      type: 'success',
      duration: 8000,
      showClose: true,
      offset: 40
    })
    await connect()
  } catch (e) {
    ElMessage.closeAll()
    const message = deployError.value || e.reason || e.message || t('modules.deploy.status.failed')
    ElMessage({ message, type: 'error', duration: 8000 })
  }
}

async function handleClearAddresses() {
  await ElMessageBox.confirm(
    t('modules.deploy.message.clear_confirm'),
    t('modules.deploy.message.clear_title'),
    {
      confirmButtonText: t('modules.deploy.message.clear_confirm_button'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    }
  )

  const currentChainId = Number(chainId.value)
  const currentTokenAddress = tokenAddress.value

  clearAllWithChainToken(currentChainId, currentTokenAddress)
  clearAllContractData(currentChainId, currentTokenAddress)
  resetDeploy()
  readData.value = {}
  readError.value = null
  poolData.value = {}
  posts.value = []
  showTransfer.value = false
  setTxHistoryScope('account')
  loadTxHistories(null)
}

async function testClaimInitialReward() {
  if (await tokenContractRead.value.hasClaimedInitialReward(account.value)) {
    notifyTxError(t('modules.reward.message.already_claimed'))
    return
  }

  await doWrite(() => tokenContractWrite.value.claimInitialReward(), {
    txLabel: t('modules.reward.message.claim_initial_label'),
    txMeta: { key: 'modules.tx_history.label.claim_initial' },
    currentAccountFields: ['ctkBalance', 'hasClaimedInitial', 'pendingInitialReward', 'pendingTotalReward'],
    refreshPoolsAfter: true
  })
}

async function testRewardPost() {
  const lastPost = Number(await tokenContractRead.value.lastPostTime(account.value))
  const interval = Number(await tokenContractRead.value.POST_INTERVAL())
  if (Date.now() / 1000 - lastPost < interval) {
    notifyTxError(t('modules.post.message.cooldown'))
    return
  }

  writeLoading.value = true
  notifyTxPending(t('modules.post.message.submit'))

  try {
    const receipt = await tx.execute(() => tokenContractWrite.value.rewardPost())
    const hash = String(receipt.hash || '')
    const postId = Number(receipt.postId || (Number(await tokenContractRead.value.postIdCounter()) - 1))
    const txLabel = t('modules.post.message.tx_label', { post_id: postId })

    if (hash) {
      recordTxHistory(hash, txLabel, {
        key: 'modules.tx_history.label.post',
        params: { post_id: postId }
      })
    }

    await refreshAccountFields(account.value, ['ctkBalance', 'postCooldown', 'pendingPostReward', 'pendingTotalReward'], {
      fetchPostsAfter: false
    })
    await fetchPosts()
    await refreshPools()
    notifyTxSuccess(hash, txLabel)
  } catch (e) {
    const message = tx.errorMessage.value || e.message || t('common.message.transaction_failed')
    notifyTxError(message)
  } finally {
    writeLoading.value = false
  }
}

async function testRewardComment(author, postId) {
  await doWrite(() => tokenContractWrite.value.rewardComment(author, postId), {
    txLabel: t('modules.comment.message.tx_label', { post_id: postId }),
    txMeta: { key: 'modules.tx_history.label.comment', params: { post_id: postId } },
    currentAccountFields: ['ctkBalance', 'commentCooldown', 'pendingCommentReward', 'pendingTotalReward'],
    affectedAccounts: [{ address: author, fields: ['pendingCommentReward', 'pendingTotalReward'] }],
    refreshPoolsAfter: true
  })
}

async function testMintBronze() {
  const price = await nftContractRead.value.bronzePrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError(t('modules.nft.message.insufficient_ctk'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('modules.nft.mint.confirm', {
        tier: t('modules.nft.tier.bronze'),
        price: formatTokenAmount(price)
      }),
      t('modules.nft.mint.confirm_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'info'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.mintBronzeNFT(), {
    txLabel: t('modules.nft.message.mint_bronze_label'),
    txMeta: { key: 'modules.tx_history.label.mint_bronze' },
    currentAccountFields: ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'],
    refreshPoolsAfter: true
  })
}

async function testMintSilver() {
  const price = await nftContractRead.value.silverPrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError(t('modules.nft.message.insufficient_ctk'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('modules.nft.mint.confirm', {
        tier: t('modules.nft.tier.silver'),
        price: formatTokenAmount(price)
      }),
      t('modules.nft.mint.confirm_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'info'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.mintSilverNFT(), {
    txLabel: t('modules.nft.message.mint_silver_label'),
    txMeta: { key: 'modules.tx_history.label.mint_silver' },
    currentAccountFields: ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'],
    refreshPoolsAfter: true
  })
}

async function testMintGold() {
  const price = await nftContractRead.value.goldPrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError(t('modules.nft.message.insufficient_ctk'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('modules.nft.mint.confirm', {
        tier: t('modules.nft.tier.gold'),
        price: formatTokenAmount(price)
      }),
      t('modules.nft.mint.confirm_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'info'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.mintGoldNFT(), {
    txLabel: t('modules.nft.message.mint_gold_label'),
    txMeta: { key: 'modules.tx_history.label.mint_gold' },
    currentAccountFields: ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'],
    refreshPoolsAfter: true
  })
}

async function testBurnNFT(tokenId) {
  try {
    if ((await nftContractRead.value.ownerOf(tokenId)).toLowerCase() !== account.value.toLowerCase()) {
      notifyTxError(t('modules.nft.message.not_owner'))
      return
    }
  } catch {
    notifyTxError(t('modules.nft.message.token_not_found'))
    return
  }

  const rank = Number(await nftContractRead.value.nftRank(tokenId))
  const price = rank === 0
    ? await nftContractRead.value.bronzePrice()
    : rank === 1
      ? await nftContractRead.value.silverPrice()
      : await nftContractRead.value.goldPrice()
  const refund = (price * 80n) / 100n

  try {
    await ElMessageBox.confirm(
      t('modules.nft.burn.confirm', { token_id: tokenId, amount: formatTokenAmount(refund) }),
      t('modules.nft.burn.confirm_title'),
      {
        confirmButtonText: t('modules.nft.burn.confirm_button'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.burnNFTForRefund(tokenId), {
    txLabel: t('modules.nft.message.burn_label', { token_id: tokenId }),
    txMeta: { key: 'modules.tx_history.label.burn', params: { token_id: tokenId } },
    currentAccountFields: ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'],
    refreshPoolsAfter: true
  })
}

async function testCTKTransfer(to, amount) {
  if (!to.value || !amount.value) {
    notifyTxError(t('modules.reward.message.fill_address_amount'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('modules.reward.message.confirm_transfer', {
        address: shortenAddress(to.value),
        amount: amount.value
      }),
      t('modules.reward.message.confirm_transfer_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => tokenContractWrite.value.transfer(to.value, ethers.parseUnits(amount.value, DECIMALS)), {
    txLabel: t('modules.reward.message.ctk_transfer_label'),
    txMeta: { key: 'modules.tx_history.label.ctk_transfer' },
    currentAccountFields: ['ctkBalance'],
    affectedAccounts: [{ address: to.value, fields: ['ctkBalance'] }]
  })
}

async function testNFTTransfer(to, tokenId) {
  if (!to.value) {
    notifyTxError(t('modules.nft.message.receiver_required'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('modules.nft.transfer.confirm', {
        token_id: tokenId.value,
        address: shortenAddress(to.value)
      }),
      t('modules.nft.transfer.confirm_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.transferFrom(account.value, to.value, tokenId.value), {
    txLabel: t('modules.nft.message.transfer_label', { token_id: tokenId.value }),
    txMeta: { key: 'modules.tx_history.label.transfer_medal', params: { token_id: tokenId.value } },
    currentAccountFields: ['nftCount', 'nftBoost', 'myNFTs'],
    affectedAccounts: [{ address: to.value, fields: ['nftCount', 'nftBoost', 'myNFTs'] }]
  })
}

async function testWithdrawPostRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).post) === 0) {
    notifyTxError(t('modules.reward.message.no_post_reward'))
    return
  }

  await doWrite(() => tokenContractWrite.value.withdrawPostRewards(), {
    txLabel: t('modules.reward.message.withdraw_post_label'),
    txMeta: { key: 'modules.tx_history.label.withdraw_post' },
    currentAccountFields: ['ctkBalance', 'pendingPostReward', 'pendingTotalReward']
  })
}

async function testWithdrawCommentRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).comment) === 0) {
    notifyTxError(t('modules.reward.message.no_comment_reward'))
    return
  }

  await doWrite(() => tokenContractWrite.value.withdrawCommentRewards(), {
    txLabel: t('modules.reward.message.withdraw_comment_label'),
    txMeta: { key: 'modules.tx_history.label.withdraw_comment' },
    currentAccountFields: ['ctkBalance', 'pendingCommentReward', 'pendingTotalReward']
  })
}

async function testWithdrawInitialReward() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).initial) === 0) {
    notifyTxError(t('modules.reward.message.no_initial_reward'))
    return
  }

  await doWrite(() => tokenContractWrite.value.withdrawInitialReward(), {
    txLabel: t('modules.reward.message.withdraw_initial_label'),
    txMeta: { key: 'modules.tx_history.label.withdraw_initial' },
    currentAccountFields: ['ctkBalance', 'pendingInitialReward', 'pendingTotalReward']
  })
}

async function testWithdrawAllRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).total) === 0) {
    notifyTxError(t('modules.reward.message.no_reward'))
    return
  }

  await doWrite(() => tokenContractWrite.value.withdrawAllRewards(), {
    txLabel: t('modules.reward.message.withdraw_all_label'),
    txMeta: { key: 'modules.tx_history.label.withdraw_all' },
    currentAccountFields: ['ctkBalance', 'pendingPostReward', 'pendingCommentReward', 'pendingInitialReward', 'pendingTotalReward']
  })
}

async function testSendCreatorReward(to, amount) {
  if (!to.value || !amount.value) {
    notifyTxError(t('modules.admin.message.fill_address_amount'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('modules.admin.message.confirm_send_creator', {
        address: shortenAddress(to.value),
        amount: amount.value
      }),
      t('modules.admin.message.confirm_send_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => tokenContractWrite.value.sendCreatorReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), {
    txLabel: t('modules.admin.message.creator_reward_label'),
    txMeta: { key: 'modules.tx_history.label.creator_reward' },
    refreshCurrentAccount: false,
    affectedAccounts: [{ address: to.value, fields: ['ctkBalance'] }],
    refreshPoolsAfter: true
  })
}

async function testSendInteractReward(to, amount) {
  if (!to.value || !amount.value) {
    notifyTxError(t('modules.admin.message.fill_address_amount'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('modules.admin.message.confirm_send_interact', {
        address: shortenAddress(to.value),
        amount: amount.value
      }),
      t('modules.admin.message.confirm_send_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => tokenContractWrite.value.sendInteractReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), {
    txLabel: t('modules.admin.message.interact_reward_label'),
    txMeta: { key: 'modules.tx_history.label.interact_reward' },
    refreshCurrentAccount: false,
    affectedAccounts: [{ address: to.value, fields: ['ctkBalance'] }],
    refreshPoolsAfter: true
  })
}

async function testResetNFTPrice() {
  try {
    await ElMessageBox.confirm(
      t('modules.admin.message.confirm_reset_price'),
      t('modules.admin.message.confirm_reset_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.resetNFTPrice(), {
    txLabel: t('modules.admin.message.reset_price_label'),
    txMeta: { key: 'modules.tx_history.label.reset_price' },
    currentAccountFields: ['bronzePrice', 'silverPrice', 'goldPrice'],
    affectedAccounts: getCachedAccountFieldTargets(['bronzePrice', 'silverPrice', 'goldPrice']),
    refreshPoolsAfter: true
  })
}

async function testRandomAdjustPrice() {
  try {
    await ElMessageBox.confirm(
      t('modules.admin.message.confirm_adjust_price'),
      t('modules.admin.message.confirm_adjust_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.randomlyAdjustNFTPrice(), {
    txLabel: t('modules.admin.message.adjust_price_label'),
    txMeta: { key: 'modules.tx_history.label.adjust_price' },
    currentAccountFields: ['bronzePrice', 'silverPrice', 'goldPrice'],
    affectedAccounts: getCachedAccountFieldTargets(['bronzePrice', 'silverPrice', 'goldPrice']),
    refreshPoolsAfter: true
  })
}

async function testNFTWithdrawCTK(amount) {
  if (!amount || amount <= 0) {
    notifyTxError(t('modules.admin.message.invalid_withdraw_amount'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('modules.admin.message.confirm_withdraw', { amount }),
      t('modules.admin.message.confirm_withdraw_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.withdrawCTK(ethers.parseUnits(String(amount), DECIMALS)), {
    txLabel: t('modules.admin.message.withdraw_label', { amount }),
    txMeta: { key: 'modules.tx_history.label.withdraw', params: { amount } },
    refreshCurrentAccount: false,
    refreshPoolsAfter: true
  })
}

async function testNFTWithdrawAllCTK() {
  try {
    await ElMessageBox.confirm(
      t('modules.admin.message.confirm_withdraw_all'),
      t('modules.admin.message.confirm_withdraw_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.withdrawAllCTK(), {
    txLabel: t('modules.admin.message.withdraw_all_label'),
    txMeta: { key: 'modules.tx_history.label.withdraw_all_ctk' },
    refreshCurrentAccount: false,
    refreshPoolsAfter: true
  })
}

async function testNFTWithdrawOverflow() {
  try {
    await ElMessageBox.confirm(
      t('modules.admin.message.confirm_withdraw_overflow'),
      t('modules.admin.message.confirm_withdraw_title'),
      {
        confirmButtonText: t('common.button.confirm'),
        cancelButtonText: t('common.button.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  await doWrite(() => nftContractWrite.value.withdrawOverflow(), {
    txLabel: t('modules.admin.message.withdraw_overflow_label'),
    txMeta: { key: 'modules.tx_history.label.withdraw_overflow' },
    refreshCurrentAccount: false,
    refreshPoolsAfter: true
  })
}

watch(canInteract, async (value) => {
  if (!value) {
    isDataLoaded.value = false
    loadTxHistories(null)
    return
  }

  dataLoadingProgress.value = t('modules.chain_data.progress.loading_store')
  initStore()
  initTransferToggle()
  loadTxHistories(account.value)

  dataLoadingProgress.value = t('modules.chain_data.progress.loading_posts')
  const postCache = loadPosts()
  if (postCache?.data?.length) {
    posts.value = cloneValue(postCache.data)
  }

  dataLoadingProgress.value = t('modules.chain_data.progress.loading_user')
  if (!hydrateCurrentAccountFromCache(account.value)) {
    await refreshAccountData(account.value, {
      setLoading: true,
      showSummary: false,
      showErrors: true,
      fetchPostsAfter: false
    })
  }

  fetchPosts()

  dataLoadingProgress.value = t('modules.chain_data.progress.loading_pools')
  const poolCache = loadPools()
  if (poolCache?.data) {
    poolData.value = cloneValue(poolCache.data)
  }
  if (isOwner.value) {
    await refreshPools()
  }

  isDataLoaded.value = true
  dataLoadingProgress.value = ''
}, { immediate: true })

watch(account, (newAddr, oldAddr) => {
  if (!newAddr) {
    loadTxHistories(null)
    return
  }
  if (newAddr === oldAddr) return

  loadTxHistories(newAddr)
  readData.value = {}
  readError.value = null

  if (!hydrateCurrentAccountFromCache(newAddr)) {
    refreshAccountData(newAddr, {
      setLoading: false,
      showSummary: false,
      showErrors: true,
      fetchPostsAfter: false
    })
  }

  const poolCache = loadPools()
  if (poolCache?.data) {
    poolData.value = cloneValue(poolCache.data)
  }
})

watch(locale, () => {
  relocalizeCooldownLabels()
})

onMounted(async () => {
  await initAutoConnect()
})

provide('readData', readData)
provide('readError', readError)
provide('readLoading', readLoading)
provide('labelMap', labelMap)
provide('canInteract', canInteract)
provide('writeLoading', writeLoading)
provide('isConnected', isConnected)
provide('isOwner', isOwner)
provide('postLoading', postLoading)
provide('posts', posts)
provide('poolData', poolData)
provide('txHistoryList', txHistoryList)
provide('txHistoryScope', txHistoryScope)
provide('setTxHistoryScope', setTxHistoryScope)
provide('globalRefreshLoading', globalRefreshLoading)
provide('dataLoadingProgress', dataLoadingProgress)
provide('blockExplorer', NETWORK_CONFIG.blockExplorer)
provide('showTransfer', showTransfer)
provide('tokenContractRead', tokenContractRead)
provide('nftContractRead', nftContractRead)
provide('isDataLoaded', isDataLoaded)
provide('currentNetwork', currentNetwork)
provide('account', account)
provide('chainId', chainId)
provide('error', error)
provide('hasAddresses', hasAddresses)
provide('deployStatus', deployStatus)
provide('deployError', deployError)
provide('deployedTokenAddress', deployedTokenAddress)
provide('deployedNftAddress', deployedNftAddress)
provide('tokenAddress', tokenAddress)
provide('nftAddress', nftAddress)
provide('githubUrl', config.app.repositoryUrl)
provide('isInitializing', isInitializing)
provide('isCorrectNetwork', isCorrectNetwork)
provide('emit', (event, ...args) => {
  const handlers = {
    'refresh-data': refreshData,
    'claim-initial': testClaimInitialReward,
    'withdraw-post': testWithdrawPostRewards,
    'withdraw-comment': testWithdrawCommentRewards,
    'withdraw-initial': testWithdrawInitialReward,
    'withdraw-all': testWithdrawAllRewards,
    'ctk-transfer': testCTKTransfer,
    'reward-post': testRewardPost,
    'reward-comment': testRewardComment,
    'refresh-posts': fetchPosts,
    'mint-bronze': testMintBronze,
    'mint-silver': testMintSilver,
    'mint-gold': testMintGold,
    'burn-nft': testBurnNFT,
    'nft-transfer': testNFTTransfer,
    'send-creator': testSendCreatorReward,
    'send-interact': testSendInteractReward,
    'reset-price': testResetNFTPrice,
    'adjust-price': testRandomAdjustPrice,
    'withdraw-ctk': testNFTWithdrawCTK,
    'withdraw-all-ctk': testNFTWithdrawAllCTK,
    'withdraw-overflow': testNFTWithdrawOverflow,
    'refresh-pools': refreshPools,
    'connect': connect,
    'disconnect': disconnect,
    'switch-network': switchNetwork,
    'deploy': handleDeploy,
    'clear-addresses': handleClearAddresses,
    'toggle-transfer': toggleTransfer
  }

  if (handlers[event]) handlers[event](...args)
})
</script>

<template>
  <el-config-provider :locale="elementPlusLocale">
    <router-view />
  </el-config-provider>
</template>

<style>
.el-scrollbar__thumb {
  background-color: rgba(99, 102, 241, 0.25) !important;
}
.el-scrollbar__thumb:hover {
  background-color: rgba(99, 102, 241, 0.4) !important;
}

html.dark .el-scrollbar__thumb {
  background-color: rgba(129, 140, 248, 0.4) !important;
}

html.dark .el-scrollbar__thumb:hover {
  background-color: rgba(165, 180, 252, 0.6) !important;
}
</style>

<style>
.el-message .tx-link {
  color: var(--color-accent);
  text-decoration: none;
  margin-left: 6px;
  font-size: 12px;
  word-break: break-all;
}

.el-message .tx-link:hover {
  text-decoration: underline;
}

.el-scrollbar__thumb {
  background-color: rgba(99, 102, 241, 0.25) !important;
}

.el-scrollbar__thumb:hover {
  background-color: rgba(99, 102, 241, 0.4) !important;
}

/* 暗黑模式下的样式补充 */
html.dark .el-message .tx-link {
  color: var(--color-accent);
}
</style>
