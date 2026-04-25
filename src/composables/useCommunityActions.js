import { h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ethers } from 'ethers'
import { DECIMALS } from '@/utils/constants'
import { formatTokenAmount, shortenAddress } from '@/utils/format'
import { t } from '@/locales'

export function useCommunityActions({
  account,
  chainId,
  isConnected,
  isCorrectNetwork,
  tokenAddress,
  tokenContractRead,
  nftContractRead,
  tokenContractWrite,
  nftContractWrite,
  connect,
  walletDisconnect,
  deploy,
  deployError,
  resetDeploy,
  clearAllContractData,
  readData,
  readError,
  poolData,
  posts,
  isDataLoaded,
  showTransfer,
  clearUserData,
  clearAllWithChainToken,
  saveActiveStore,
  loadTxHistories,
  setTxHistoryScope,
  applyCurrentCooldowns,
  stopCooldownTimer,
  fetchPosts,
  refreshAccountFields,
  refreshPools,
  tx,
  writeLoading,
  notifyTxPending,
  notifyTxSuccess,
  notifyTxError,
  recordTxHistory,
  getCachedAccountFieldTargets,
  doWrite
}) {
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

  return {
    handlers: {
      'claim-initial': testClaimInitialReward,
      'withdraw-post': testWithdrawPostRewards,
      'withdraw-comment': testWithdrawCommentRewards,
      'withdraw-initial': testWithdrawInitialReward,
      'withdraw-all': testWithdrawAllRewards,
      'ctk-transfer': testCTKTransfer,
      'reward-post': testRewardPost,
      'reward-comment': testRewardComment,
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
      disconnect,
      deploy: handleDeploy,
      'clear-addresses': handleClearAddresses
    }
  }
}
