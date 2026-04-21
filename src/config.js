export const config = {
  contracts: {
    creatorToken: import.meta.env.VITE_CREATOR_TOKEN_ADDRESS,
    creatorNFT: import.meta.env.VITE_CREATOR_NFT_ADDRESS
  },
  network: {
    targetChainId: Number(import.meta.env.VITE_TARGET_CHAIN_ID) || 11155111,
    name: import.meta.env.VITE_NETWORK_NAME || 'Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: import.meta.env.VITE_BLOCK_EXPLORER || 'https://sepolia.etherscan.io'
  }
}
