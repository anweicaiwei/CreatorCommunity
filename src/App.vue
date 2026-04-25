<script setup>
import { ref, computed, watch, h, provide, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useWallet } from '@/composables/useWallet'
import { useTransaction } from '@/composables/useTransaction'
import { useContractAddress } from '@/composables/useContractAddress'
import { useDeploy } from '@/composables/useDeploy'
import { useDataStore } from '@/composables/useDataStore'
import { config } from '@/config'
import { formatTokenAmount, formatCooldown, getCooldownStatus, shortenAddress } from '@/utils/format'
import { DECIMALS } from '@/utils/constants'
import { NETWORK_CONFIG } from '@/contracts'
import { ethers } from 'ethers'
import { elementPlusLocale, t } from '@/locales'

const { locale } = useI18n()

const wallet = useWallet()
const {
  account, chainId, isConnected, isCorrectNetwork,
  isInitializing, error, currentNetwork, isOwner,
  tokenContractRead, nftContractRead,
  tokenContractWrite, nftContractWrite,
  contractsReady, connect, disconnect: walletDisconnect, switchNetwork, initAutoConnect
} = wallet

// 断开连接时清理所有状态（保留公共数据）
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
    // 清理个人数据 - 先保存账户地址用于清理缓存
    const currentAccount = account.value
    
    // 清理 reactive 状态
    readData.value = {}
    poolData.value = {}
    posts.value = []
    isDataLoaded.value = false
    showTransfer.value = false
    stopCooldownTimer()
    clearCooldownCache()
    
    // 清理 localStorage 中的用户缓存数据（在 walletDisconnect 之前，因为之后 account 会变）
    if (currentAccount) {
      clearUserData(currentAccount)
    }
    
    // 持久化清空后的 store 到 localStorage
    saveStore(Number(chainId.value), tokenAddress.value)
    
    walletDisconnect()
    ElMessage({ message: t('modules.wallet.message.disconnected'), type: 'info', duration: 2000 })
  }).catch(() => {
    // 取消操作
  })
}

const tx = useTransaction()
const { hasAddresses, tokenAddress, nftAddress, clearAddresses, clearAllContractData } = useContractAddress()
const { deployStatus, deployError, deployedTokenAddress, deployedNftAddress, deploy, resetDeploy } = useDeploy()

const {
  loadStore, saveStore,
  loadUserData, saveUserData, clearUserData,
  loadPools, savePoolsData,
  loadTxHistory, saveTxHistory, addTxToHistory, clearTxHistory,
  loadPosts, savePosts,
  loadSettings, saveSetting,
  clearAllWithChainToken
} = useDataStore()

const canInteract = computed(() =>
  isConnected.value && isCorrectNetwork.value && contractsReady.value && hasAddresses.value
)

// 数据加载状态 - 只有当所有必要数据加载完成后才显示其他模块
const isDataLoaded = ref(false)
const dataLoadingProgress = ref(t('common.status.pending') + '...')

// 初始化数据存储
function initStore() {
  loadStore(Number(chainId.value), tokenAddress.value)
}

// UI 设置
const showTransfer = ref(false)
function initTransferToggle() {
  const settings = loadSettings()
  showTransfer.value = settings.showTransfer === true
}
function toggleTransfer() {
  showTransfer.value = !showTransfer.value
  saveSetting('showTransfer', showTransfer.value)
  saveStore(Number(chainId.value), tokenAddress.value)
}

// 交易历史
const txList = computed(() => loadTxHistory())

async function handleDeploy() {
  if (!isConnected.value) { ElMessage.error(t('modules.deploy.message.connect_wallet_first')); return }
  if (!isCorrectNetwork.value) { ElMessage.error(t('modules.deploy.message.switch_correct_network')); return }
  ElMessage({ message: t('modules.deploy.message.deploying'), type: 'warning', duration: 0 })
  try {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const result = await deploy(signer)
    if (result) {
      ElMessage.closeAll()
      ElMessage({
        message: h('div', null, [
          h('span', null, t('modules.deploy.message.success_token')), h('code', null, result.tokenAddress),
          h('br'),
          h('span', null, 'NFT: '), h('code', null, result.nftAddress)
        ]),
        type: 'success',
        duration: 8000,
        showClose: true,
        offset: 40
      })
      await connect()
    }
  } catch (e) {
    ElMessage.closeAll()
    const msg = deployError.value || e.reason || e.message || t('modules.deploy.status.failed')
    ElMessage({ message: msg, type: 'error', duration: 8000 })
  }
}

async function handleClearAddresses() {
  await ElMessageBox.confirm(
    t('modules.deploy.message.clear_confirm'),
    t('modules.deploy.message.clear_title'),
    { confirmButtonText: t('modules.deploy.message.clear_confirm_button'), cancelButtonText: t('common.button.cancel'), type: 'warning' }
  )
  clearAllWithChainToken(Number(chainId.value), tokenAddress.value)
  resetDeploy()
  readData.value = {}
  poolData.value = {}
  posts.value = []
  showTransfer.value = false
}

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

// ==================== 冷却倒计时 ====================
const postCooldownEnd = ref(0) // 毫秒时间戳
const commentCooldownEnd = ref(0)
let cooldownTimer = null

// 冷却时间持久化（参考连接时间的 localStorage 模式）
function getCooldownKey(type) {
  const cid = chainId.value || localStorage.getItem('creatorcommunity_last_chain_id') || 'unknown'
  const addr = account.value || ''
  return `creatorcommunity_${cid}_${addr}_cooldown_${type}`
}

function saveCooldownEnd(type, ts) {
  if (ts > 0 && account.value) {
    localStorage.setItem(getCooldownKey(type), ts.toString())
  } else {
    localStorage.removeItem(getCooldownKey(type))
  }
}

function loadCooldownEnd(type) {
  const saved = localStorage.getItem(getCooldownKey(type))
  return saved ? parseInt(saved, 10) : 0
}

function clearCooldownCache() {
  localStorage.removeItem(getCooldownKey('post'))
  localStorage.removeItem(getCooldownKey('comment'))
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

function relocalizeCooldownLabels() {
  const now = Date.now()
  const nextData = { ...readData.value }
  if (postCooldownEnd.value > now) {
    nextData.postCooldown = formatCooldownText('post', postCooldownEnd.value - now)
  } else if (nextData.postCooldown === '可发帖' || nextData.postCooldown === 'Can post' || isCooldownWaitingText(nextData.postCooldown)) {
    nextData.postCooldown = formatCooldownText('post', 0)
  }

  if (commentCooldownEnd.value > now) {
    nextData.commentCooldown = formatCooldownText('comment', commentCooldownEnd.value - now)
  } else if (nextData.commentCooldown === '可评论' || nextData.commentCooldown === 'Can comment' || isCooldownWaitingText(nextData.commentCooldown)) {
    nextData.commentCooldown = formatCooldownText('comment', 0)
  }

  readData.value = nextData
}

// 从 localStorage 恢复冷却状态，若仍有剩余时间则启动倒计时
function restoreCooldownFromCache() {
  const postEnd = loadCooldownEnd('post')
  const commentEnd = loadCooldownEnd('comment')
  const now = Date.now()
  if (postEnd > now) {
    postCooldownEnd.value = postEnd
    readData.value = { ...readData.value, postCooldown: formatCooldownText('post', postEnd - now) }
  } else {
    postCooldownEnd.value = 0
    saveCooldownEnd('post', 0) // 已过期，清除缓存
    if (isCooldownWaitingText(readData.value.postCooldown)) {
      readData.value = { ...readData.value, postCooldown: formatCooldownText('post', 0) }
    }
  }
  if (commentEnd > now) {
    commentCooldownEnd.value = commentEnd
    readData.value = { ...readData.value, commentCooldown: formatCooldownText('comment', commentEnd - now) }
  } else {
    commentCooldownEnd.value = 0
    saveCooldownEnd('comment', 0) // 已过期，清除缓存
    if (isCooldownWaitingText(readData.value.commentCooldown)) {
      readData.value = { ...readData.value, commentCooldown: formatCooldownText('comment', 0) }
    }
  }
  if (postCooldownEnd.value > now || commentCooldownEnd.value > now) {
    startCooldownTimer()
  }
}

function startCooldownTimer() {
  stopCooldownTimer()
  cooldownTimer = setInterval(() => {
    const now = Date.now()
    if (postCooldownEnd.value > now) {
      const remaining = postCooldownEnd.value - now
      readData.value = { ...readData.value, postCooldown: formatCooldownText('post', remaining) }
    } else if (postCooldownEnd.value > 0) {
      postCooldownEnd.value = 0
      saveCooldownEnd('post', 0) // 倒计时归零，清除缓存
      readData.value = { ...readData.value, postCooldown: formatCooldownText('post', 0) }
    }
    if (commentCooldownEnd.value > now) {
      const remaining = commentCooldownEnd.value - now
      readData.value = { ...readData.value, commentCooldown: formatCooldownText('comment', remaining) }
    } else if (commentCooldownEnd.value > 0) {
      commentCooldownEnd.value = 0
      saveCooldownEnd('comment', 0) // 倒计时归零，清除缓存
      readData.value = { ...readData.value, commentCooldown: formatCooldownText('comment', 0) }
    }
    // 两个冷却都归零时停止定时器
    if (postCooldownEnd.value === 0 && commentCooldownEnd.value === 0) {
      stopCooldownTimer()
    }
  }, 1000)
}

function stopCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

function startPostCooldown(intervalMs) {
  postCooldownEnd.value = Date.now() + intervalMs
  saveCooldownEnd('post', postCooldownEnd.value)
  startCooldownTimer()
}

function startCommentCooldown(intervalMs) {
  commentCooldownEnd.value = Date.now() + intervalMs
  saveCooldownEnd('comment', commentCooldownEnd.value)
  startCooldownTimer()
}

// ==================== 帖子列表 ====================

async function fetchPosts() {
  if (!tokenContractRead.value) return
  postLoading.value = true
  try {
    const total = Number(await tokenContractRead.value.postIdCounter())
    if (total === 0) {
      posts.value = []
      return
    }
    const list = []
    for (let i = 0; i < total; i++) {
      const author = await tokenContractRead.value.postAuthor(i)
      list.push({
        postId: i,
        author: author,
        authorShort: shortenAddress(author)
      })
    }
    posts.value = list.reverse()
    savePosts(posts.value)
  } catch (e) {
    console.error('fetchPosts error:', e)
  } finally {
    postLoading.value = false
  }
}

// ==================== 用户数据刷新 ====================

async function refreshData() {
  readLoading.value = true
  readError.value = null
  if (!tokenContractRead.value || !nftContractRead.value) {
    readError.value = t('common.message.contract_not_initialized')
    readLoading.value = false
    return
  }
  try {
    const t = tokenContractRead.value
    const n = nftContractRead.value

    const balance = await t.balanceOf(account.value)
    const hasClaimed = await t.hasClaimedInitialReward(account.value)
    const lastPost = Number(await t.lastPostTime(account.value))
    const postInterval = Number(await t.POST_INTERVAL())
    const lastComment = Number(await t.lastCommentTime(account.value))
    const commentInterval = Number(await t.COMMENT_INTERVAL())
    const boost = Number(await t.calculateNFTBoost(account.value))
    const bronzePrice = await n.bronzePrice()
    const silverPrice = await n.silverPrice()
    const goldPrice = await n.goldPrice()
    const nftBalance = Number(await n.balanceOf(account.value))

    const postCD = getCooldownStatus(lastPost, postInterval * 1000)
    const commentCD = getCooldownStatus(lastComment, commentInterval * 1000)
    const pendingRewards = await t.getPendingRewards(account.value)

    // 设置冷却结束时间戳，用于实时倒计时
    postCooldownEnd.value = postCD.ready ? 0 : (lastPost * 1000 + postInterval * 1000)
    commentCooldownEnd.value = commentCD.ready ? 0 : (lastComment * 1000 + commentInterval * 1000)
    saveCooldownEnd('post', postCooldownEnd.value)
    saveCooldownEnd('comment', commentCooldownEnd.value)
    if (!postCD.ready || !commentCD.ready) startCooldownTimer()

    // NFT ID列表
    const nftIds = await n.getNFTsByOwner(account.value)
    const bronzeIds = [], silverIds = [], goldIds = []
    for (const id of nftIds) {
      const rank = Number(await n.nftRank(id))
      if (rank === 0) bronzeIds.push(Number(id))
      else if (rank === 1) silverIds.push(Number(id))
      else if (rank === 2) goldIds.push(Number(id))
    }

    const data = {
      ctkBalance: formatTokenAmount(balance),
      hasClaimedInitial: hasClaimed,
      postCooldown: postCD.ready ? t('modules.chain_data.cooldown.ready_post') : t('modules.chain_data.cooldown.waiting', { time: formatCooldown(postCD.remaining) }),
      commentCooldown: commentCD.ready ? t('modules.chain_data.cooldown.ready_comment') : t('modules.chain_data.cooldown.waiting', { time: formatCooldown(commentCD.remaining) }),
      nftBoost: boost,
      bronzePrice: formatTokenAmount(bronzePrice),
      silverPrice: formatTokenAmount(silverPrice),
      goldPrice: formatTokenAmount(goldPrice),
      nftCount: nftBalance,
      myBronze: bronzeIds.length,
      mySilver: silverIds.length,
      myGold: goldIds.length,
      // 每种勋章的增益值（青铜0.5%/个，白银2%/个，黄金12%/个）
      myBronzeBoost: (bronzeIds.length * 0.5).toFixed(1),
      mySilverBoost: (silverIds.length * 2).toFixed(1),
      myGoldBoost: (goldIds.length * 12).toFixed(1),
      // 理论总收益（未限制，可能超过50%）
      theoreticalBoost: (bronzeIds.length * 0.5 + silverIds.length * 2 + goldIds.length * 12).toFixed(1),
      myNFTs: { bronze: [...bronzeIds], silver: [...silverIds], gold: [...goldIds] },
      pendingPostReward: formatTokenAmount(pendingRewards.post),
      pendingCommentReward: formatTokenAmount(pendingRewards.comment),
      pendingInitialReward: formatTokenAmount(pendingRewards.initial),
      pendingTotalReward: formatTokenAmount(pendingRewards.total)
    }

    readData.value = data
    saveUserData(account.value, data)
    saveStore(Number(chainId.value), tokenAddress.value)

    const parts = [t('modules.chain_data.summary.medal_count', { ctk: readData.value.ctkBalance, count: nftBalance })]
    if (pendingRewards.total > 0n) parts.push(t('modules.chain_data.summary.pending', { amount: formatTokenAmount(pendingRewards.total) }))
    ElMessage({ message: parts.join(' '), type: 'success', duration: 3000 })
  } catch (e) {
    readError.value = e.message || String(e)
    ElMessage({ message: t('modules.chain_data.summary.query_failed', { message: readError.value }), type: 'error', duration: 5000 })
  } finally {
    readLoading.value = false
  }
  await fetchPosts()
}

// ==================== 池子数据刷新 ====================

async function refreshPools() {
  if (!tokenContractRead.value || !nftContractRead.value) return
  try {
    const t = tokenContractRead.value
    const n = nftContractRead.value
    const NFT_POOL_INITIAL = BigInt(2000000) * BigInt(10 ** 18)
    const [creatorTotal, creatorUsed, interactTotal, interactUsed, nftTotal, nftUsed, nftBalance, withdrawableAmount] = await Promise.all([
      t.CREATOR_POOL(),
      t.creatorPoolUsed(),
      t.INTERACT_POOL(),
      t.interactPoolUsed(),
      t.NFT_POOL(),
      t.nftPoolUsed(),
      t.balanceOf(n.target),
      n.getWithdrawableAmount()
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
    saveStore(Number(chainId.value), tokenAddress.value)
  } catch (e) {
    ElMessage({ message: `池子数据查询失败: ${e.message}`, type: 'error', duration: 5000 })
  }
}

// ==================== 字段级刷新 ====================

const fieldQueries = {
  ctkBalance: async (t, n, addr) => ({ ctkBalance: formatTokenAmount(await t.balanceOf(addr)) }),
  hasClaimedInitial: async (t, n, addr) => ({ hasClaimedInitial: await t.hasClaimedInitialReward(addr) }),
  postCooldown: async (token, n, addr) => {
    const lp = Number(await token.lastPostTime(addr)), iv = Number(await token.POST_INTERVAL())
    const cd = getCooldownStatus(lp, iv * 1000)
    postCooldownEnd.value = cd.ready ? 0 : (lp * 1000 + iv * 1000)
    saveCooldownEnd('post', postCooldownEnd.value)
    return { postCooldown: formatCooldownText('post', cd.remaining) }
  },
  commentCooldown: async (token, n, addr) => {
    const lc = Number(await token.lastCommentTime(addr)), iv = Number(await token.COMMENT_INTERVAL())
    const cd = getCooldownStatus(lc, iv * 1000)
    commentCooldownEnd.value = cd.ready ? 0 : (lc * 1000 + iv * 1000)
    saveCooldownEnd('comment', commentCooldownEnd.value)
    return { commentCooldown: formatCooldownText('comment', cd.remaining) }
  },
  nftBoost: async (t, n, addr) => ({ nftBoost: Number(await t.calculateNFTBoost(addr)) }),
  bronzePrice: async (t, n, addr) => ({ bronzePrice: formatTokenAmount(await n.bronzePrice()) }),
  silverPrice: async (t, n, addr) => ({ silverPrice: formatTokenAmount(await n.silverPrice()) }),
  goldPrice: async (t, n, addr) => ({ goldPrice: formatTokenAmount(await n.goldPrice()) }),
  nftCount: async (t, n, addr) => ({ nftCount: Number(await n.balanceOf(addr)) }),
  pendingPostReward: async (t, n, addr) => ({ pendingPostReward: formatTokenAmount((await t.getPendingRewards(addr)).post) }),
  pendingCommentReward: async (t, n, addr) => ({ pendingCommentReward: formatTokenAmount((await t.getPendingRewards(addr)).comment) }),
  pendingInitialReward: async (t, n, addr) => ({ pendingInitialReward: formatTokenAmount((await t.getPendingRewards(addr)).initial) }),
  pendingTotalReward: async (t, n, addr) => ({ pendingTotalReward: formatTokenAmount((await t.getPendingRewards(addr)).total) }),
  myNFTs: async (t, n, addr) => {
    const nftIds = await n.getNFTsByOwner(addr)
    const bronze = [], silver = [], gold = []
    for (const id of nftIds) {
      const rank = Number(await n.nftRank(id))
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
      myNFTs: { bronze: [...bronze], silver: [...silver], gold: [...gold] }
    }
  }
}

async function refreshFields(keys) {
  if (!tokenContractRead.value || !nftContractRead.value || !account.value) return
  const t = tokenContractRead.value, n = nftContractRead.value, addr = account.value
  const updates = {}
  for (const key of keys) {
    if (!fieldQueries[key]) continue
    try { Object.assign(updates, await fieldQueries[key](t, n, addr)) } catch {}
  }
  if (Object.keys(updates).length) {
    // 使用解构赋值确保触发 Vue 响应式更新
    readData.value = { ...readData.value, ...updates }
    saveUserData(addr, readData.value)
    saveStore(Number(chainId.value), tokenAddress.value)
  }
  await fetchPosts()
}

// ==================== 交易操作 ====================

const writeLoading = ref(false)

function notifyTxPending(label) {
  return ElMessage({ message: t('common.message.transaction_pending', { label }), type: 'warning', duration: 0 })
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

function notifyTxError(msg) {
  ElMessage.closeAll()
  ElMessage({ message: msg || t('common.message.unknown_error'), type: 'error', duration: 5000 })
}

async function doWrite(fn, refreshKeys = null, txLabel = '', onSuccess = null, txMeta = null) {
  writeLoading.value = true
  notifyTxPending(txLabel || t('common.message.transaction_pending', { label: t('common.message.transaction') }))
  try {
    const r = await tx.execute(fn)
    const hashStr = String(r.hash)
    if (txLabel && hashStr) {
      addTxToHistory({ hash: hashStr, label: txLabel, label_key: txMeta?.key, label_params: txMeta?.params, timestamp: Date.now() })
      saveTxHistory(loadTxHistory())
      saveStore(Number(chainId.value), tokenAddress.value)
    }
    if (refreshKeys) await refreshFields(refreshKeys)
    else await refreshData()
    notifyTxSuccess(hashStr, txLabel)
    if (onSuccess) onSuccess()
  } catch (e) {
    const errMsg = tx.errorMessage.value || e.message || t('common.message.transaction_failed')
    notifyTxError(errMsg)
  } finally {
    writeLoading.value = false
  }
}

// ==================== 业务函数 ====================

async function testClaimInitialReward() {
  if (await tokenContractRead.value.hasClaimedInitialReward(account.value)) { notifyTxError(t('modules.reward.message.already_claimed')); return }
  await doWrite(() => tokenContractWrite.value.claimInitialReward(), ['ctkBalance', 'hasClaimedInitial', 'pendingInitialReward', 'pendingTotalReward'], t('modules.reward.message.claim_initial_label'), null, { key: 'modules.tx_history.label.claim_initial' })
}

async function testRewardPost() {
  const lastPost = Number(await tokenContractRead.value.lastPostTime(account.value))
  const interval = Number(await tokenContractRead.value.POST_INTERVAL())
  if (Date.now() / 1000 - lastPost < interval) { notifyTxError(t('modules.post.message.cooldown')); return }
  writeLoading.value = true
  notifyTxPending(t('modules.post.message.submit'))
  try {
    const r = await tx.execute(() => tokenContractWrite.value.rewardPost())
    const hashStr = String(r.hash)
    // 从交易回执中解析 PostRewardRecorded 事件获取 postId
    const postId = Number(r.postId || (Number(await tokenContractRead.value.postIdCounter()) - 1))
    const txLabel = t('modules.post.message.tx_label', { post_id: postId })
    if (hashStr) {
      addTxToHistory({ hash: hashStr, label: txLabel, label_key: 'modules.tx_history.label.post', label_params: { post_id: postId }, timestamp: Date.now() })
      saveTxHistory(loadTxHistory())
      saveStore(Number(chainId.value), tokenAddress.value)
    }
    await refreshFields(['ctkBalance', 'postCooldown', 'pendingPostReward', 'pendingTotalReward'])
    notifyTxSuccess(hashStr, txLabel)
    if (postCooldownEnd.value > Date.now()) startCooldownTimer()
  } catch (e) {
    const errMsg = tx.errorMessage.value || e.message || t('common.message.transaction_failed')
    notifyTxError(errMsg)
  } finally {
    writeLoading.value = false
  }
}

async function testRewardComment(author, postId) {
  await doWrite(
    () => tokenContractWrite.value.rewardComment(author, postId),
    ['ctkBalance', 'commentCooldown', 'pendingCommentReward', 'pendingTotalReward'],
    t('modules.comment.message.tx_label', { post_id: postId }),
    () => { if (commentCooldownEnd.value > Date.now()) startCooldownTimer() }
    ,
    { key: 'modules.tx_history.label.comment', params: { post_id: postId } }
  )
}

async function testMintBronze() {
  const price = await nftContractRead.value.bronzePrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError(t('modules.nft.message.insufficient_ctk')); return
  }
  try {
    await ElMessageBox.confirm(t('modules.nft.mint.confirm', { tier: t('modules.nft.tier.bronze'), price: formatTokenAmount(price) }), t('modules.nft.mint.confirm_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'info'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.mintBronzeNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], t('modules.nft.message.mint_bronze_label'), null, { key: 'modules.tx_history.label.mint_bronze' })
  refreshPools()
}

async function testMintSilver() {
  const price = await nftContractRead.value.silverPrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError(t('modules.nft.message.insufficient_ctk')); return
  }
  try {
    await ElMessageBox.confirm(t('modules.nft.mint.confirm', { tier: t('modules.nft.tier.silver'), price: formatTokenAmount(price) }), t('modules.nft.mint.confirm_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'info'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.mintSilverNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], t('modules.nft.message.mint_silver_label'), null, { key: 'modules.tx_history.label.mint_silver' })
  refreshPools()
}

async function testMintGold() {
  const price = await nftContractRead.value.goldPrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError(t('modules.nft.message.insufficient_ctk')); return
  }
  try {
    await ElMessageBox.confirm(t('modules.nft.mint.confirm', { tier: t('modules.nft.tier.gold'), price: formatTokenAmount(price) }), t('modules.nft.mint.confirm_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'info'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.mintGoldNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], t('modules.nft.message.mint_gold_label'), null, { key: 'modules.tx_history.label.mint_gold' })
  refreshPools()
}

async function testBurnNFT(tokenId) {
  try {
    if ((await nftContractRead.value.ownerOf(tokenId)).toLowerCase() !== account.value.toLowerCase()) {
      notifyTxError(t('modules.nft.message.not_owner')); return
    }
  } catch { notifyTxError(t('modules.nft.message.token_not_found')); return }
  const rank = Number(await nftContractRead.value.nftRank(tokenId))
  const price = rank === 0 ? await nftContractRead.value.bronzePrice() : rank === 1 ? await nftContractRead.value.silverPrice() : await nftContractRead.value.goldPrice()
  const refund = (price * 80n) / 100n
  try {
    await ElMessageBox.confirm(
      t('modules.nft.burn.confirm', { token_id: tokenId, amount: formatTokenAmount(refund) }),
      t('modules.nft.burn.confirm_title'),
      { confirmButtonText: t('modules.nft.burn.confirm_button'), cancelButtonText: t('common.button.cancel'), type: 'warning' }
    )
  } catch { return }
  await doWrite(() => nftContractWrite.value.burnNFTForRefund(tokenId), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], t('modules.nft.message.burn_label', { token_id: tokenId }), null, { key: 'modules.tx_history.label.burn', params: { token_id: tokenId } })
  refreshPools()
}

async function testCTKTransfer(to, amount) {
  if (!to.value || !amount.value) { notifyTxError(t('modules.reward.message.fill_address_amount')); return }
  try {
    await ElMessageBox.confirm(t('modules.reward.message.confirm_transfer', { address: shortenAddress(to.value), amount: amount.value }), t('modules.reward.message.confirm_transfer_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  const amt = ethers.parseUnits(amount.value, DECIMALS)
  await doWrite(() => tokenContractWrite.value.transfer(to.value, amt), ['ctkBalance'], t('modules.reward.message.ctk_transfer_label'), null, { key: 'modules.tx_history.label.ctk_transfer' })
}

async function testNFTTransfer(to, tokenId) {
  if (!to.value) { notifyTxError(t('modules.nft.message.receiver_required')); return }
  try {
    await ElMessageBox.confirm(t('modules.nft.transfer.confirm', { token_id: tokenId.value, address: shortenAddress(to.value) }), t('modules.nft.transfer.confirm_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.transferFrom(account.value, to.value, tokenId.value), ['nftCount', 'nftBoost', 'myNFTs'], t('modules.nft.message.transfer_label', { token_id: tokenId.value }), null, { key: 'modules.tx_history.label.transfer_medal', params: { token_id: tokenId.value } })
  refreshPools()
}

async function testWithdrawPostRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).post) === 0) { notifyTxError(t('modules.reward.message.no_post_reward')); return }
  await doWrite(() => tokenContractWrite.value.withdrawPostRewards(), ['ctkBalance', 'pendingPostReward', 'pendingTotalReward'], t('modules.reward.message.withdraw_post_label'), null, { key: 'modules.tx_history.label.withdraw_post' })
}

async function testWithdrawCommentRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).comment) === 0) { notifyTxError(t('modules.reward.message.no_comment_reward')); return }
  await doWrite(() => tokenContractWrite.value.withdrawCommentRewards(), ['ctkBalance', 'pendingCommentReward', 'pendingTotalReward'], t('modules.reward.message.withdraw_comment_label'), null, { key: 'modules.tx_history.label.withdraw_comment' })
}

async function testWithdrawInitialReward() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).initial) === 0) { notifyTxError(t('modules.reward.message.no_initial_reward')); return }
  await doWrite(() => tokenContractWrite.value.withdrawInitialReward(), ['ctkBalance', 'pendingInitialReward', 'pendingTotalReward'], t('modules.reward.message.withdraw_initial_label'), null, { key: 'modules.tx_history.label.withdraw_initial' })
}

async function testWithdrawAllRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).total) === 0) { notifyTxError(t('modules.reward.message.no_reward')); return }
  await doWrite(() => tokenContractWrite.value.withdrawAllRewards(), ['ctkBalance', 'pendingPostReward', 'pendingCommentReward', 'pendingInitialReward', 'pendingTotalReward'], t('modules.reward.message.withdraw_all_label'), null, { key: 'modules.tx_history.label.withdraw_all' })
}

async function testSendCreatorReward(to, amount) {
  if (!to.value || !amount.value) { notifyTxError(t('modules.admin.message.fill_address_amount')); return }
  try {
    await ElMessageBox.confirm(t('modules.admin.message.confirm_send_creator', { address: shortenAddress(to.value), amount: amount.value }), t('modules.admin.message.confirm_send_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => tokenContractWrite.value.sendCreatorReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), null, t('modules.admin.message.creator_reward_label'), null, { key: 'modules.tx_history.label.creator_reward' })
  refreshPools()
}

async function testSendInteractReward(to, amount) {
  if (!to.value || !amount.value) { notifyTxError(t('modules.admin.message.fill_address_amount')); return }
  try {
    await ElMessageBox.confirm(t('modules.admin.message.confirm_send_interact', { address: shortenAddress(to.value), amount: amount.value }), t('modules.admin.message.confirm_send_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => tokenContractWrite.value.sendInteractReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), null, t('modules.admin.message.interact_reward_label'), null, { key: 'modules.tx_history.label.interact_reward' })
  refreshPools()
}

async function testResetNFTPrice() {
  try {
    await ElMessageBox.confirm(t('modules.admin.message.confirm_reset_price'), t('modules.admin.message.confirm_reset_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.resetNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], t('modules.admin.message.reset_price_label'), null, { key: 'modules.tx_history.label.reset_price' })
  refreshPools()
}

async function testRandomAdjustPrice() {
  try {
    await ElMessageBox.confirm(t('modules.admin.message.confirm_adjust_price'), t('modules.admin.message.confirm_adjust_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.randomlyAdjustNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], t('modules.admin.message.adjust_price_label'), null, { key: 'modules.tx_history.label.adjust_price' })
  refreshPools()
}

async function testNFTWithdrawCTK(amount) {
  if (!amount || amount <= 0) { notifyTxError(t('modules.admin.message.invalid_withdraw_amount')); return }
  try {
    await ElMessageBox.confirm(t('modules.admin.message.confirm_withdraw', { amount }), t('modules.admin.message.confirm_withdraw_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.withdrawCTK(ethers.parseUnits(String(amount), DECIMALS)), null, t('modules.admin.message.withdraw_label', { amount }), null, { key: 'modules.tx_history.label.withdraw', params: { amount } })
  refreshPools()
}

async function testNFTWithdrawAllCTK() {
  try {
    await ElMessageBox.confirm(t('modules.admin.message.confirm_withdraw_all'), t('modules.admin.message.confirm_withdraw_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.withdrawAllCTK(), null, t('modules.admin.message.withdraw_all_label'), null, { key: 'modules.tx_history.label.withdraw_all_ctk' })
  refreshPools()
}

async function testNFTWithdrawOverflow() {
  try {
    await ElMessageBox.confirm(t('modules.admin.message.confirm_withdraw_overflow'), t('modules.admin.message.confirm_withdraw_title'), {
      confirmButtonText: t('common.button.confirm'),
      cancelButtonText: t('common.button.cancel'),
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.withdrawOverflow(), null, t('modules.admin.message.withdraw_overflow_label'), null, { key: 'modules.tx_history.label.withdraw_overflow' })
  refreshPools()
}

// ==================== 生命周期 ====================

// 页面加载：优先读缓存，无缓存则全量刷新
watch(canInteract, async (val) => {
  if (val) {
    dataLoadingProgress.value = t('modules.chain_data.progress.loading_store')
    initStore()
    initTransferToggle()
    loadTxHistory()

    dataLoadingProgress.value = t('modules.chain_data.progress.loading_posts')
    // 帖子列表：先读缓存秒显示，再刷新
    const postCache = loadPosts()
    if (postCache?.data?.length) {
      posts.value = JSON.parse(JSON.stringify(postCache.data))
    }

    dataLoadingProgress.value = t('modules.chain_data.progress.loading_user')
    // 用户数据：先读缓存
    const userCache = loadUserData(account.value)
    if (userCache?.data) {
      readData.value = JSON.parse(JSON.stringify(userCache.data))
      restoreCooldownFromCache() // 从 localStorage 恢复冷却倒计时
    } else {
      await refreshData()
    }

    // 帖子列表独立加载，不阻塞主流程
    fetchPosts()

    dataLoadingProgress.value = t('modules.chain_data.progress.loading_pools')
    // 池子数据：先读缓存
    const poolCache = loadPools()
    if (poolCache?.data) {
      poolData.value = JSON.parse(JSON.stringify(poolCache.data))
    }
    if (isOwner.value) await refreshPools()
    
    // 所有数据加载完成
    isDataLoaded.value = true
    dataLoadingProgress.value = ''
  } else {
    isDataLoaded.value = false
  }
}, { immediate: true })

// 账户切换：重新加载
watch(account, (newAddr, oldAddr) => {
  if (newAddr && oldAddr && newAddr !== oldAddr) {
    readData.value = {}
    const userCache = loadUserData(newAddr)
    if (userCache?.data) {
      readData.value = JSON.parse(JSON.stringify(userCache.data))
      restoreCooldownFromCache() // 恢复新账户的冷却状态
    } else {
      refreshData()
    }
    const poolCache = loadPools()
    if (poolCache?.data) {
      poolData.value = JSON.parse(JSON.stringify(poolCache.data))
    }
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
provide('txList', txList)
provide('dataLoadingProgress', dataLoadingProgress)
provide('blockExplorer', NETWORK_CONFIG.blockExplorer)
provide('showTransfer', showTransfer)
provide('tokenContractRead', tokenContractRead)
provide('nftContractRead', nftContractRead)
provide('isDataLoaded', isDataLoaded)
provide('currentNetwork', wallet.currentNetwork)
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
    'clear-tx': () => { clearTxHistory(); saveStore(Number(chainId.value), tokenAddress.value) },
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
