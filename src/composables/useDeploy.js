import { ref } from 'vue'
import { ethers } from 'ethers'
import CreatorTokenABI from '@/contracts/CreatorToken_ABI.json'
import CreatorTokenBytecode from '@/contracts/CreatorToken_Bytecode?raw'
import { useContractAddress } from '@/composables/useContractAddress'

const deployStatus = ref('idle') // idle | deploying | confirming | fetching-nft | success | error
const deployError = ref(null)
const deployedTokenAddress = ref(null)
const deployedNftAddress = ref(null)

async function deploy(signer) {
  if (!signer) {
    deployError.value = '钱包未连接，无法部署'
    deployStatus.value = 'error'
    return
  }

  deployStatus.value = 'deploying'
  deployError.value = null
  deployedTokenAddress.value = null
  deployedNftAddress.value = null

  try {
    const bytecode = '0x' + CreatorTokenBytecode
    const factory = new ethers.ContractFactory(CreatorTokenABI, bytecode, signer)

    // CreatorToken constructor takes no arguments
    const contract = await factory.deploy()

    deployStatus.value = 'confirming'
    await contract.waitForDeployment()

    const tokenAddr = await contract.getAddress()
    deployedTokenAddress.value = tokenAddr

    // Get NFT address from the deployed Token contract
    deployStatus.value = 'fetching-nft'
    const nftAddr = await contract.creatorNFT()
    deployedNftAddress.value = nftAddr

    const { saveAddresses } = useContractAddress()
    saveAddresses(tokenAddr, nftAddr)

    deployStatus.value = 'success'
    return { tokenAddress: tokenAddr, nftAddress: nftAddr }
  } catch (e) {
    deployStatus.value = 'error'
    if (e.code === 4001 || e.code === 'ACTION_REJECTED') {
      deployError.value = '您取消了部署交易'
    } else if (e.code === 'INSUFFICIENT_FUNDS') {
      deployError.value = 'ETH 余额不足以支付部署燃气费'
    } else if (e.reason) {
      deployError.value = e.reason
    } else if (e.info?.error?.message) {
      deployError.value = e.info.error.message
    } else {
      deployError.value = e.shortMessage || e.message || '部署失败'
    }
    throw e
  }
}

function resetDeploy() {
  deployStatus.value = 'idle'
  deployError.value = null
  deployedTokenAddress.value = null
  deployedNftAddress.value = null
}

export function useDeploy() {
  return {
    deployStatus,
    deployError,
    deployedTokenAddress,
    deployedNftAddress,
    deploy,
    resetDeploy
  }
}