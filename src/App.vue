<script setup>
import { ref } from 'vue'
import { useWallet } from '@/composables/useWallet'
import { formatTokenAmount, shortenAddress } from '@/utils/format'

const {
  account, chainId, isConnected, isCorrectNetwork,
  isInitializing, error, currentNetwork, isOwner,
  tokenContractRead, nftContractRead,
  connect, disconnect, switchNetwork
} = useWallet()

const testResults = ref({})
const testError = ref(null)
const testing = ref(false)
const ownerDebug = ref({ tokenOwner: '', nftOwner: '', currentAccount: '' })

async function runReadTests() {
  testing.value = true
  testError.value = null
  testResults.value = {}

  if (!tokenContractRead.value || !nftContractRead.value) {
    testError.value = '合约实例未初始化，请先连接钱包'
    testing.value = false
    return
  }

  try {
    const token = tokenContractRead.value
    const nft = nftContractRead.value

    // 管理员调试信息
    const tokenOwnerAddr = await token.owner()
    const nftOwnerAddr = await nft.owner()
    ownerDebug.value = {
      tokenOwner: tokenOwnerAddr,
      nftOwner: nftOwnerAddr,
      currentAccount: account.value
    }

    // CreatorToken 只读调用
    testResults.value['token.name'] = await token.name()
    testResults.value['token.symbol'] = await token.symbol()
    testResults.value['token.decimals'] = Number(await token.decimals())
    testResults.value['token.totalSupply'] = formatTokenAmount(await token.totalSupply())
    testResults.value['token.CREATOR_POOL'] = formatTokenAmount(await token.CREATOR_POOL())
    testResults.value['token.INTERACT_POOL'] = formatTokenAmount(await token.INTERACT_POOL())
    testResults.value['token.NFT_POOL'] = formatTokenAmount(await token.NFT_POOL())
    testResults.value['token.owner'] = shortenAddress(await token.owner())
    testResults.value['token.creatorNFT'] = shortenAddress(await token.creatorNFT())
    testResults.value['token.balanceOf(self)'] = formatTokenAmount(await token.balanceOf(account.value))
    testResults.value['token.hasClaimedInitialReward'] = await token.hasClaimedInitialReward(account.value)
    testResults.value['token.lastPostTime'] = Number(await token.lastPostTime(account.value))
    testResults.value['token.POST_REWARD'] = formatTokenAmount(await token.POST_REWARD())
    testResults.value['token.POST_INTERVAL'] = Number(await token.POST_INTERVAL())
    testResults.value['token.calculateNFTBoost'] = Number(await token.calculateNFTBoost(account.value))

    // CreatorNFT 只读调用
    testResults.value['nft.name'] = await nft.name()
    testResults.value['nft.symbol'] = await nft.symbol()
    testResults.value['nft.owner'] = shortenAddress(await nft.owner())
    testResults.value['nft.bronzePrice'] = formatTokenAmount(await nft.bronzePrice())
    testResults.value['nft.silverPrice'] = formatTokenAmount(await nft.silverPrice())
    testResults.value['nft.goldPrice'] = formatTokenAmount(await nft.goldPrice())
    testResults.value['nft.balanceOf(self)'] = Number(await nft.balanceOf(account.value))
    const rankCountsAll = await nft.getNFTRankCounts()
    testResults.value['nft.getNFTRankCounts'] = {
      bronze: Number(rankCountsAll[0]),
      silver: Number(rankCountsAll[1]),
      gold: Number(rankCountsAll[2])
    }

    const rankCounts = await nft.getNFTRankCountsByOwner(account.value)
    testResults.value['nft.getNFTRankCountsByOwner'] = {
      bronze: Number(rankCounts.bronzeCount),
      silver: Number(rankCounts.silverCount),
      gold: Number(rankCounts.goldCount)
    }
  } catch (e) {
    testError.value = e.message || String(e)
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="test-page">
    <h1>CreatorCommunity 连通性测试</h1>

    <!-- 钱包状态 -->
    <section class="card">
      <h2>钱包状态</h2>
      <p v-if="!isConnected">
        <button :disabled="isInitializing" @click="connect">
          {{ isInitializing ? '连接中...' : '连接 MetaMask' }}
        </button>
      </p>
      <div v-else>
        <p>地址: <strong>{{ shortenAddress(account) }}</strong></p>
        <p>网络: <strong>{{ currentNetwork?.name }}</strong></p>
        <p :style="{ color: isCorrectNetwork ? 'green' : 'red' }">
          {{ isCorrectNetwork ? '✓ 目标网络匹配' : '✗ 网络不匹配，请切换到 Sepolia' }}
        </p>
        <p>管理员: <strong>{{ isOwner ? '是' : '否' }}</strong></p>
        <div v-if="ownerDebug.currentAccount" style="background:#f5f5f5;padding:8px;margin:8px 0;border-radius:4px;font-size:12px">
          <p>当前账户: {{ ownerDebug.currentAccount }}</p>
          <p>Token owner: {{ ownerDebug.tokenOwner }}</p>
          <p>NFT owner: {{ ownerDebug.nftOwner }}</p>
          <p>匹配Token: {{ ownerDebug.currentAccount?.toLowerCase() === ownerDebug.tokenOwner?.toLowerCase() ? '✓' : '✗' }}</p>
          <p>匹配NFT: {{ ownerDebug.currentAccount?.toLowerCase() === ownerDebug.nftOwner?.toLowerCase() ? '✓' : '✗' }}</p>
        </div>
        <button v-if="!isCorrectNetwork" @click="switchNetwork">切换到 Sepolia</button>
        <button @click="disconnect">断开钱包</button>
      </div>
      <p v-if="error" style="color: red">{{ error }}</p>
    </section>

    <!-- 只读调用测试 -->
    <section v-if="isConnected && isCorrectNetwork" class="card">
      <h2>合约只读调用测试</h2>
      <button :disabled="testing" @click="runReadTests">
        {{ testing ? '测试中...' : '执行只读测试' }}
      </button>

      <p v-if="testError" style="color: red">{{ testError }}</p>

      <div v-if="Object.keys(testResults).length > 0" class="results">
        <h3>CreatorToken (CTK)</h3>
        <table>
          <tr v-for="(val, key) in testResults" :key="key">
            <td v-if="key.startsWith('token.')">{{ key }}</td>
            <td v-if="key.startsWith('token.')">{{ typeof val === 'object' ? JSON.stringify(val, (_, v) => typeof v === 'bigint' ? Number(v) : v) : val }}</td>
          </tr>
        </table>

        <h3>CreatorNFT (CMN)</h3>
        <table>
          <tr v-for="(val, key) in testResults" :key="key">
            <td v-if="key.startsWith('nft.')">{{ key }}</td>
            <td v-if="key.startsWith('nft.')">{{ typeof val === 'object' ? JSON.stringify(val, (_, v) => typeof v === 'bigint' ? Number(v) : v) : val }}</td>
          </tr>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.test-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.card {
  border: 1px solid #ddd;
  padding: 16px;
  margin: 16px 0;
  border-radius: 8px;
}
button {
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid #333;
  background: #fff;
  border-radius: 4px;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button:hover:not(:disabled) {
  background: #eee;
}
.results table {
  width: 100%;
  border-collapse: collapse;
}
.results td {
  border: 1px solid #ccc;
  padding: 6px 10px;
}
.results td:first-child {
  font-weight: bold;
  width: 40%;
}
</style>