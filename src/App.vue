<script setup>
import { ref, computed, watch } from 'vue'
import { useWallet } from '@/composables/useWallet'
import { useTransaction } from '@/composables/useTransaction'
import { usePostList } from '@/composables/usePostList'
import { useContractAddress } from '@/composables/useContractAddress'
import { useDeploy } from '@/composables/useDeploy'
import { useTxHistory } from '@/composables/useTxHistory'
import { formatTokenAmount, shortenAddress, formatCooldown, getCooldownStatus } from '@/utils/format'
import { DECIMALS } from '@/utils/constants'
import { NETWORK_CONFIG } from '@/contracts'
import { ethers } from 'ethers'

const {
  account, chainId, isConnected, isCorrectNetwork,
  isInitializing, error, currentNetwork, isOwner,
  tokenContractRead, nftContractRead,
  tokenContractWrite, nftContractWrite,
  contractsReady, connect, disconnect, switchNetwork
} = useWallet()

const tx = useTransaction()

const { posts: postList, loading: postLoading, fetchPosts, clearPosts } = usePostList()

const { hasAddresses, tokenAddress, nftAddress, clearAddresses } = useContractAddress()
const { deployStatus, deployError, deployedTokenAddress, deployedNftAddress, deploy, resetDeploy } = useDeploy()
const { txList, loadHistory, addTx } = useTxHistory()

// Computed: whether user can interact with contracts
const canInteract = computed(() =>
  isConnected.value && isCorrectNetwork.value && contractsReady.value && hasAddresses.value
)

// Deploy status label
const deployStatusLabel = computed(() => {
  const labels = {
    idle: '部署合约',
    deploying: '部署中...',
    confirming: '等待确认...',
    'fetching-nft': '获取NFT地址...',
    success: '部署成功!',
    error: '重新部署'
  }
  return labels[deployStatus.value] || '部署合约'
})

async function handleDeploy() {
  if (!isConnected.value) {
    error.value = '请先连接钱包'
    return
  }
  if (!isCorrectNetwork.value) {
    error.value = '请切换到正确的网络'
    return
  }

  try {
    const signer = (await new ethers.BrowserProvider(window.ethereum)).getSigner()
    await deploy(await signer)
  } catch {
    // deployError is already set in useDeploy
  }
}

function handleClearAddresses() {
  clearAddresses()
  resetDeploy()
}

// Auto-refresh when contracts become available or account changes
watch(canInteract, (val) => {
  if (val) refreshData()
})
watch(canInteract, (val) => {
  if (val) loadHistory(Number(chainId.value), tokenAddress.value)
}, { immediate: true })

function shortenHash(hash) {
  if (!hash) return ''
  return hash.slice(0, 10) + '...' + hash.slice(-8)
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 数据字段中文标签映射
const labelMap = {
  ctkBalance: 'CTK余额',
  hasClaimedInitial: '已领初始奖励',
  postCooldown: '发帖冷却',
  commentCooldown: '评论冷却',
  nftBoost: '勋章总增益(%)',
  bronzePrice: '青铜勋章价格',
  silverPrice: '白银勋章价格',
  goldPrice: '黄金勋章价格',
  nftCount: '总持有持有勋章数量',
  myBronze: '持有青铜勋章数量',
  mySilver: '持有白银勋章数量',
  myGold: '持有黄金勋章数量',
  pendingPostReward: '待提现的发帖奖励',
  pendingCommentReward: '待提现的评论奖励',
  pendingInitialReward: '待提现的初始奖励',
  pendingTotalReward: '合计待提现奖励'
}

// 只读数据
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
    const token = tokenContractRead.value
    const nft = nftContractRead.value

    const balance = await token.balanceOf(account.value)
    const hasClaimed = await token.hasClaimedInitialReward(account.value)
    const lastPost = Number(await token.lastPostTime(account.value))
    const postInterval = Number(await token.POST_INTERVAL())
    const lastComment = Number(await token.lastCommentTime(account.value))
    const commentInterval = Number(await token.COMMENT_INTERVAL())
    const boost = Number(await token.calculateNFTBoost(account.value))
    const bronzePrice = await nftContractRead.value.bronzePrice()
    const silverPrice = await nftContractRead.value.silverPrice()
    const goldPrice = await nftContractRead.value.goldPrice()
    const nftBalance = Number(await nft.balanceOf(account.value))
    const myRanks = await nft.getNFTRankCountsByOwner(account.value)

    const postCD = getCooldownStatus(lastPost, postInterval * 1000)
    const commentCD = getCooldownStatus(lastComment, commentInterval * 1000)

    const pendingRewards = await token.getPendingRewards(account.value)

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
  } catch (e) {
    readError.value = e.message || String(e)
  } finally {
    readLoading.value = false
  }
  // 刷新帖子列表
  await fetchPosts(tokenContractRead.value)
}

// ========== 定向刷新 ==========
// 每个字段对应的查询函数
const fieldQueries = {
  ctkBalance: async (t, n, addr) => ({ ctkBalance: formatTokenAmount(await t.balanceOf(addr)) }),
  hasClaimedInitial: async (t, n, addr) => ({ hasClaimedInitial: await t.hasClaimedInitialReward(addr) }),
  postCooldown: async (t, n, addr) => {
    const lastPost = Number(await t.lastPostTime(addr))
    const interval = Number(await t.POST_INTERVAL())
    const cd = getCooldownStatus(lastPost, interval * 1000)
    return { postCooldown: cd.ready ? '可发帖' : `等待 ${formatCooldown(cd.remaining)}` }
  },
  commentCooldown: async (t, n, addr) => {
    const lastComment = Number(await t.lastCommentTime(addr))
    const interval = Number(await t.COMMENT_INTERVAL())
    const cd = getCooldownStatus(lastComment, interval * 1000)
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
  const t = tokenContractRead.value
  const n = nftContractRead.value
  const addr = account.value
  for (const key of keys) {
    if (fieldQueries[key]) {
      try {
        const updates = await fieldQueries[key](t, n, addr)
        Object.assign(readData.value, updates)
      } catch { /* ignore individual failures */ }
    }
  }
}

// ========== 写入交易 ==========
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
      addTx(Number(chainId.value), tokenAddress.value, {
        hash: hashStr,
        label: txLabel,
        timestamp: Date.now()
      })
    }
    if (refreshKeys) {
      await refreshFields(refreshKeys)
    } else {
      await refreshData()
    }
  } catch (e) {
    writeError.value = tx.errorMessage.value || e.message || String(e)
  } finally {
    writeLoading.value = false
  }
}

// 前置校验 + 写入
async function testClaimInitialReward() {
  clearWrite()
  const hasClaimed = await tokenContractRead.value.hasClaimedInitialReward(account.value)
  if (hasClaimed) { writeError.value = '已领取初始奖励'; return }
  await doWrite(() => tokenContractWrite.value.claimInitialReward(), ['ctkBalance', 'hasClaimedInitial', 'pendingInitialReward', 'pendingTotalReward'], '领取初始奖励')
}

async function testRewardPost() {
  clearWrite()
  const lastPost = Number(await tokenContractRead.value.lastPostTime(account.value))
  const interval = Number(await tokenContractRead.value.POST_INTERVAL())
  if (Date.now() / 1000 - lastPost < interval) {
    writeError.value = '发帖冷却中，请稍后'
    return
  }
  await doWrite(() => tokenContractWrite.value.rewardPost(), ['ctkBalance', 'postCooldown', 'pendingPostReward', 'pendingTotalReward'], '发帖奖励')
}

async function testRewardComment(author, postId) {
  clearWrite()
  await doWrite(() => tokenContractWrite.value.rewardComment(author, postId), ['ctkBalance', 'commentCooldown', 'pendingCommentReward', 'pendingTotalReward'], `评论帖子 #${postId}`)
}

async function testMintBronze() {
  clearWrite()
  const balance = await tokenContractRead.value.balanceOf(account.value)
  const price = await nftContractRead.value.bronzePrice()
  if (balance < price) { writeError.value = `余额不足，需要 ${formatTokenAmount(price)} CTK`; return }
  await doWrite(() => nftContractWrite.value.mintBronzeNFT(), ['ctkBalance', 'nftCount', 'myBronze', 'nftBoost'], '铸造青铜勋章')
}

async function testMintSilver() {
  clearWrite()
  const balance = await tokenContractRead.value.balanceOf(account.value)
  const price = await nftContractRead.value.silverPrice()
  if (balance < price) { writeError.value = `余额不足，需要 ${formatTokenAmount(price)} CTK`; return }
  await doWrite(() => nftContractWrite.value.mintSilverNFT(), ['ctkBalance', 'nftCount', 'mySilver', 'nftBoost'], '铸造白银勋章')
}

async function testMintGold() {
  clearWrite()
  const balance = await tokenContractRead.value.balanceOf(account.value)
  const price = await nftContractRead.value.goldPrice()
  if (balance < price) { writeError.value = `余额不足，需要 ${formatTokenAmount(price)} CTK`; return }
  await doWrite(() => nftContractWrite.value.mintGoldNFT(), ['ctkBalance', 'nftCount', 'myGold', 'nftBoost'], '铸造黄金勋章')
}

const burnTokenId = ref(0)
async function testBurnNFT() {
  clearWrite()
  try {
    const ownerOf = await nftContractRead.value.ownerOf(burnTokenId.value)
    if (ownerOf.toLowerCase() !== account.value.toLowerCase()) {
      writeError.value = '您不是该NFT的所有者'; return
    }
  } catch { writeError.value = '该tokenId不存在'; return }
  await doWrite(() => nftContractWrite.value.burnNFTForRefund(burnTokenId.value), ['ctkBalance', 'nftCount', 'nftBoost'], `销毁勋章 #${burnTokenId.value}`)
}

const transferTo = ref('')
const transferAmount = ref('')
async function testCTKTransfer() {
  clearWrite()
  if (!transferTo.value || !transferAmount.value) { writeError.value = '请填写地址和金额'; return }
  const amount = ethers.parseUnits(transferAmount.value, DECIMALS)
  await doWrite(() => tokenContractWrite.value.transfer(transferTo.value, amount), ['ctkBalance'], 'CTK转账')
}

const nftTransferTo = ref('')
const nftTransferTokenId = ref(0)
async function testNFTTransfer() {
  clearWrite()
  if (!nftTransferTo.value) { writeError.value = '请填写接收地址'; return }
  await doWrite(() => nftContractWrite.value.transferFrom(account.value, nftTransferTo.value, nftTransferTokenId.value), ['nftCount', 'nftBoost'], `转移勋章 #${nftTransferTokenId.value}`)
}

// ========== 管理员功能 ==========
const adminTo = ref('')
const adminAmount = ref('')
async function testSendCreatorReward() {
  clearWrite()
  if (!adminTo.value || !adminAmount.value) { writeError.value = '请填写地址和金额'; return }
  const amount = ethers.parseUnits(adminAmount.value, DECIMALS)
  await doWrite(() => tokenContractWrite.value.sendCreatorReward(adminTo.value, amount), ['ctkBalance'], '创作者池发放')
}

async function testSendInteractReward() {
  clearWrite()
  if (!adminTo.value || !adminAmount.value) { writeError.value = '请填写地址和金额'; return }
  const amount = ethers.parseUnits(adminAmount.value, DECIMALS)
  await doWrite(() => tokenContractWrite.value.sendInteractReward(adminTo.value, amount), ['ctkBalance'], '互动池发放')
}

async function testResetNFTPrice() { clearWrite(); await doWrite(() => nftContractWrite.value.resetNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], '重置勋章价格') }
async function testRandomAdjustPrice() { clearWrite(); await doWrite(() => nftContractWrite.value.randomlyAdjustNFTPrice(), ['bronzePrice', 'silverPrice', 'goldPrice'], '随机调价') }
async function testNFTWithdrawCTK() { clearWrite(); await doWrite(() => nftContractWrite.value.withdrawCTK(), null, '提取溢出CTK') }

// ========== 奖励提现 ==========
async function testWithdrawPostRewards() {
  clearWrite()
  const rewards = await tokenContractRead.value.getPendingRewards(account.value)
  if (Number(rewards.post) === 0) { writeError.value = '无待提现帖子奖励'; return }
  await doWrite(() => tokenContractWrite.value.withdrawPostRewards(), ['ctkBalance', 'pendingPostReward', 'pendingTotalReward'], '提现帖奖')
}

async function testWithdrawCommentRewards() {
  clearWrite()
  const rewards = await tokenContractRead.value.getPendingRewards(account.value)
  if (Number(rewards.comment) === 0) { writeError.value = '无待提现评论奖励'; return }
  await doWrite(() => tokenContractWrite.value.withdrawCommentRewards(), ['ctkBalance', 'pendingCommentReward', 'pendingTotalReward'], '提现评奖')
}

async function testWithdrawInitialReward() {
  clearWrite()
  const rewards = await tokenContractRead.value.getPendingRewards(account.value)
  if (Number(rewards.initial) === 0) { writeError.value = '无待提现初始奖励'; return }
  await doWrite(() => tokenContractWrite.value.withdrawInitialReward(), ['ctkBalance', 'pendingInitialReward', 'pendingTotalReward'], '提现初始奖')
}

async function testWithdrawAllRewards() {
  clearWrite()
  const rewards = await tokenContractRead.value.getPendingRewards(account.value)
  if (Number(rewards.total) === 0) { writeError.value = '无待提现奖励'; return }
  await doWrite(() => tokenContractWrite.value.withdrawAllRewards(), ['ctkBalance', 'pendingPostReward', 'pendingCommentReward', 'pendingInitialReward', 'pendingTotalReward'], '全部提现')
}
</script>

<template>
  <div class="test-page">
    <h1>CreatorCommunity 合约交互测试</h1>

    <!-- 钱包 -->
    <section class="card">
      <h2>钱包</h2>
      <p v-if="!isConnected">
        <button :disabled="isInitializing" @click="connect">{{ isInitializing ? '连接中...' : '连接 MetaMask' }}</button>
      </p>
      <div v-else>
        <p>{{ shortenAddress(account) }} | {{ currentNetwork?.name }} {{ isCorrectNetwork ? '✓' : '✗' }} | 管理员: {{ isOwner ? '是' : '否' }}</p>
        <button v-if="!isCorrectNetwork" @click="switchNetwork">切换网络</button>
        <button @click="disconnect">断开</button>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <!-- 合约部署 -->
    <section v-if="isConnected && isCorrectNetwork" class="card">
      <h2>合约部署</h2>

      <!-- No addresses cached — show deploy prompt -->
      <div v-if="!hasAddresses" class="deploy-prompt">
        <p class="warning">未检测到已部署的合约地址，请先部署合约。</p>
        <p class="tip">部署 CreatorToken 合约将自动创建 CreatorNFT 合约，两个合约在同一交易中部署完成。</p>
        <button
          :disabled="deployStatus === 'deploying' || deployStatus === 'confirming' || deployStatus === 'fetching-nft'"
          @click="handleDeploy"
        >
          {{ deployStatusLabel }}
        </button>
        <p v-if="deployStatus === 'deploying'" class="info">合约部署交易已提交，等待矿工确认...</p>
        <p v-if="deployStatus === 'confirming'" class="info">交易已确认，正在获取合约地址...</p>
        <p v-if="deployStatus === 'fetching-nft'" class="info">正在通过 Token 合约获取 NFT 合约地址...</p>
        <p v-if="deployStatus === 'success'" class="ok">
          部署成功! Token: {{ deployedTokenAddress }} | NFT: {{ deployedNftAddress }}
        </p>
        <p v-if="deployError" class="err">{{ deployError }}</p>
      </div>

      <!-- Addresses cached — show address info -->
      <div v-else class="deploy-info">
        <table class="data-table">
          <tbody>
            <tr>
              <td class="key">Token 合约</td>
              <td>{{ tokenAddress }}
                <a v-if="NETWORK_CONFIG.blockExplorer" :href="`${NETWORK_CONFIG.blockExplorer}/address/${tokenAddress}`" target="_blank" class="link">查看</a>
              </td>
            </tr>
            <tr>
              <td class="key">NFT 合约</td>
              <td>{{ nftAddress }}
                <a v-if="NETWORK_CONFIG.blockExplorer" :href="`${NETWORK_CONFIG.blockExplorer}/address/${nftAddress}`" target="_blank" class="link">查看</a>
              </td>
            </tr>
          </tbody>
        </table>
        <button @click="handleClearAddresses" class="btn-danger">清除地址 (重新部署)</button>
      </div>
    </section>

    <!-- 无地址提示（钱包未连接时也显示） -->
    <section v-if="!hasAddresses && (!isConnected || !isCorrectNetwork)" class="card">
      <p class="warning">未检测到合约地址，请连接钱包并切换到正确网络后部署合约。</p>
      <p class="tip">所有合约交互功能在部署前不可使用。</p>
    </section>

    <!-- 只读数据 -->
    <section v-if="canInteract" class="card">
      <h2>链上数据</h2>
      <button :disabled="!canInteract || readLoading" @click="refreshData">{{ readLoading ? '加载中...' : '刷新数据' }}</button>
      <p v-if="readError" class="err">{{ readError }}</p>
      <table v-if="Object.keys(readData).length" class="data-table">
          <tr v-for="(val, key) in readData" :key="key">
            <td class="key">{{ labelMap[key] || key }}</td><td>{{ val }}</td>
          </tr>
        </table>
    </section>

    <!-- 交易结果 -->
    <section v-if="writeResult || writeError || writeLoading" class="card">
      <h2>交易结果</h2>
      <p v-if="writeLoading">交易提交中，等待确认...</p>
      <p v-if="writeResult" class="ok">{{ writeResult }}</p>
      <p v-if="writeError" class="err">{{ writeError }}</p>
    </section>

    <!-- 交易历史 -->
    <section v-if="canInteract && txList.length > 0" class="card">
      <h2>交易历史</h2>
      <table class="data-table tx-history-table">
        <thead>
          <tr>
            <th>交易类型</th>
            <th>交易哈希</th>
            <th>时间</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in txList" :key="item.hash">
            <td>{{ item.label }}</td>
            <td class="hash-cell">{{ item.hash }}</td>
            <td>{{ formatTime(item.timestamp) }}</td>
            <td>
              <a v-if="NETWORK_CONFIG.blockExplorer" :href="`${NETWORK_CONFIG.blockExplorer}/tx/${item.hash}`" target="_blank">查看</a>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 用户功能 -->
    <section v-if="canInteract" class="card">
      <h2>用户功能</h2>

      <div class="action-group">
        <h3>初始奖励</h3>
        <button :disabled="!canInteract || writeLoading" @click="testClaimInitialReward">领取 1 CTK 初始奖励</button>
      </div>

      <div class="action-group">
        <h3>待提现奖励</h3>
        <table v-if="readData.pendingTotalReward" class="data-table reward-table">
          <tbody>
            <tr>
              <td class="key">帖子奖励</td>
              <td>{{ readData.pendingPostReward || '0' }} CTK</td>
              <td><button :disabled="!canInteract || writeLoading" @click="testWithdrawPostRewards">提现</button></td>
            </tr>
            <tr>
              <td class="key">评论奖励</td>
              <td>{{ readData.pendingCommentReward || '0' }} CTK</td>
              <td><button :disabled="!canInteract || writeLoading" @click="testWithdrawCommentRewards">提现</button></td>
            </tr>
            <tr>
              <td class="key">初始奖励</td>
              <td>{{ readData.pendingInitialReward || '0' }} CTK</td>
              <td><button :disabled="!canInteract || writeLoading" @click="testWithdrawInitialReward">提现</button></td>
            </tr>
            <tr>
              <td class="key">合计</td>
              <td>{{ readData.pendingTotalReward || '0' }} CTK</td>
              <td><button :disabled="!canInteract || writeLoading" @click="testWithdrawAllRewards">全部提现</button></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-tip">刷新数据后查看待提现奖励</p>
      </div>

      <div class="action-group">
        <h3>社区互动</h3>
        <button :disabled="!canInteract || writeLoading" @click="testRewardPost">发帖奖励</button>
      </div>

      <div class="action-group">
        <h3>帖子列表</h3>
        <button :disabled="!canInteract || postLoading" @click="() => fetchPosts(tokenContractRead.value)" style="margin-bottom:8px">{{ postLoading ? '加载中...' : '刷新帖子' }}</button>
        <div v-if="postList.length === 0 && !postLoading" class="empty-tip">暂无帖子</div>
        <div v-for="post in postList" :key="post.postId" class="post-item">
          <div class="post-info">
            <span class="post-id">帖子 #{{ post.postId }}</span>
            <span class="post-author">{{ post.authorShort }}</span>
          </div>
          <button :disabled="!canInteract || writeLoading" @click="testRewardComment(post.author, post.postId)">评论</button>
        </div>
      </div>

      <div class="action-group">
        <h3>铸造 NFT</h3>
        <button :disabled="!canInteract || writeLoading" @click="testMintBronze">铸造青铜 ({{ readData.bronzePrice || '?' }} CTK)</button>
        <button :disabled="!canInteract || writeLoading" @click="testMintSilver">铸造白银 ({{ readData.silverPrice || '?' }} CTK)</button>
        <button :disabled="!canInteract || writeLoading" @click="testMintGold">铸造黄金 ({{ readData.goldPrice || '?' }} CTK)</button>
      </div>

      <div class="action-group">
        <h3>销毁 NFT</h3>
        <div class="inline-inputs">
          <input v-model.number="burnTokenId" type="number" placeholder="NFT Token ID" />
          <button :disabled="!canInteract || writeLoading" @click="testBurnNFT">销毁返还80%</button>
        </div>
      </div>

      <div class="action-group">
        <h3>CTK 转账</h3>
        <div class="inline-inputs">
          <input v-model="transferTo" placeholder="接收地址" />
          <input v-model="transferAmount" placeholder="金额 (CTK)" />
          <button :disabled="!canInteract || writeLoading" @click="testCTKTransfer">转账</button>
        </div>
      </div>

      <div class="action-group">
        <h3>NFT 转移</h3>
        <div class="inline-inputs">
          <input v-model="nftTransferTo" placeholder="接收地址" />
          <input v-model.number="nftTransferTokenId" type="number" placeholder="NFT Token ID" />
          <button :disabled="!canInteract || writeLoading" @click="testNFTTransfer">转移</button>
        </div>
      </div>
    </section>

    <!-- 管理员功能 -->
    <section v-if="isOwner && canInteract" class="card">
      <h2>管理员功能</h2>
      <div class="action-group">
        <h3>奖励发放</h3>
        <div class="inline-inputs">
          <input v-model="adminTo" placeholder="接收地址" />
          <input v-model="adminAmount" placeholder="金额 (CTK)" />
          <button :disabled="!canInteract || writeLoading" @click="testSendCreatorReward">创作者池发放</button>
          <button :disabled="!canInteract || writeLoading" @click="testSendInteractReward">互动池发放</button>
        </div>
      </div>

      <div class="action-group">
        <h3>NFT 价格管理</h3>
        <button :disabled="!canInteract || writeLoading" @click="testResetNFTPrice">重置初始价格</button>
        <button :disabled="!canInteract || writeLoading" @click="testRandomAdjustPrice">随机调价±10%</button>
      </div>

      <div class="action-group">
        <h3>NFT 合约提取</h3>
        <button :disabled="!canInteract || writeLoading" @click="testNFTWithdrawCTK">提取溢出CTK</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.test-page { max-width: 800px; margin: 0 auto; padding: 20px; }
.card { border: 1px solid #ddd; padding: 16px; margin: 16px 0; border-radius: 8px; }
button { padding: 6px 14px; cursor: pointer; border: 1px solid #333; background: #fff; border-radius: 4px; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button:hover:not(:disabled) { background: #eee; }
.btn-danger { border-color: #c00; color: #c00; }
.btn-danger:hover:not(:disabled) { background: #fee; }
input { padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; width: 180px; }
.inline-inputs { display: flex; gap: 8px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
.action-group { margin: 12px 0; }
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: #666; }
.data-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
.data-table td { border: 1px solid #ccc; padding: 6px 10px; }
.data-table .key { font-weight: bold; width: 35%; }
.err { color: red; }
.ok { color: green; }
.warning { color: #c00; font-weight: bold; }
.info { color: #333; }
.tip { color: #666; font-size: 13px; }
.link { margin-left: 8px; }
a { color: #1a73e8; }
.empty-tip { color: #999; font-size: 13px; padding: 8px 0; }
.post-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.post-info { display: flex; gap: 12px; align-items: center; }
.post-id { font-weight: bold; font-size: 14px; }
.post-author { font-size: 13px; color: #666; }
.deploy-prompt { padding: 8px 0; }
.deploy-info { padding: 8px 0; }
.reward-table td:last-child { width: auto; text-align: right; }
.tx-history-table th { font-weight: bold; background: #f5f5f5; }
.hash-cell { font-size: 13px; font-family: monospace; }
</style>