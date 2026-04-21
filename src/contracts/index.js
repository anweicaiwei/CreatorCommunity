import CreatorTokenABI from './CreatorToken_ABI.json'
import CreatorNFTABI from './CreatorNFT_ABI.json'
import { useContractAddress } from '@/composables/useContractAddress'
import { config } from '@/config'

export function getContracts() {
  const { tokenAddress, nftAddress } = useContractAddress()
  return {
    CreatorToken: {
      abi: CreatorTokenABI,
      address: tokenAddress.value
    },
    CreatorNFT: {
      abi: CreatorNFTABI,
      address: nftAddress.value
    }
  }
}

export const CREATOR_TOKEN_ABI = CreatorTokenABI
export const CREATOR_NFT_ABI = CreatorNFTABI

export const NETWORK_CONFIG = {
  targetChainId: config.network.targetChainId,
  name: config.network.name,
  rpcUrl: config.network.rpcUrl,
  blockExplorer: config.network.blockExplorer
}