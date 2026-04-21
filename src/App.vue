<script setup>
import { ref, computed, watch } from 'vue'
import { useWallet } from '@/composables/useWallet'
import { useTransaction } from '@/composables/useTransaction'
import { usePostList } from '@/composables/usePostList'
import { useContractAddress } from '@/composables/useContractAddress'
import { useDeploy } from '@/composables/useDeploy'
import { useTxHistory } from '@/composables/useTxHistory'
import { useChainDataCache } from '@/composables/useChainDataCache'
import { formatTokenAmount, formatCooldown, getCooldownStatus } from '@/utils/format'
import { DECIMALS } from '@/utils/constants'
import { NETWORK_CONFIG } from '@/contracts'
import { ethers } from 'ethers'

// Sub-components
import WalletSection from '@/components/WalletSection.vue'
import DeploySection from '@/components/DeploySection.vue'
import ChainDataSection from '@/components/ChainDataSection.vue'
import TxResultSection from '@/components/TxResultSection.vue'
import TxHistorySection from '@/components/TxHistorySection.vue'
import RewardSection from '@/components/RewardSection.vue'
import PostSection from '@/components/PostSection.vue'
import NFTSection from '@/components/NFTSection.vue'
import TransferSection from '@/components/TransferSection.vue'
import AdminSection from '@/components/AdminSection.vue'

const {
  account, chainId, isConnected, isCorrectNetwork,
  isInitializing, error, currentNetwork, isOwner,
  tokenContractRead, nftContractRead,
  tokenContractWrite, nftContractWrite,
  contractsReady, connect, disconnect, switchNetwork
} = useWallet()

const tx = useTransaction()
const { posts: postList, loading: postLoading, fetchPosts, clearPosts } = usePostList()
const { hasAddresses, tokenAddress, nftAddress, clearAddresses, clearAllContractData } = useContractAddress()
const { deployStatus, deployError, deployedTokenAddress, deployedNftAddress, deploy, resetDeploy } = useDeploy()
const { txList, loadHistory, addTx, clearHistory } = useTxHistory()
const { cachedData, hasCache, cacheAge, load: loadCache, save: saveCache, savePartial: saveCachePartial } = useChainDataCache()

const canInteract = computed(() =>
  isConnected.value && isCorrectNetwork.value && contractsReady.value && hasAddresses.value
)

async function handleDeploy() {
  if (!isConnected.value) { error.value = '请先连接钱包'; return }
  if (!isCorrectNetwork.value) { error.value = '请切换到正确的网络'; return }
  try {
    const signer = (await new ethers.BrowserProvider(window.ethereum)).getSigner()
    await deploy(await signer)
  } catch {}
}

function handleClearAddresses() {
  clearAllContractData(Number(chainId.value), tokenAddress.value)
  resetDeploy()
  readData.value = {}
  txList.value = []
  clearPosts()
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
    const myRanks = await n.getNFTRankCountsByOwner(account.value)

    const postCD = getCooldownStatus(lastPost, postInterval * 1000)
    const commentCD = getCooldownStatus(lastComment, commentInterval * 1000)
    const pendingRewards = await t.getPendingRewards(account.value)

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
      myBronze: Number(myRanks.bc),
      mySilver: Number(myRanks.sc),
      myGold: Number(myRanks.gc),
      pendingPostReward: formatTokenAmount(pendingRewards.post),
      pendingCommentReward: formatTokenAmount(pendingRewards.comment),
      pendingInitialReward: formatTokenAmount(pendingRewards.initial),
      pendingTotalReward: formatTokenAmount(pendingRewards.total)
    }
    // 存入缓存
    saveCache(Number(chainId.value), tokenAddress.value, account.value, readData.value)
  } catch (e) {
    readError.value = e.message || String(e)
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
  myBronze: async (t, n, addr) => ({ myBronze: Number((await n.getNFTRankCountsByOwner(addr)).bc) }),
  mySilver: async (t, n, addr) => ({ mySilver: Number((await n.getNFTRankCountsByOwner(addr)).sc) }),
  myGold: async (t, n, addr) => ({ myGold: Number((await n.getNFTRankCountsByOwner(addr)).gc) }),
  pendingPostReward: async (t, n, addr) => ({ pendingPostReward: formatTokenAmount((await t.getPendingRewards(addr)).post) }),
  pendingCommentReward: async (t, n, addr) => ({ pendingCommentReward: formatTokenAmount((await t.getPendingRewards(addr)).comment) }),
  pendingInitialReward: async (t, n, addr) => ({ pendingInitialReward: formatTokenAmount((await t.getPendingRewards(addr)).initial) }),
  pendingTotalReward: async (t, n, addr) => ({ pendingTotalReward: formatTokenAmount((await t.getPendingRewards(addr)).total) })
}

async function refreshFields(keys) {
  if (!tokenContractRead.value || !nftContractRead.value || !account.value) return
  const t = tokenContractRead.value, n = nftContractRead.value, addr = account.value
  const updates = {}
  for (const key of keys) {
    if (fieldQueries[key]) {
      try {
        Object.assign(updates, await fieldQueries[key](t, n, addr))
      }
      catch { /* ignore */ }
    }
  }
  if (Object.keys(updates).length) {
    Object.assign(readData.value, updates)
    saveCachePartial(Number(chainId.value), tokenAddress.value, addr, updates)
  }
}

const writeResult = ref(null)
const writeError = ref(null)
const writeLoading = ref(false)

function clearWrite() { writeResult.value = null; writeError.value = null }

async function doWrite(fn, refreshKeys = null, txLabel = '') {
  clearWrite()
  writeLoading.value = true
  try {
    const r = await tx.execute(fn)
    const hashStr = String(r.hash)
    writeResult.value = `成功! Hash: ${hashStr}`
    if (txLabel && hashStr) {
      addTx(Number(chainId.value), tokenAddress.value, { hash: hashStr, label: txLabel, timestamp: Date.now() })
    }
    if (refreshKeys) await refreshFields(refreshKeys)
    else await refreshData()
  } catch (e) {
    writeError.value = tx.errorMessage.value || e.message || String(e)
  } finally {
    writeLoading.value = false
  }
}

async function testClaimInitialReward() {
  clearWrite()
  if (await tokenContractRead.value.hasClaimedInitialReward(account.value)) { writeError.value = '已领取初始奖励'; return }
  await doWrite(() => tokenContractWrite.value.claimInitialReward(), ['ctkBalance', 'hasClaimedInitial', 'pendingInitialReward', 'pendingTotalReward'], '领取初始奖励')
}

async function testRewardPost() {
  clearWrite()
  const lastPost = Number(await tokenContractRead.value.lastPostTime(account.value))
  const interval = Number(await tokenContractRead.value.POST_INTERVAL())
  if (Date.now() / 1000 - lastPost < interval) { writeError.value = '发帖冷却中，请稍后'; return }
  await doWrite(() => tokenContractWrite.value.rewardPost(), ['ctkBalance', 'postCooldown', 'pendingPostReward', 'pendingTotalReward'], '发帖奖励')
}

async function testRewardComment(author, postId) {
  clearWrite()
  await doWrite(() => tokenContractWrite.value.rewardComment(author, postId), ['ctkBalance', 'commentCooldown', 'pendingCommentReward', 'pendingTotalReward'], `评论帖子 #${postId}`)
}

async function testMintBronze() {
  clearWrite()
  if (await tokenContractRead.value.balanceOf(account.value) < await nftContractRead.value.bronzePrice()) {
    writeError.value = `余额不足`; return
  }
  await doWrite(() => nftContractWrite.value.mintBronzeNFT(), ['ctkBalance', 'nftCount', 'myBronze', 'nftBoost'], '铸造青铜勋章')
}

async function testMintSilver() {
  clearWrite()
  if (await tokenContractRead.value.balanceOf(account.value) < await nftContractRead.value.silverPrice()) {
    writeError.value = `余额不足`; return
  }
  await doWrite(() => nftContractWrite.value.mintSilverNFT(), ['ctkBalance', 'nftCount', 'mySilver', 'nftBoost'], '铸造白银勋章')
}

async function testMintGold() {
  clearWrite()
  if (await tokenContractRead.value.balanceOf(account.value) < await nftContractRead.value.goldPrice()) {
    writeError.value = `余额不足`; return
  }
  await doWrite(() => nftContractWrite.value.mintGoldNFT(), ['ctkBalance', 'nftCount', 'myGold', 'nftBoost'], '铸造黄金勋章')
}

async function testBurnNFT(tokenId) {
  clearWrite()
  try {
    if ((await nftContractRead.value.ownerOf(tokenId)).toLowerCase() !== account.value.toLowerCase()) {
      writeError.value = '您不是该勋章的所有者'; return
    }
  } catch { writeError.value = '该tokenId不存在'; return }
  await doWrite(() => nftContractWrite.value.burnNFTForRefund(tokenId), ['ctkBalance', 'nftCount', 'nftBoost'], `销毁勋章 #${tokenId}`)
}

async function testCTKTransfer(to, amount) {
  clearWrite()
  if (!to.value || !amount.value) { writeError.value = '请填写地址和金额'; return }
  const amt = ethers.parseUnits(amount.value, DECIMALS)
  await doWrite(() => tokenContractWrite.value.transfer(to.value, amt), ['ctkBalance'], 'CTK转账')
}

async function testNFTTransfer(to, tokenId) {
  clearWrite()
  if (!to.value) { writeError.value = '请填写接收地址'; return }
  await doWrite(() => nftContractWrite.value.transferFrom(account.value, to.value, tokenId.value), ['nftCount', 'nftBoost'], `转移勋章 #${tokenId.value}`)
}

async function testWithdrawPostRewards() {
  clearWrite()
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).post) === 0) { writeError.value = '无待提现帖子奖励'; return }
  await doWrite(() => tokenContractWrite.value.withdrawPostRewards(), ['ctkBalance', 'pendingPostReward', 'pendingTotalReward'], '提现帖奖')
}

async function testWithdrawCommentRewards() {
  clearWrite()
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).comment) === 0) { writeError.value = '无待提现评论奖励'; return }
  await doWrite(() => tokenContractWrite.value.withdrawCommentRewards(), ['ctkBalance', 'pendingCommentReward', 'pendingTotalReward'], '提现评奖')
}

async function testWithdrawInitialReward() {
  clearWrite()
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).initial) === 0) { writeError.value = '无待提现初始奖励'; return }
  await doWrite(() => tokenContractWrite.value.withdrawInitialReward(), ['ctkBalance', 'pendingInitialReward', 'pendingTotalReward'], '提现初始奖')
}

async function testWithdrawAllRewards() {
  clearWrite()
  if (Number((await tokenContractRead.value.getPendingRewards(account.value)).total) === 0) { writeError.value = '无待提现奖励'; return }
  await doWrite(() => tokenContractWrite.value.withdrawAllRewards(), ['ctkBalance', 'pendingPostReward', 'pendingCommentReward', 'pendingInitialReward', 'pendingTotalReward'], '全部提现')
}

async function testSendCreatorReward(to, amount) {
  clearWrite()
  if (!to.value || !amount.value) { writeError.value = '请填写地址和金额'; return }
  await doWrite(() => tokenContractWrite.value.sendCreatorReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), ['ctkBalance'], '创作者池发放')
}

async function testSendInteractReward(to, amount) {
  clearWrite()
  if (!to.value || !amount.value) { writeError.value = '请填写地址和金额'; return }
  await doWrite(() => tokenContractWrite.value.sendInteractReward(to.value, ethers.parseUnits(amount.value, DECIMALS)), ['ctkBalance'], '互动池发放')
}

async function testResetNFTPrice() { clearWrite(); await doWrite(() => nftContractWrite.value.resetNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], '重置勋章价格') }
async function testRandomAdjustPrice() { clearWrite(); await doWrite(() => nftContractWrite.value.randomlyAdjustNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], '随机调价') }
async function testNFTWithdrawCTK() { clearWrite(); await doWrite(() => nftContractWrite.value.withdrawCTK(), null, '提取溢出CTK') }

watch(canInteract, (val) => {
  if (val) loadCache(Number(chainId.value), tokenAddress.value, account.value)
}, { immediate: true })

// 合约可用时：有缓存直接用缓存，无缓存才从链上拉取
watch(canInteract, (val) => {
  if (val) {
    if (hasCache.value && cachedData.value) {
      readData.value = { ...cachedData.value }
    } else {
      refreshData()
    }
  }
})

// 账户切换时清除旧缓存、加载新缓存
watch(account, (newAddr, oldAddr) => {
  if (newAddr && oldAddr && newAddr !== oldAddr) {
    readData.value = {}
    loadCache(Number(chainId.value), tokenAddress.value, newAddr)
    if (hasCache.value && cachedData.value) {
      readData.value = { ...cachedData.value }
    } else {
      refreshData()
    }
  }
})
</script>

<template>
  <div class="app-page">
    <h1 class="app-title">CreatorCommunity 合约交互</h1>

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
      @deploy="handleDeploy" @clear-addresses="handleClearAddresses"
    />

    <div v-if="canInteract" class="main-with-sidebar">
      <div class="main-content">
        <TxResultSection
          v-if="writeResult || writeError || writeLoading"
          :write-result="writeResult" :write-error="writeError"
          :write-loading="writeLoading"
          :tx-hash="tx.txHash ? String(tx.txHash) : ''"
          :tx-loading="tx.isLoading"
          :block-explorer="NETWORK_CONFIG.blockExplorer"
        />

        <TxHistorySection
          v-if="txList.length > 0"
          :tx-list="txList"
          :block-explorer="NETWORK_CONFIG.blockExplorer"
          @clear="() => clearHistory(Number(chainId), tokenAddress)"
        />

        <div class="user-grid">
          <RewardSection
            :can-interact="canInteract" :write-loading="writeLoading"
            :read-data="readData"
            @claim-initial="testClaimInitialReward"
            @withdraw-post="testWithdrawPostRewards"
            @withdraw-comment="testWithdrawCommentRewards"
            @withdraw-initial="testWithdrawInitialReward"
            @withdraw-all="testWithdrawAllRewards"
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
            :read-data="readData"
            @mint-bronze="testMintBronze" @mint-silver="testMintSilver"
            @mint-gold="testMintGold" @burn-nft="testBurnNFT"
          />

          <TransferSection
            :can-interact="canInteract" :write-loading="writeLoading"
            @ctk-transfer="testCTKTransfer" @nft-transfer="testNFTTransfer"
          />
        </div>

        <AdminSection
          v-if="isOwner && canInteract"
          :can-interact="canInteract" :write-loading="writeLoading"
          @send-creator="testSendCreatorReward"
          @send-interact="testSendInteractReward"
          @reset-price="testResetNFTPrice" @adjust-price="testRandomAdjustPrice"
          @withdraw-ctk="testNFTWithdrawCTK"
        />
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

/* 主布局：内容 + 固定右侧栏 */
.main-with-sidebar {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: flex-start;
}

.main-content {
  min-width: 0;
}

.sticky-sidebar {
  position: sticky;
  top: 20px;
}

/* 用户功能区 2x2 网格 */
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

/* 平板 ≤1024px：用户区变单列，侧边栏保留 */
@media (max-width: 1024px) {
  .user-grid { grid-template-columns: 1fr; }
}

/* 窄屏 ≤800px：取消侧边栏，全部单列 */
@media (max-width: 800px) {
  .app-page { padding: 12px; }

  .main-with-sidebar {
    grid-template-columns: 1fr;
  }

  .sticky-sidebar { position: static; }
}
</style>
