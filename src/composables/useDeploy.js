import { ref } from 'vue'
import { ethers } from 'ethers'
import CreatorTokenABI from '@/contracts/CreatorToken_ABI.json'
import CreatorTokenBytecode from '@/contracts/CreatorToken_Bytecode?raw'
import { useContractAddress } from '@/composables/useContractAddress'
import { t } from '@/locales'

const deployStatus = ref('idle') // idle | deploying | confirming | fetching-nft | success | error
const deployError = ref(null)
const deployedTokenAddress = ref(null)
const deployedNftAddress = ref(null)

async function deploy(signer) {
  if (!signer) {
    deployError.value = t('modules.deploy.error.wallet_not_connected')
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
      deployError.value = t('modules.deploy.error.rejected')
    } else if (e.code === 'INSUFFICIENT_FUNDS') {
      deployError.value = t('modules.deploy.error.insufficient_funds')
    } else if (e.reason) {
      deployError.value = e.reason
    } else if (e.info?.error?.message) {
      deployError.value = e.info.error.message
    } else {
      deployError.value = e.shortMessage || e.message || t('modules.deploy.status.failed')
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
