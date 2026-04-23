<script setup>
import { ref, computed, watch, h, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled, Loading } from '@element-plus/icons-vue'
import { useWallet } from '@/composables/useWallet'
import { useTransaction } from '@/composables/useTransaction'
import { useContractAddress } from '@/composables/useContractAddress'
import { useDeploy } from '@/composables/useDeploy'
import { useDataStore } from '@/composables/useDataStore'
import { formatTokenAmount, formatCooldown, getCooldownStatus, shortenAddress } from '@/utils/format'
import { DECIMALS } from '@/utils/constants'
import { NETWORK_CONFIG } from '@/contracts'
import { ethers } from 'ethers'

import WalletSection from '@/components/WalletSection.vue'
import DeploySection from '@/components/DeploySection.vue'
import ChainDataSection from '@/components/ChainDataSection.vue'
import TxHistorySection from '@/components/TxHistorySection.vue'
import RewardSection from '@/components/RewardSection.vue'
import PostSection from '@/components/PostSection.vue'
import NFTSection from '@/components/NFTSection.vue'
import AdminSection from '@/components/AdminSection.vue'
import ManualView from '@/components/ManualView.vue'

const isManualPage = ref(window.location.hash === '#/manual')

function onHashChange() {
  isManualPage.value = window.location.hash === '#/manual'
}

onMounted(async () => {
  window.addEventListener('hashchange', onHashChange)
  // 尝试自动恢复钱包连接
  await initAutoConnect()
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange)
  stopCooldownTimer()
})

function navigateToManual() {
  window.location.hash = '#/manual'
}

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
      h('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, '确认断开钱包连接？'),
      h('p', { style: 'margin-bottom: 4px; color: #e6a23c;' }, '以下缓存数据将被清除：'),
      h('ul', { style: 'margin: 0 0 12px 20px; padding-left: 0; color: #909399; font-size: 13px;' }, [
        h('li', null, '账户余额、持仓信息'),
        h('li', null, '勋章持有数量和增益数据'),
        h('li', null, '发帖/评论冷却状态'),
        h('li', null, '待提现奖励数据'),
        h('li', null, '自定义设置（显示偏好等）')
      ]),
      h('p', { style: 'margin-bottom: 0; color: #67c23a;' }, '以下缓存数据将保留：'),
      h('ul', { style: 'margin: 0; color: #909399; font-size: 13px;' }, [
        h('li', null, '交易历史记录'),
        h('li', null, '已发布的帖子数据'),
        h('li', null, '池子配置（管理员）')
      ])
    ]),
    '断开钱包连接',
    {
      confirmButtonText: '确认断开',
      cancelButtonText: '取消',
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
    ElMessage({ message: '已断开钱包连接', type: 'info', duration: 2000 })
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
const dataLoadingProgress = ref('准备中...')

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
  if (!isConnected.value) { ElMessage.error('请先连接钱包'); return }
  if (!isCorrectNetwork.value) { ElMessage.error('请切换到正确的网络'); return }
  ElMessage({ message: '正在部署 CreatorToken + CreatorNFT 合约...', type: 'warning', duration: 0 })
  try {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const result = await deploy(signer)
    if (result) {
      ElMessage.closeAll()
      ElMessage({
        message: h('div', null, [
          h('span', null, '部署成功! Token: '), h('code', null, result.tokenAddress),
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
    const msg = deployError.value || e.reason || e.message || '部署失败'
    ElMessage({ message: msg, type: 'error', duration: 8000 })
  }
}

async function handleClearAddresses() {
  await ElMessageBox.confirm(
    '确认停用合约？这将清除所有已部署的合约地址和相关数据。',
    '确认停用',
    { confirmButtonText: '确认停用', cancelButtonText: '取消', type: 'warning' }
  )
  clearAllWithChainToken(Number(chainId.value), tokenAddress.value)
  resetDeploy()
  readData.value = {}
  poolData.value = {}
  posts.value = []
  showTransfer.value = false
}

const labelMap = {
  ctkBalance: 'CTK余额',
  hasClaimedInitial: '已领初始奖励',
  postCooldown: '发帖冷却',
  commentCooldown: '评论冷却',
  nftBoost: '勋章总增益(%)',
  bronzePrice: '青铜勋章价格',
  silverPrice: '白银勋章价格',
  goldPrice: '黄金勋章价格',
  nftCount: '总持有勋章数量',
  myBronze: '持有青铜勋章数量',
  mySilver: '持有白银勋章数量',
  myGold: '持有黄金勋章数量',
  pendingPostReward: '待提现的发帖奖励',
  pendingCommentReward: '待提现的评论奖励',
  pendingInitialReward: '待提现的初始奖励',
  pendingTotalReward: '合计待提现奖励'
}

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

// 从 localStorage 恢复冷却状态，若仍有剩余时间则启动倒计时
function restoreCooldownFromCache() {
  const postEnd = loadCooldownEnd('post')
  const commentEnd = loadCooldownEnd('comment')
  const now = Date.now()
  if (postEnd > now) {
    postCooldownEnd.value = postEnd
    readData.value = { ...readData.value, postCooldown: `等待 ${formatCooldown(postEnd - now)}` }
  } else {
    postCooldownEnd.value = 0
    saveCooldownEnd('post', 0) // 已过期，清除缓存
    if (readData.value.postCooldown?.startsWith('等待')) {
      readData.value = { ...readData.value, postCooldown: '可发帖' }
    }
  }
  if (commentEnd > now) {
    commentCooldownEnd.value = commentEnd
    readData.value = { ...readData.value, commentCooldown: `等待 ${formatCooldown(commentEnd - now)}` }
  } else {
    commentCooldownEnd.value = 0
    saveCooldownEnd('comment', 0) // 已过期，清除缓存
    if (readData.value.commentCooldown?.startsWith('等待')) {
      readData.value = { ...readData.value, commentCooldown: '可评论' }
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
      readData.value = { ...readData.value, postCooldown: `等待 ${formatCooldown(remaining)}` }
    } else if (postCooldownEnd.value > 0) {
      postCooldownEnd.value = 0
      saveCooldownEnd('post', 0) // 倒计时归零，清除缓存
      readData.value = { ...readData.value, postCooldown: '可发帖' }
    }
    if (commentCooldownEnd.value > now) {
      const remaining = commentCooldownEnd.value - now
      readData.value = { ...readData.value, commentCooldown: `等待 ${formatCooldown(remaining)}` }
    } else if (commentCooldownEnd.value > 0) {
      commentCooldownEnd.value = 0
      saveCooldownEnd('comment', 0) // 倒计时归零，清除缓存
      readData.value = { ...readData.value, commentCooldown: '可评论' }
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
    readError.value = '合约实例未初始化'
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
      postCooldown: postCD.ready ? '可发帖' : `等待 ${formatCooldown(postCD.remaining)}`,
      commentCooldown: commentCD.ready ? '可评论' : `等待 ${formatCooldown(commentCD.remaining)}`,
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

    const parts = [`CTK: ${readData.value.ctkBalance} | 勋章: ${nftBalance} 枚`]
    if (pendingRewards.total > 0n) parts.push(`| 待提现: ${formatTokenAmount(pendingRewards.total)} CTK`)
    ElMessage({ message: parts.join(' '), type: 'success', duration: 3000 })
  } catch (e) {
    readError.value = e.message || String(e)
    ElMessage({ message: `数据查询失败: ${readError.value}`, type: 'error', duration: 5000 })
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
  postCooldown: async (t, n, addr) => {
    const lp = Number(await t.lastPostTime(addr)), iv = Number(await t.POST_INTERVAL())
    const cd = getCooldownStatus(lp, iv * 1000)
    postCooldownEnd.value = cd.ready ? 0 : (lp * 1000 + iv * 1000)
    saveCooldownEnd('post', postCooldownEnd.value)
    return { postCooldown: cd.ready ? '可发帖' : `等待 ${formatCooldown(cd.remaining)}` }
  },
  commentCooldown: async (t, n, addr) => {
    const lc = Number(await t.lastCommentTime(addr)), iv = Number(await t.COMMENT_INTERVAL())
    const cd = getCooldownStatus(lc, iv * 1000)
    commentCooldownEnd.value = cd.ready ? 0 : (lc * 1000 + iv * 1000)
    saveCooldownEnd('comment', commentCooldownEnd.value)
    return { commentCooldown: cd.ready ? '可评论' : `等待 ${formatCooldown(cd.remaining)}` }
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
  return ElMessage({ message: `${label} 处理中...`, type: 'warning', duration: 0 })
}

function notifyTxSuccess(hash, label) {
  ElMessage.closeAll()
  const txUrl = NETWORK_CONFIG.blockExplorer ? `${NETWORK_CONFIG.blockExplorer}/tx/${hash}` : '#'
  ElMessage({
    message: h('div', null, [
      h('span', null, `${label || '交易'} 成功! `),
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
  ElMessage({ message: msg || '未知错误', type: 'error', duration: 5000 })
}

async function doWrite(fn, refreshKeys = null, txLabel = '', onSuccess = null) {
  writeLoading.value = true
  notifyTxPending(txLabel || '交易提交中...')
  try {
    const r = await tx.execute(fn)
    const hashStr = String(r.hash)
    if (txLabel && hashStr) {
      addTxToHistory({ hash: hashStr, label: txLabel, timestamp: Date.now() })
      saveTxHistory(loadTxHistory())
      saveStore(Number(chainId.value), tokenAddress.value)
    }
    if (refreshKeys) await refreshFields(refreshKeys)
    else await refreshData()
    notifyTxSuccess(hashStr, txLabel)
    if (onSuccess) onSuccess()
  } catch (e) {
    const errMsg = tx.errorMessage.value || e.message || '交易失败'
    notifyTxError(errMsg)
  } finally {
    writeLoading.value = false
  }
}

// ==================== 业务函数 ====================

async function testClaimInitialReward() {
  if (await tokenContractRead.value.hasClaimedInitialReward(account.value)) { notifyTxError('已领取初始奖励'); return }
  await doWrite(() => tokenContractWrite.value.claimInitialReward(), ['ctkBalance', 'hasClaimedInitial', 'pendingInitialReward', 'pendingTotalReward'], '领取初始奖励')
}

async function testRewardPost() {
  const lastPost = Number(await tokenContractRead.value.lastPostTime(account.value))
  const interval = Number(await tokenContractRead.value.POST_INTERVAL())
  if (Date.now() / 1000 - lastPost < interval) { notifyTxError('发帖冷却中，请稍后'); return }
  writeLoading.value = true
  notifyTxPending('发帖提交中...')
  try {
    const r = await tx.execute(() => tokenContractWrite.value.rewardPost())
    const hashStr = String(r.hash)
    // 从交易回执中解析 PostRewardRecorded 事件获取 postId
    const postId = Number(r.postId || (Number(await tokenContractRead.value.postIdCounter()) - 1))
    const txLabel = `发帖 POST_ID ${postId}`
    if (hashStr) {
      addTxToHistory({ hash: hashStr, label: txLabel, timestamp: Date.now() })
      saveTxHistory(loadTxHistory())
      saveStore(Number(chainId.value), tokenAddress.value)
    }
    await refreshFields(['ctkBalance', 'postCooldown', 'pendingPostReward', 'pendingTotalReward'])
    notifyTxSuccess(hashStr, txLabel)
    if (postCooldownEnd.value > Date.now()) startCooldownTimer()
  } catch (e) {
    const errMsg = tx.errorMessage.value || e.message || '交易失败'
    notifyTxError(errMsg)
  } finally {
    writeLoading.value = false
  }
}

async function testRewardComment(author, postId) {
  await doWrite(
    () => tokenContractWrite.value.rewardComment(author, postId),
    ['ctkBalance', 'commentCooldown', 'pendingCommentReward', 'pendingTotalReward'],
    `评论帖子 POST_ID ${postId}`,
    () => { if (commentCooldownEnd.value > Date.now()) startCooldownTimer() }
  )
}

async function testMintBronze() {
  const price = await nftContractRead.value.bronzePrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError('CTK余额不足'); return
  }
  try {
    await ElMessageBox.confirm(`确认铸造青铜勋章？\n需消耗 ${formatTokenAmount(price)} CTK`, '确认铸造', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.mintBronzeNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], '铸造青铜勋章')
  refreshPools()
}

async function testMintSilver() {
  const price = await nftContractRead.value.silverPrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError('CTK余额不足'); return
  }
  try {
    await ElMessageBox.confirm(`确认铸造白银勋章？\n需消耗 ${formatTokenAmount(price)} CTK`, '确认铸造', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.mintSilverNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], '铸造白银勋章')
  refreshPools()
}

async function testMintGold() {
  const price = await nftContractRead.value.goldPrice()
  if (await tokenContractRead.value.balanceOf(account.value) < price) {
    notifyTxError('CTK余额不足'); return
  }
  try {
    await ElMessageBox.confirm(`确认铸造黄金勋章？\n需消耗 ${formatTokenAmount(price)} CTK`, '确认铸造', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'info'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.mintGoldNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], '铸造黄金勋章')
  refreshPools()
}

async function testBurnNFT(tokenId) {
  try {
    if ((await nftContractRead.value.ownerOf(tokenId)).toLowerCase() !== account.value.toLowerCase()) {
      notifyTxError('您不是该勋章的所有者'); return
    }
  } catch { notifyTxError('该tokenId不存在'); return }
  const rank = Number(await nftContractRead.value.nftRank(tokenId))
  const price = rank === 0 ? await nftContractRead.value.bronzePrice() : rank === 1 ? await nftContractRead.value.silverPrice() : await nftContractRead.value.goldPrice()
  const refund = (price * 80n) / 100n
  try {
    await ElMessageBox.confirm(
      `确认销毁 NFT TOKEN_ID ${tokenId}？\n销毁后返还 ${formatTokenAmount(refund)} CTK（价值的80%）`,
      '确认销毁',
      { confirmButtonText: '确认销毁', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }
  await doWrite(() => nftContractWrite.value.burnNFTForRefund(tokenId), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], `销毁勋章 TOKEN_ID ${tokenId}`)
  refreshPools()
}

async function testCTKTransfer(to, amount) {
  if (!to.value || !amount.value) { notifyTxError('请填写地址和金额'); return }
  try {
    await ElMessageBox.confirm(`确认向 ${shortenAddress(to.value)} 转账 ${amount.value} CTK？`, '确认转账', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  const amt = ethers.parseUnits(amount.value, DECIMALS)
  await doWrite(() => tokenContractWrite.value.transfer(to.value, amt), ['ctkBalance'], 'CTK转账')
}

async function testNFTTransfer(to, tokenId) {
  if (!to.value) { notifyTxError('请填写接收地址'); return }
  try {
    await ElMessageBox.confirm(`确认将 NFT TOKEN_ID ${tokenId.value} 转移至 ${shortenAddress(to.value)}？`, '确认转移', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.transferFrom(account.value, to.value, tokenId.value), ['nftCount', 'nftBoost', 'myNFTs'], `转移勋章 TOKEN_ID ${tokenId.value}`)
  refreshPools()
}

async function testWithdrawPostRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).post) === 0) { notifyTxError('无待提现帖子奖励'); return }
  await doWrite(() => tokenContractWrite.value.withdrawPostRewards(), ['ctkBalance', 'pendingPostReward', 'pendingTotalReward'], '提现帖奖')
}

async function testWithdrawCommentRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).comment) === 0) { notifyTxError('无待提现评论奖励'); return }
  await doWrite(() => tokenContractWrite.value.withdrawCommentRewards(), ['ctkBalance', 'pendingCommentReward', 'pendingTotalReward'], '提现评奖')
}

async function testWithdrawInitialReward() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).initial) === 0) { notifyTxError('无待提现初始奖励'); return }
  await doWrite(() => tokenContractWrite.value.withdrawInitialReward(), ['ctkBalance', 'pendingInitialReward', 'pendingTotalReward'], '提现初始奖')
}

async function testWithdrawAllRewards() {
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).total) === 0) { notifyTxError('无待提现奖励'); return }
  await doWrite(() => tokenContractWrite.value.withdrawAllRewards(), ['ctkBalance', 'pendingPostReward', 'pendingCommentReward', 'pendingInitialReward', 'pendingTotalReward'], '全部提现')
}

async function testSendCreatorReward(to, amount) {
  if (!to.value || !amount.value) { notifyTxError('请填写地址和金额'); return }
  try {
    await ElMessageBox.confirm(`确认向 ${shortenAddress(to.value)} 发放 ${amount.value} CTK（创作者池）？`, '确认发放', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => tokenContractWrite.value.sendCreatorReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), null, '创作者池发放')
  refreshPools()
}

async function testSendInteractReward(to, amount) {
  if (!to.value || !amount.value) { notifyTxError('请填写地址和金额'); return }
  try {
    await ElMessageBox.confirm(`确认向 ${shortenAddress(to.value)} 发放 ${amount.value} CTK（互动池）？`, '确认发放', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => tokenContractWrite.value.sendInteractReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), null, '互动池发放')
  refreshPools()
}

async function testResetNFTPrice() {
  try {
    await ElMessageBox.confirm('确认重置所有勋章价格为初始值？', '确认重置', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.resetNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], '重置勋章价格')
  refreshPools()
}

async function testRandomAdjustPrice() {
  try {
    await ElMessageBox.confirm('确认随机调整勋章价格（±10%）？', '确认调价', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.randomlyAdjustNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], '随机调价')
  refreshPools()
}

async function testNFTWithdrawCTK(amount) {
  if (!amount || amount <= 0) { notifyTxError('请输入有效的提取金额'); return }
  try {
    await ElMessageBox.confirm(`确认从NFT合约提取 ${amount} CTK？\n提取的代币将按7:3分配给创作者池和互动池`, '确认提取', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.withdrawCTK(ethers.parseUnits(String(amount), DECIMALS)), null, `提取 ${amount} CTK`)
  refreshPools()
}

async function testNFTWithdrawAllCTK() {
  try {
    await ElMessageBox.confirm('确认提取全部可提取额度？\n提取的代币将按7:3分配给创作者池和互动池', '确认提取', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.withdrawAllCTK(), null, '提取全部可提取CTK')
  refreshPools()
}

async function testNFTWithdrawOverflow() {
  try {
    await ElMessageBox.confirm('确认提取溢出代币？\n提取的代币将按7:3分配给创作者池和互动池', '确认提取', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.withdrawOverflow(), null, '提取溢出CTK')
  refreshPools()
}

// ==================== 生命周期 ====================

// 页面加载：优先读缓存，无缓存则全量刷新
watch(canInteract, async (val) => {
  if (val) {
    dataLoadingProgress.value = '加载存储数据...'
    initStore()
    initTransferToggle()
    loadTxHistory()

    dataLoadingProgress.value = '加载帖子列表...'
    // 帖子列表：先读缓存秒显示，再刷新
    const postCache = loadPosts()
    if (postCache?.data?.length) {
      posts.value = JSON.parse(JSON.stringify(postCache.data))
    }

    dataLoadingProgress.value = '加载用户数据...'
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

    dataLoadingProgress.value = '加载池子数据...'
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
</script>

<template>
  <ManualView v-if="isManualPage" />

  <div v-else class="app-page">
    <div class="app-header">
      <h1 class="app-title">CreatorCommunity 合约交互</h1>
      <a class="manual-link" @click.prevent="navigateToManual" href="#/manual">
        <el-icon><QuestionFilled /></el-icon>
        <span>用户手册</span>
      </a>
    </div>

    <div class="layout-grid">
      <div class="left-col">
        <WalletSection
          :is-connected="isConnected" :is-initializing="isInitializing"
          :is-correct-network="isCorrectNetwork" :is-owner="isOwner"
           :current-network="currentNetwork" :account="account" :chain-id="chainId" :error="error"
          :has-addresses="hasAddresses" :deploy-status="deployStatus"
          :deploy-error="deployError" :deployed-token-address="deployedTokenAddress"
          :deployed-nft-address="deployedNftAddress"
          :token-address="tokenAddress" :nft-address="nftAddress"
          :block-explorer="NETWORK_CONFIG.blockExplorer"
          :show-transfer="showTransfer"
          @connect="connect" @disconnect="disconnect" @switch-network="switchNetwork"
          @deploy="handleDeploy" @clear-addresses="handleClearAddresses"
          @toggle-transfer="toggleTransfer"
        />
        <template v-if="isConnected && !isDataLoaded">
          <div class="loading-state">
            <el-icon class="loading-icon" :size="32"><Loading /></el-icon>
            <span>{{ dataLoadingProgress || '正在加载...' }}</span>
          </div>
        </template>

        <template v-if="isDataLoaded && canInteract">
          <div class="user-grid">
            <RewardSection
              :can-interact="canInteract" :write-loading="writeLoading"
              :read-data="readData" :show-transfer="showTransfer"
              @claim-initial="testClaimInitialReward"
              @withdraw-post="testWithdrawPostRewards"
              @withdraw-comment="testWithdrawCommentRewards"
              @withdraw-initial="testWithdrawInitialReward"
              @withdraw-all="testWithdrawAllRewards"
              @ctk-transfer="testCTKTransfer"
            />

            <PostSection
              :can-interact="canInteract" :write-loading="writeLoading"
              :post-loading="postLoading" :post-list="posts"
              :read-data="readData"
              @reward-post="testRewardPost"
              @reward-comment="testRewardComment"
              @refresh-posts="fetchPosts"
            />
          </div>

          <NFTSection
            :can-interact="canInteract" :write-loading="writeLoading"
            :read-data="readData" :show-transfer="showTransfer"
            @mint-bronze="testMintBronze" @mint-silver="testMintSilver"
            @mint-gold="testMintGold" @burn-nft="testBurnNFT"
            @nft-transfer="testNFTTransfer"
          />

          <div class="admin-wrapper">
            <AdminSection
                v-if="isOwner && canInteract"
                :can-interact="canInteract" :write-loading="writeLoading"
                :token-contract-read="tokenContractRead"
                :nft-contract-read="nftContractRead"
                :pool-data="poolData"
                @send-creator="testSendCreatorReward"
                @send-interact="testSendInteractReward"
                @reset-price="testResetNFTPrice" @adjust-price="testRandomAdjustPrice"
                @withdraw-ctk="testNFTWithdrawCTK"
                @withdraw-all-ctk="testNFTWithdrawAllCTK"
                @withdraw-overflow="testNFTWithdrawOverflow"
                @refresh-pools="refreshPools"
            />
          </div>
        </template>
      </div>

      <aside class="sticky-sidebar">
        <ChainDataSection
          :read-data="readData" :read-error="readError"
          :read-loading="readLoading" :label-map="labelMap"
          :is-wallet-connected="isConnected"
          @refresh="refreshData"
        />
        <TxHistorySection
            :tx-list="txList"
            :block-explorer="NETWORK_CONFIG.blockExplorer"
            @clear="() => { clearTxHistory(); saveStore(Number(chainId), tokenAddress) }"
          />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.app-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.06));
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 14px;
}

.app-title {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.manual-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6366f1;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.06);
  transition: all 0.2s ease;
}

.manual-link:hover {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-color: transparent;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.layout-grid {
  display: grid;
  grid-template-columns: 1fr 0.5fr;
  gap: 20px;
  align-items: flex-start;
  position: relative;
}

.left-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  position: relative;
}

.sticky-sidebar {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 40px);
  overflow: hidden;
}

.sticky-sidebar > :deep(.el-card) {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 0;
}

.sticky-sidebar > :deep(.el-card .el-card__body) {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sticky-sidebar > :deep(.el-card .card-body) {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
  font-size: 14px;
}

.loading-state .loading-icon {
  margin-bottom: 16px;
  color: #409eff;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  align-items: stretch;
}

.user-grid > :deep(.el-card) {
  display: flex;
  flex-direction: column;
}

:deep(.el-card) { margin-bottom: 20px; }
:deep(.el-card:last-child) { margin-bottom: 0; }
:deep(.el-descriptions__label) { color: #4a6b8a; font-weight: 500; }

.admin-wrapper {
  margin-top: 20px;
}
:deep(.el-table) {
  --el-table-border-color: #e4f2fe;
  --el-table-header-bg-color: #f0f8ff;
}

@media (max-width: 1024px) {
  .user-grid { grid-template-columns: 1fr; }
}

@media (max-width: 800px) {
  .app-page { padding: 12px; }
  .layout-grid { grid-template-columns: 1fr; }
  .sticky-sidebar { position: static; height: auto; }
  .sticky-sidebar > :deep(.el-card) { flex: none; }
  .sticky-sidebar > :deep(.el-card .card-body) { overflow: visible; }
}
</style>

<style>
.el-message .tx-link { color: #409eff; text-decoration: none; margin-left: 6px; font-size: 12px; word-break: break-all; }
.el-message .tx-link:hover { text-decoration: underline; }

.el-scrollbar__thumb {
  background-color: rgba(99, 102, 241, 0.25) !important;
}
.el-scrollbar__thumb:hover {
  background-color: rgba(99, 102, 241, 0.4) !important;
}
</style>
