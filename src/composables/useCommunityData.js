import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/composables/useDataStore'
import { formatCooldown, formatTokenAmount, getCooldownStatus, shortenAddress } from '@/utils/format'
import { t } from '@/locales'

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

export function useCommunityData({
  account,
  chainId,
  tokenAddress,
  tokenContractRead,
  nftContractRead,
  isOwner,
  canInteract,
  locale
}) {
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
    loadPosts,
    savePosts,
    loadSettings,
    saveSetting,
    clearAllWithChainToken
  } = useDataStore()

  const isDataLoaded = ref(false)
  const dataLoadingProgress = ref(`${t('common.status.pending')}...`)
  const showTransfer = ref(false)
  const globalRefreshLoading = ref(false)
  const txHistoryScope = ref('account')
  const readData = ref({})
  const readError = ref(null)
  const readLoading = ref(false)
  const poolData = ref({})
  const posts = ref([])
  const postLoading = ref(false)

  const postCooldownEnd = ref(0)
  const commentCooldownEnd = ref(0)
  let cooldownTimer = null

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

  function isCurrentAccount(address) {
    return normalizeAddress(address) === normalizeAddress(account.value)
  }

  function saveActiveStore() {
    // 本地缓存按 chainId + tokenAddress 分区，避免不同链或不同合约数据串用。
    saveStore(Number(chainId.value), tokenAddress.value)
  }

  function loadTxHistories(targetAddr = account.value) {
    loadTxHistory(targetAddr)
    loadSharedTxHistory()
  }

  function setTxHistoryScope(scope) {
    txHistoryScope.value = scope === 'shared' ? 'shared' : 'account'
  }

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
      value.startsWith('绛夊緟') ||
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
    // 冷却结束时间持久化为时间戳，界面每秒只刷新展示文案。
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
      // 局部刷新只查询本次交易影响的字段，失败时回退到完整账户快照。
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
      ElMessage({
        message: t('modules.chain_data.summary.query_failed', { message: e.message }),
        type: 'error',
        duration: 5000
      })
    }
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

  onBeforeUnmount(stopCooldownTimer)

  return {
    isDataLoaded,
    dataLoadingProgress,
    showTransfer,
    globalRefreshLoading,
    txHistoryScope,
    txHistoryList,
    labelMap,
    readData,
    readError,
    readLoading,
    poolData,
    posts,
    postLoading,
    setTxHistoryScope,
    toggleTransfer,
    saveActiveStore,
    loadTxHistories,
    clearUserData,
    clearAllWithChainToken,
    applyCurrentCooldowns,
    stopCooldownTimer,
    fetchPosts,
    refreshAccountData,
    refreshAccountFields,
    refreshData,
    refreshFields,
    refreshPools,
    getCachedAccounts,
    isCurrentAccount
  }
}
