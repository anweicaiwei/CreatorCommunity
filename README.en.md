# CreatorCommunity
**English** | [简体中文](./README.md)
### Overview
**CreatorCommunity** is a decentralized creator community platform built on Ethereum, leveraging a dual-token economy of **CTK Token** and **CMN NFT Medals** to create a self-reinforcing incentive loop: "create content → earn rewards → upgrade medals → higher boost → keep creating".
#### Token & NFT Circulation
```
            Post / Comment
          ┌─────────────────────┐
          │   Earn CTK rewards   │
          │ (base + NFT boost)   │
          └─────────┬───────────┘
                    │ Accumulate CTK
                    ▼
          ┌─────────────────────┐
          │   Mint NFT with CTK  │
          │  Bronze(1K)/Silver   │
          │  (5K)/Gold(10K)      │
          └─────────┬───────────┘
                    │ Hold NFTs
                    ▼
          ┌─────────────────────┐
          │   NFT boost active   │
          │  Higher post/comment │
          │  rewards (up to 50%) │
          └─────────┬───────────┘
                    │ More CTK
                    ▼
          ┌─────────────────────┐
          │   Loop: mint more    │
          │   NFTs or burn for   │
          │   CTK refund         │
          └─────────────────────┘
```
#### Community Incentive Mechanism
1. **Creation = Mining**: Users earn CTK for posting (base 2 CTK/post, 5 min cooldown) and commenting (both commenter and post author earn base 0.1 CTK each, 30 sec cooldown). On-chain recording transforms content creation into quantifiable token rewards.
2. **Medal Boost (More NFTs = Bigger Rewards)**: The number of NFT medals held directly scales post and comment rewards. Each Bronze NFT adds 0.5% boost, Silver 2%, Gold 12% — stackable up to 50%. For example, a user with 5 Gold NFTs gets a 50% boost on post rewards (2 CTK → 3 CTK). This incentivizes users to continually invest and upgrade their medal portfolio.
3. **Two-Way CTK ↔ NFT Exchange**: Accumulated CTK can be spent to mint tiered NFT medals, creating a token sink; simultaneously, NFTs can be burned for an 80% refund in CTK, creating a reflux channel. This forms a complete circulation loop between tokens and NFTs.
4. **NFT Price Fluctuation**: The admin can trigger `randomlyAdjustNFTPrice` to randomly adjust NFT prices by ±10% (constrained within 50%-150% of initial values). This creates an investment-like dynamic: users can mint NFTs at low prices, wait for prices to rise, then burn for a CTK refund that may **exceed** their original mint cost — generating positive expectations that further motivate participation.
5. **Four-Pool Allocation for Sustainability**: CTK's total supply of 10 million is split across four pools: Creator Pool (4M for post rewards), Interaction Pool (2M for comment rewards + initial claims), NFT Pool (2M for NFT minting circulation), and Founder Pool (2M). Each pool's usage is independently tracked, preventing overconsumption from any single channel.
> A complete Web3 dApp demonstrating wallet connection, smart contract interaction, reward mechanics with cooldown timers, and NFT-based reputation badges.
### Features
- **Initial Reward** — Every new address can claim 1 CTK token once (`claimInitialReward`)
- **Post Rewards** — Earn CTK by posting on-chain, with a 5-minute cooldown (`rewardPost`)
- **Comment Rewards** — Earn CTK for commenting; both commenter and post author receive rewards, with a 30-second cooldown (`rewardComment`)
- **Token Balance** — Real-time CTK balance query and display
- **CTK Transfer** — Transfer CTK tokens to any address
- **NFT Badges** — Mint tiered NFTs (Bronze / Silver / Gold) with CTK, providing reward boost multipliers
- **NFT Burn & Refund** — Burn NFT to receive 80% of its cost back in CTK
- **NFT Transfer** — Transfer owned NFTs to other addresses
- **Admin Controls** — Pool distribution (creator pool / interaction pool), batch rewards, NFT price management, and overflow CTK withdrawal
- **Contract Deployment** — Deploy CreatorToken and CreatorNFT contracts directly from the UI
- **Transaction History** — Local caching of transaction records with block explorer links
- **Data Caching** — Smart caching for on-chain read data, post lists, and history (keyed by chainId + contract address + account)
- **Built-in User Manual** — Access `/CreatorCommunity/manual` for complete usage guide
### Tech Stack
| Category | Technology |
|----------|-----------|
| Framework | [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`) |
| Build Tool | [Vite 8](https://vite.dev/) |
| Routing | [Vue Router 4](https://router.vuejs.org/) (HTML5 mode, base path `/CreatorCommunity`) |
| Web3 Library | [ethers.js v6](https://docs.ethers.org/v6/) |
| UI Library | [Element Plus](https://element-plus.org/) |
| Markdown Parser | [markdown-it](https://github.com/markdown-it/markdown-it) |
| Wallet | MetaMask (BrowserProvider) |
| Network | Ethereum Sepolia Testnet (Chain ID: `11155111`) |
### Smart Contracts
This dApp interacts with two smart contracts:
#### CreatorToken (ERC-20, symbol: CTK, total supply: 10,000,000)
An ERC-20 token with a four-pool reward system (Creator Pool 40%, Interaction Pool 20%, NFT Pool 20%, Founder Pool 20%).
> The table below lists all contract functions. Some are already used by the frontend; others are pre-implemented but not exposed in the UI — developers can modify the frontend to call them as needed.
##### Admin Functions (owner only)
| Function | Parameters | Description |
|----------|------------|-------------|
| `sendCreatorReward` | `(address to, uint256 amount)` | Distribute CTK from the creator pool to an address |
| `sendInteractReward` | `(address to, uint256 amount)` | Distribute CTK from the interaction pool to an address |
| `batchSendReward` | `(address[] tos, uint256[] amounts)` | Batch distribute from creator pool (max 100 entries) |
| `withdrawTokens` | `(uint256 amount)` | Admin withdrawal, deducted at 70% creator pool + 30% interaction pool ratio |
| `destroyContract` | None | Permanently disable: recover NFT contract CTK balance to owner, set `isPaused = true` |
##### Community Interaction Functions (accounting model)
Uses an "account first, withdraw later" model: calling `rewardPost` / `rewardComment` / `claimInitialReward` only records pending rewards; the corresponding `withdraw*` function must be called to transfer CTK to the wallet balance.
| Function | Parameters | Description |
|----------|------------|-------------|
| `rewardPost` | None | Post to earn CTK (base 2 CTK + NFT boost), 5 min cooldown, returns `postId` |
| `rewardComment` | `(address author, uint256 postId)` | Comment to earn CTK for both commenter and author (base 0.1 CTK each + NFT boost), 30 sec cooldown |
| `claimInitialReward` | None | Claim initial reward (1 CTK), once per address |
##### Reward Withdrawal Functions
| Function | Parameters | Description |
|----------|------------|-------------|
| `withdrawPostRewards` | None | Withdraw all pending post rewards for the caller |
| `withdrawCommentRewards` | None | Withdraw all pending comment rewards for the caller |
| `withdrawInitialReward` | None | Withdraw pending initial reward for the caller |
| `withdrawAllRewards` | None | Withdraw all pending rewards at once (post + comment + initial) |
##### ERC-20 Standard Functions
| Function | Parameters | Description |
|----------|------------|-------------|
| `transfer` | `(address to, uint256 amount)` | Transfer CTK to a specified address |
| `approve` | `(address spender, uint256 amount)` | Authorize a third-party address to use a specified amount of CTK |
| `transferFrom` | `(address from, address to, uint256 amount)` | Transfer CTK from an authorized address |
##### NFT Contract Interop Functions (contract-to-contract calls)
These functions are only callable by the `CreatorNFT` contract, used for CTK flow and pool balance sync between the two contracts.
| Function | Parameters | Description |
|----------|------------|-------------|
| `nftPoolTransfer` | `(address to, uint256 amount)` | Transfer CTK from NFT pool to an address (owner only) |
| `transferFromUserForNFT` | `(address from, uint256 amount)` | Transfer CTK from user to NFT contract (NFT contract only) |
| `receiveFromNFTToCreatorPool` | `(uint256 amount)` | Receive CTK returned from NFT contract, reduce creator pool used amount (NFT contract only) |
| `receiveFromNFTToInteractPool` | `(uint256 amount)` | Receive CTK returned from NFT contract, reduce interaction pool used amount (NFT contract only) |
| `transferFromCreatorPoolToNFT` | `(uint256 amount)` | Transfer CTK from creator pool to NFT contract (NFT contract only, for NFT burn refund liquidity) |
| `transferFromInteractPoolToNFT` | `(uint256 amount)` | Transfer CTK from interaction pool to NFT contract (NFT contract only) |
##### Read-Only Query Functions
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `balanceOf` | `(address)` | `uint256` | Standard ERC-20 balance query |
| `hasClaimedInitialReward` | `(address)` | `bool` | Whether initial reward was claimed |
| `lastPostTime` | `(address)` | `uint256` | User's last post timestamp |
| `lastCommentTime` | `(address)` | `uint256` | User's last comment timestamp |
| `calculateNFTBoost` | `(address user)` | `uint256` | NFT reward boost percentage (max 50%) |
| `calculatePostCap` | `(address user)` | `uint256` | Post reward cap after NFT boost |
| `calculateCommentCap` | `(address user)` | `uint256` | Comment reward cap after NFT boost |
| `getPendingRewards` | `(address user)` | `(post, comment, initial, total)` | Query user's pending rewards by type and total |
| `getAuthorByPostId` | `(uint256 postId)` | `address` | Get post author by post ID |
| `postAuthor` | `(uint256)` | `address` | Post ID → author mapping (public read) |
| `postIdCounter` | None | `uint256` | Post ID auto-increment counter |
| `creatorPoolUsed` | None | `uint256` | Total distributed from creator pool |
| `interactPoolUsed` | None | `uint256` | Total distributed from interaction pool |
| `nftPoolUsed` | None | `uint256` | Total transferred from NFT pool |
| `isPaused` | None | `bool` | Whether the contract is paused |
##### Constants
| Constant | Value | Description |
|----------|-------|-------------|
| `TOTAL_SUPPLY` | 10,000,000 CTK | Total token supply |
| `CREATOR_POOL` | 4,000,000 CTK | Creator incentive pool |
| `INTERACT_POOL` | 2,000,000 CTK | Interaction incentive pool |
| `NFT_POOL` | 2,000,000 CTK | NFT exchange pool |
| `FOUNDER_POOL` | 2,000,000 CTK | Founder pool |
| `INITIAL_REWARD` | 1 CTK | New user initial reward |
| `POST_REWARD` | 2 CTK | Base post reward |
| `COMMENT_REWARD` | 0.1 CTK | Base comment reward |
| `POST_INTERVAL` | 300 sec | Post cooldown |
| `COMMENT_INTERVAL` | 30 sec | Comment cooldown |
| `POST_COMMENT_REWARD_CAP` | 3 CTK | Per-post comment reward total cap |
| `USER_COMMENT_REWARD_CAP` | 0.5 CTK | Per-user per-post comment reward cap |
| `MAX_BOOST_RATE` | 50% | Maximum NFT boost |
| `MAX_POST_REWARD` | 10 CTK | Absolute post reward cap |
| `MAX_COMMENT_REWARD` | 2 CTK | Absolute comment reward cap |
#### CreatorNFT (ERC-721, symbol: CMN)
A tiered NFT badge system with three ranks: BRONZE, SILVER, GOLD. Inherits OpenZeppelin's `ERC721Enumerable` and `ERC721Burnable`.
> The table below lists all contract functions. Some are already used by the frontend; others are pre-implemented but not exposed in the UI — developers can modify the frontend to call them as needed.
##### NFT Minting Functions
| Function | Parameters | Description |
|----------|------------|-------------|
| `mintBronzeNFT` | None | Mint Bronze NFT (costs CTK, initial price 1000 CTK) |
| `mintSilverNFT` | None | Mint Silver NFT (costs CTK, initial price 5000 CTK) |
| `mintGoldNFT` | None | Mint Gold NFT (costs CTK, initial price 10000 CTK) |
Internal flow: Check user CTK balance → Transfer CTK from user to NFT contract → Mint NFT → Update withdrawal threshold → Handle CTK overflow (amount above 2M CTK is returned to CreatorToken pools at 70/30 ratio).
##### NFT Burning Functions
| Function | Parameters | Description |
|----------|------------|-------------|
| `burnNFTForRefund` | `(uint256 tokenId)` | Burn specified NFT and refund 80% of mint price in CTK; if NFT contract balance is insufficient, automatically supplement liquidity from CreatorToken pools |
| `burn` | `(uint256 tokenId)` | Standard ERC721Burnable burn (no CTK refund, NFT only) |
##### NFT Transfer Functions
| Function | Parameters | Description |
|----------|------------|-------------|
| `transferFrom` | `(address from, address to, uint256 tokenId)` | Standard ERC721 transfer, auto-updates both parties' NFT rank counts |
| `safeTransferFrom` | `(address from, address to, uint256 tokenId, bytes data)` | Safe transfer (with data), auto-updates both parties' NFT rank counts |
##### CTK Withdrawal & Overflow Handling (admin)
| Function | Parameters | Description |
|----------|------------|-------------|
| `withdrawCTK` | None | Withdraw CTK balance exceeding threshold from NFT contract, returned to CreatorToken at 70/30 ratio |
| `withdrawAllCTK` | None | Withdraw all withdrawable CTK from NFT contract, returned to CreatorToken at 70/30 ratio |
| `withdrawOverflow` | None | Withdraw CTK exceeding 2M threshold from NFT contract, returned to CreatorToken at 70/30 ratio |
| `recoverCTK` | None | Recover all CTK from NFT contract to CreatorToken, set `isPaused = true` (permanent disable) |
| `checkAndHandleOverflow` | Internal | When NFT contract CTK balance exceeds 2M (NFT_POOL_INITIAL), auto-return overflow to CreatorToken pools at 70/30 ratio |
##### NFT Price Management (admin)
| Function | Parameters | Description |
|----------|------------|-------------|
| `randomlyAdjustNFTPrice` | None | Randomly adjust all three NFT prices (±10%), constrained within 50%-150% of initial values and inter-rank price relationships |
| `resetNFTPrice` | None | Reset all three NFT prices to initial values (Bronze 1000 / Silver 5000 / Gold 10000 CTK) |
##### Read-Only Query Functions
| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `nftRank` | `(uint256 tokenId)` | `NFTRank (0/1/2)` | NFT rank for given token ID |
| `nftRankCount` | `(NFTRank rank)` | `uint256` | Total NFT count per rank network-wide |
| `userNFTRankCount` | `(address, NFTRank)` | `uint256` | User's NFT count per rank |
| `bronzePrice` | None | `uint256` | Current Bronze NFT price |
| `silverPrice` | None | `uint256` | Current Silver NFT price |
| `goldPrice` | None | `uint256` | Current Gold NFT price |
| `withdrawalThreshold` | None | `uint256` | Current dynamic withdrawal threshold (total NFT value × 80%) |
| `getWithdrawableAmount` | None | `uint256` | Withdrawable CTK amount from NFT contract |
| `getNFTsByOwner` | `(address owner)` | `uint256[]` | All NFT token IDs owned by address |
| `getNFTRankCounts` | None | `(bronze, silver, gold)` | Network-wide NFT count by rank |
| `getNFTRankCountsByOwner` | `(address owner)` | `(bronze, silver, gold)` | User's NFT count by rank |
| `getUserNFTRankCount` | `(address user, uint8 rank)` | `uint256` | User's NFT count for specific rank (0=Bronze, 1=Silver, 2=Gold) |
| `balanceOf` | `(address owner)` | `uint256` | Standard ERC-721 NFT count query |
| `ownerOf` | `(uint256 tokenId)` | `address` | Standard ERC-721 NFT owner query |
| `tokenOfOwnerByIndex` | `(address owner, uint256 index)` | `uint256` | ERC-721Enumerable indexed token query |
| `totalSupply` | None | `uint256` | ERC-721Enumerable total NFT supply |
| `tokenByIndex` | `(uint256 index)` | `uint256` | ERC-721Enumerable indexed global token query |
| `isPaused` | None | `bool` | Whether the contract is paused |
##### Constants
| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_BALANCE_THRESHOLD` | 10,000 CTK | Minimum NFT contract CTK balance threshold |
| `NFT_POOL_INITIAL` | 2,000,000 CTK | Initial NFT pool injection amount |
| `CREATOR_POOL_RATIO` | 70 | Overflow distribution — creator pool ratio |
| `INTERACT_POOL_RATIO` | 30 | Overflow distribution — interaction pool ratio |
| `INITIAL_BRONZE_PRICE` | 1,000 CTK | Bronze NFT initial price |
| `INITIAL_SILVER_PRICE` | 5,000 CTK | Silver NFT initial price |
| `INITIAL_GOLD_PRICE` | 10,000 CTK | Gold NFT initial price |
### Getting Started
#### Prerequisites
- **Node.js** `^20.19.0` or `>=22.12.0`
- **MetaMask** browser extension (or compatible Web3 wallet)
- **Ethereum Sepolia Testnet** access (add Sepolia network to MetaMask and obtain test ETH from a faucet)
#### Installation
```bash
# Clone the repository
git clone <repository-url>
cd creatorcommunity
# Install dependencies
npm install
```
#### Local Development
```bash
# Start development server with hot reload
npm run dev
```
The app will be available at `http://localhost:5173/CreatorCommunity/`.
- Home: `http://localhost:5173/CreatorCommunity/`
- User Manual: `http://localhost:5173/CreatorCommunity/manual`
#### Production Build
```bash
# Build for production (minified)
npm run build
# Preview production build locally
npm run preview
```
#### Environment Variables (Optional)
Create a `.env` file in the project root to override default network settings:
```env
VITE_TARGET_CHAIN_ID=11155111
VITE_NETWORK_NAME=Sepolia Testnet
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
```
### Project Structure
```
creatorcommunity/
├── public/                      # Static assets
│   └── user-manual.md           # Built-in user manual (Markdown)
├── src/
│   ├── assets/                  # Global styles & Logo
│   │   ├── base.css
│   │   └── main.css
│   ├── components/              # Vue UI components
│   │   ├── HomeView.vue         # Home page view
│   │   ├── ManualView.vue       # User manual view
│   │   ├── WalletSection.vue    # Wallet connect/disconnect & network indicator
│   │   ├── DeploySection.vue    # Contract deployment panel
│   │   ├── RewardSection.vue    # Claim reward & CTK transfer
│   │   ├── PostSection.vue      # Post/comment reward actions & post list
│   │   ├── NFTSection.vue       # NFT mint, burn, transfer panel
│   │   ├── AdminSection.vue     # Owner-only admin controls
│   │   ├── ChainDataSection.vue # Sidebar: balance, cooldowns, NFT info
│   │   ├── TxHistorySection.vue # Transaction history log
│   │   ├── TransferSection.vue  # Asset transfer UI (CTK + NFT)
│   │   └── card.vue             # Generic card wrapper
│   ├── composables/             # Vue Composition API logic hooks
│   │   ├── useWallet.js         # Wallet connection, provider/signer, network check
│   │   ├── useTransaction.js    # Unified transaction state (pending/success/fail)
│   │   ├── useDeploy.js         # Contract deployment logic
│   │   ├── useContractAddress.js# Contract address management (per-chain)
│   │   ├── usePostList.js       # Post list fetching & caching
│   │   ├── useTxHistory.js      # Transaction history persistence
│   │   └── useDataStore.js      # Unified data cache & state management
│   ├── contracts/               # Contract ABI & bytecode
│   │   ├── CreatorToken_ABI.json
│   │   ├── CreatorNFT_ABI.json
│   │   ├── CreatorToken.sol     # Solidity source (reference)
│   │   ├── CreatorNFT.sol       # Solidity source (reference)
│   │   ├── CreatorToken_Bytecode
│   │   ├── CreatorNFT_Bytecode
│   │   └── index.js             # Contract factory & exports
│   ├── router/                  # Routing configuration
│   │   └── index.js             # Vue Router configuration
│   ├── utils/
│   │   ├── constants.js         # Token decimals, NFT rank constants
│   │   └── format.js            # Formatting utilities (amount, address, time)
│   ├── config.js                # Network configuration (env-aware)
│   ├── App.vue                  # Root application component (router container)
│   └── main.js                  # App entry point
├── .env.example                 # Environment variable template
├── index.html
├── package.json
└── vite.config.js               # Vite configuration (base: /CreatorCommunity)
```
### Architecture
```
User Browser (MetaMask)
        │
        ▼
  ethers.js BrowserProvider  ←─ Wallet signature for write tx
        │
        ├── Provider (read-only calls)
        └── Signer   (signed transactions)
                │
                ▼
        CreatorToken Contract  ──  ERC20 + reward pools
        CreatorNFT Contract    ──  ERC721 + tiered badges
                │
                ▼
        Ethereum Sepolia Network
```
- **Read-only calls**: Directly through `Provider`, no gas, no signature, results cached by `useDataStore`
- **Write transactions**: Through `Signer`, full lifecycle managed by `useTransaction` (estimate gas → pending → confirmed → block explorer link)
- **Data caching**: localStorage keyed by `chainId + tokenAddress + accountAddress` to avoid stale cross-chain data
### Web3 Notes
- **Wallet Required**: A Web3 wallet (e.g., MetaMask) must be installed and connected to interact with on-chain features
- **Network**: The app targets **Ethereum Sepolia Testnet** (Chain ID: `11155111`). If your wallet is on a different network, the app will prompt you to switch
- **Gas Fees**: All write operations (posting, commenting, minting, transferring, etc.) consume ETH as gas. Ensure your Sepolia wallet has test ETH
- **Irreversible**: Blockchain transactions cannot be undone. Please confirm details before signing
- **Security**: No private keys are stored in the frontend. All signing is handled by the user's wallet extension
### License
This project is for educational and demonstration purposes.
