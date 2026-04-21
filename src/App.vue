<script setup>
import { ref, computed, watch, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useWallet } from '@/composables/useWallet'
import { useTransaction } from '@/composables/useTransaction'
import { usePostList } from '@/composables/usePostList'
import { useContractAddress } from '@/composables/useContractAddress'
import { useDeploy } from '@/composables/useDeploy'
import { useTxHistory } from '@/composables/useTxHistory'
import { useDataCache } from '@/composables/useDataCache'
import { formatTokenAmount, formatCooldown, getCooldownStatus } from '@/utils/format'
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

const {
  account, chainId, isConnected, isCorrectNetwork,
  isInitializing, error, currentNetwork, isOwner,
  tokenContractRead, nftContractRead,
  tokenContractWrite, nftContractWrite,
  contractsReady, connect, disconnect, switchNetwork
} = useWallet()

const tx = useTransaction()
const { posts: postList, loading: postLoading, fetchPosts, clearPosts, savePostsCache, loadPostsCache } = usePostList()
const { hasAddresses, tokenAddress, nftAddress, clearAddresses, clearAllContractData } = useContractAddress()
const { deployStatus, deployError, deployedTokenAddress, deployedNftAddress, deploy, resetDeploy } = useDeploy()
const { txList, loadHistory, addTx, clearHistory } = useTxHistory()
const { load: loadCache, save: saveCache, savePartial: saveCachePartial, clear: clearCache } = useDataCache()

const canInteract = computed(() =>
  isConnected.value && isCorrectNetwork.value && contractsReady.value && hasAddresses.value
)

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

function handleClearAddresses() {
  clearAllContractData(Number(chainId.value), tokenAddress.value)
  clearCache(Number(chainId.value), tokenAddress.value, account.value)
  resetDeploy()
  readData.value = {}
  txList.value = []
  clearPosts()
  postList.value = []
  localStorage.removeItem(`creatorcommunity_${chainId.value}_${tokenAddress.value}_posts`)
  showTransfer.value = false
  localStorage.removeItem(`showTransfer_${chainId.value}_${tokenAddress.value}`)
}

// 资产转移功能开关（按网络+合约地址持久化）
const showTransfer = ref(false)
function initTransferToggle() {
  const key = `showTransfer_${chainId.value}_${tokenAddress.value}`
  showTransfer.value = localStorage.getItem(key) === 'true'
}
function toggleTransfer() {
  showTransfer.value = !showTransfer.value
  const key = `showTransfer_${chainId.value}_${tokenAddress.value}`
  localStorage.setItem(key, showTransfer.value)
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

    // NFT ID列表，与数量同源保证一致性
    const nftIds = await n.getNFTsByOwner(account.value)
    const bronze = [], silver = [], gold = []
    for (const id of nftIds) {
      const rank = Number(await n.nftRank(id))
      if (rank === 0) bronze.push(Number(id))
      else if (rank === 1) silver.push(Number(id))
      else if (rank === 2) gold.push(Number(id))
    }

    readData.value = {
      ctkBalance: formatTokenAmount(balance),
      hasClaimedInitial: hasClaimed,
      postCooldown: postCD.ready ? '可发帖' : `等待 ${formatCooldown(postCD.remaining)}`,
      commentCooldown: commentCD.ready ? '可评论' : `等待 ${formatCooldown(commentCD.remaining)}`,
      nftBoost: boost,
      bronzePrice: formatTokenAmount(bronzePrice),
      silverPrice: formatTokenAmount(silverPrice),
      goldPrice: formatTokenAmount(goldPrice),
      nftCount: nftBalance,
      myBronze: bronze.length,
      mySilver: silver.length,
      myGold: gold.length,
      // myNFTs: { bronze, silver, gold },
      pendingPostReward: formatTokenAmount(pendingRewards.post),
      pendingCommentReward: formatTokenAmount(pendingRewards.comment),
      pendingInitialReward: formatTokenAmount(pendingRewards.initial),
      pendingTotalReward: formatTokenAmount(pendingRewards.total)
    }

    saveCache(Number(chainId.value), tokenAddress.value, account.value, readData.value)
    savePostsCache(Number(chainId.value), tokenAddress.value)
    const parts = [`CTK: ${readData.value.ctkBalance} | 勋章: ${nftBalance} 枚`]
    if (pendingRewards.total > 0n) parts.push(`| 待提现: ${formatTokenAmount(pendingRewards.total)} CTK`)
    ElMessage({ message: parts.join(' '), type: 'success', duration: 3000 })
  } catch (e) {
    readError.value = e.message || String(e)
    ElMessage({ message: `数据查询失败: ${readError.value}`, type: 'error', duration: 5000 })
  } finally {
    readLoading.value = false
  }
  await fetchPosts(tokenContractRead.value)
}

const fieldQueries = {
  ctkBalance: async (t, n, addr) => ({ ctkBalance: formatTokenAmount(await t.balanceOf(addr)) }),
  hasClaimedInitial: async (t, n, addr) => ({ hasClaimedInitial: await t.hasClaimedInitialReward(addr) }),
  postCooldown: async (t, n, addr) => {
    const lp = Number(await t.lastPostTime(addr)), iv = Number(await t.POST_INTERVAL())
    const cd = getCooldownStatus(lp, iv * 1000)
    return { postCooldown: cd.ready ? '可发帖' : `等待 ${formatCooldown(cd.remaining)}` }
  },
  commentCooldown: async (t, n, addr) => {
    const lc = Number(await t.lastCommentTime(addr)), iv = Number(await t.COMMENT_INTERVAL())
    const cd = getCooldownStatus(lc, iv * 1000)
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
    return { myBronze: bronze.length, mySilver: silver.length, myGold: gold.length, myNFTs: { bronze, silver, gold } }
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
    Object.assign(readData.value, updates)
    saveCachePartial(Number(chainId.value), tokenAddress.value, addr, updates)
  }
  await fetchPosts(t)
}

const writeLoading = ref(false)

function notifyTxPending(label) {
  const msg = ElMessage({ message: `${label} 处理中...`, type: 'warning', duration: 0 })
  return msg
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

async function doWrite(fn, refreshKeys = null, txLabel = '') {
  writeLoading.value = true
  notifyTxPending(txLabel || '交易提交中...')
  try {
    const r = await tx.execute(fn)
    const hashStr = String(r.hash)
    if (txLabel && hashStr) {
      addTx(Number(chainId.value), tokenAddress.value, { hash: hashStr, label: txLabel, timestamp: Date.now() })
    }
    if (refreshKeys) await refreshFields(refreshKeys)
    else await refreshData()
    notifyTxSuccess(hashStr, txLabel)
  } catch (e) {
    const errMsg = tx.errorMessage.value || e.message || '交易失败'
    notifyTxError(errMsg)
  } finally {
    writeLoading.value = false
  }
}

async function testClaimInitialReward() {
  if (await tokenContractRead.value.hasClaimedInitialReward(account.value)) { notifyTxError('已领取初始奖励'); return }
  await doWrite(() => tokenContractWrite.value.claimInitialReward(), ['ctkBalance', 'hasClaimedInitial', 'pendingInitialReward', 'pendingTotalReward'], '领取初始奖励')
}

async function testRewardPost() {
  const lastPost = Number(await tokenContractRead.value.lastPostTime(account.value))
  const interval = Number(await tokenContractRead.value.POST_INTERVAL())
  if (Date.now() / 1000 - lastPost < interval) { notifyTxError('发帖冷却中，请稍后'); return }
  await doWrite(() => tokenContractWrite.value.rewardPost(), ['ctkBalance', 'postCooldown', 'pendingPostReward', 'pendingTotalReward'], '发帖')
}

async function testRewardComment(author, postId) {
  await doWrite(() => tokenContractWrite.value.rewardComment(author, postId), ['ctkBalance', 'commentCooldown', 'pendingCommentReward', 'pendingTotalReward'], `评论帖子 #${postId}`)
}

async function testMintBronze() {
  if (await tokenContractRead.value.balanceOf(account.value) < await nftContractRead.value.bronzePrice()) {
    notifyTxError('CTK余额不足'); return
  }
  await doWrite(() => nftContractWrite.value.mintBronzeNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], '铸造青铜勋章')
}

async function testMintSilver() {
  if (await tokenContractRead.value.balanceOf(account.value) < await nftContractRead.value.silverPrice()) {
    notifyTxError('CTK余额不足'); return
  }
  await doWrite(() => nftContractWrite.value.mintSilverNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], '铸造白银勋章')
}

async function testMintGold() {
  if (await tokenContractRead.value.balanceOf(account.value) < await nftContractRead.value.goldPrice()) {
    notifyTxError('CTK余额不足'); return
  }
  await doWrite(() => nftContractWrite.value.mintGoldNFT(), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], '铸造黄金勋章')
}

async function testBurnNFT(tokenId) {
  try {
    if ((await nftContractRead.value.ownerOf(tokenId)).toLowerCase() !== account.value.toLowerCase()) {
      notifyTxError('您不是该勋章的所有者'); return
    }
  } catch { notifyTxError('该tokenId不存在'); return }
  try {
    await ElMessageBox.confirm('销毁当前勋章，仅返回当前勋章价值的 80%', '确认销毁', {
      confirmButtonText: '确认销毁',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch { return }
  await doWrite(() => nftContractWrite.value.burnNFTForRefund(tokenId), ['ctkBalance', 'nftCount', 'nftBoost', 'myNFTs'], `销毁勋章 #${tokenId}`)
}

async function testCTKTransfer(to, amount) {
  if (!to.value || !amount.value) { notifyTxError('请填写地址和金额'); return }
  const amt = ethers.parseUnits(amount.value, DECIMALS)
  await doWrite(() => tokenContractWrite.value.transfer(to.value, amt), ['ctkBalance'], 'CTK转账')
}

async function testNFTTransfer(to, tokenId) {
  if (!to.value) { notifyTxError('请填写接收地址'); return }
  await doWrite(() => nftContractWrite.value.transferFrom(account.value, to.value, tokenId.value), ['nftCount', 'nftBoost', 'myNFTs'], `转移勋章 #${tokenId.value}`)
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
  await doWrite(() => tokenContractWrite.value.sendCreatorReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), ['ctkBalance'], '创作者池发放')
}

async function testSendInteractReward(to, amount) {
  if (!to.value || !amount.value) { notifyTxError('请填写地址和金额'); return }
  await doWrite(() => tokenContractWrite.value.sendInteractReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), ['ctkBalance'], '互动池发放')
}

async function testResetNFTPrice() { await doWrite(() => nftContractWrite.value.resetNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], '重置勋章价格') }
async function testRandomAdjustPrice() { await doWrite(() => nftContractWrite.value.randomlyAdjustNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], '随机调价') }
async function testNFTWithdrawCTK() { await doWrite(() => nftContractWrite.value.withdrawCTK(), null, '提取溢出CTK') }

// 页面加载：优先读缓存，无缓存则全量刷新
watch(canInteract, (val) => {
  if (val) {
    initTransferToggle()
    loadHistory(Number(chainId.value), tokenAddress.value)
    // 帖子列表：先读缓存秒显示，再刷新区块链数据
    const postCache = loadPostsCache(Number(chainId.value), tokenAddress.value)
    if (postCache?.data?.length) {
      postList.value = postCache.data
    }
    const cached = loadCache(Number(chainId.value), tokenAddress.value, account.value)
    if (cached?.data) {
      readData.value = cached.data
      // 有缓存时也需刷新帖子（缓存中不包含帖子列表）
      if (tokenContractRead.value) fetchPosts(tokenContractRead.value)
    } else {
      refreshData()
    }
  }
}, { immediate: true })

// 账户切换：清空状态，重新加载
watch(account, (newAddr, oldAddr) => {
  if (newAddr && oldAddr && newAddr !== oldAddr) {
    readData.value = {}
    const cached = loadCache(Number(chainId.value), tokenAddress.value, newAddr)
    if (cached?.data) {
      readData.value = cached.data
    } else {
      refreshData()
    }
  }
})
</script>

<template>
  <div class="app-page">
    <h1 class="app-title">CreatorCommunity 合约交互</h1>

    <div class="layout-grid">
      <div class="left-col">
        <WalletSection
          :is-connected="isConnected" :is-initializing="isInitializing"
          :is-correct-network="isCorrectNetwork" :is-owner="isOwner"
          :current-network="currentNetwork" :account="account" :error="error"
          @connect="connect" @disconnect="disconnect" @switch-network="switchNetwork"
        />

        <DeploySection
          :is-connected="isConnected" :is-correct-network="isCorrectNetwork"
          :has-addresses="hasAddresses" :deploy-status="deployStatus"
          :deploy-error="deployError" :deployed-token-address="deployedTokenAddress"
          :deployed-nft-address="deployedNftAddress"
          :token-address="tokenAddress" :nft-address="nftAddress"
          :block-explorer="NETWORK_CONFIG.blockExplorer"
          :show-transfer="showTransfer"
          @deploy="handleDeploy" @clear-addresses="handleClearAddresses"
          @toggle-transfer="toggleTransfer"
        />

        <template v-if="canInteract">
          <TxHistorySection
            v-if="txList.length > 0"
            :tx-list="txList"
            :block-explorer="NETWORK_CONFIG.blockExplorer"
            @clear="() => clearHistory(Number(chainId), tokenAddress)"
          />

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
              :post-loading="postLoading" :post-list="postList"
              :read-data="readData"
              @reward-post="testRewardPost"
              @reward-comment="testRewardComment"
              @refresh-posts="() => fetchPosts(tokenContractRead)"
            />

            <NFTSection
              :can-interact="canInteract" :write-loading="writeLoading"
              :read-data="readData" :show-transfer="showTransfer"
              @mint-bronze="testMintBronze" @mint-silver="testMintSilver"
              @mint-gold="testMintGold" @burn-nft="testBurnNFT"
              @nft-transfer="testNFTTransfer"
            />
          </div>

          <div style="margin-top: 20px">
            <AdminSection
                v-if="isOwner && canInteract"
                :can-interact="canInteract" :write-loading="writeLoading"
                @send-creator="testSendCreatorReward"
                @send-interact="testSendInteractReward"
                @reset-price="testResetNFTPrice" @adjust-price="testRandomAdjustPrice"
                @withdraw-ctk="testNFTWithdrawCTK"
            />
          </div>
        </template>
      </div>

      <aside class="sticky-sidebar">
        <ChainDataSection
          :read-data="readData" :read-error="readError"
          :read-loading="readLoading" :label-map="labelMap"
          @refresh="refreshData"
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

.app-title {
  text-align: center;
  color: #2c5282;
  margin-bottom: 24px;
  font-size: 24px;
}

.layout-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: flex-start;
}

.left-col {
  min-width: 0;
}

.sticky-sidebar {
  position: sticky;
  top: 20px;
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

:deep(.el-card) { margin-bottom: 20px; }
:deep(.el-card:last-child) { margin-bottom: 0; }
:deep(.el-descriptions__label) { color: #4a6b8a; font-weight: 500; }
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
  .sticky-sidebar { position: static; }
}
</style>

<style>
.el-message .tx-link { color: #409eff; text-decoration: none; margin-left: 6px; font-size: 12px; word-break: break-all; }
.el-message .tx-link:hover { text-decoration: underline; }
</style>