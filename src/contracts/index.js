import CreatorTokenABI from './CreatorToken_ABI.json'
import CreatorNFTABI from './CreatorNFT_ABI.json'
import { config } from '@/config'

export const CONTRACTS = {
  CreatorToken: {
    abi: CreatorTokenABI,
    address: config.contracts.creatorToken
  },
  CreatorNFT: {
    abi: CreatorNFTABI,
    address: config.contracts.creatorNFT
  }
}

export const NETWORK_CONFIG = {
  targetChainId: config.network.targetChainId,
  name: config.network.name,
  rpcUrl: config.network.rpcUrl,
  blockExplorer: config.network.blockExplorer
}