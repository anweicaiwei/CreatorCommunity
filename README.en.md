# CreatorCommunity

[简体中文](./README.md) | **English**

Open-source repository: [anweicaiwei/CreatorCommunity](https://github.com/anweicaiwei/CreatorCommunity)

## Overview

`CreatorCommunity` is a Vue 3, Element Plus, and ethers.js v6 Web3 frontend that demonstrates a "creator rewards + NFT boost" community model. The app works with two contracts:

- `CreatorToken`: handles CTK reward recording, reward withdrawals, post/comment incentives, and admin pool payouts
- `CreatorNFT`: handles Bronze / Silver / Gold NFT minting, burn refunds, price adjustment, and NFT contract balance management

The current frontend is built around operability, observability, and recovery. It focuses on wallet connection, contract deployment, on-chain reads, local caching, reward flows, NFT actions, and admin operations.

## System Structure

### Routes

- `/CreatorCommunity/`
  - Main page, orchestrated by `App.vue`
  - `HomeView.vue` is presentation-only and receives state/events via `inject()`
- `/CreatorCommunity/manual`
  - Redirects to `/CreatorCommunity/manual-zh` or `/CreatorCommunity/manual-en` based on the active locale
- `/CreatorCommunity/manual-zh`
  - Loads `public/user-manual.zh.md`
- `/CreatorCommunity/manual-en`
  - Loads `public/user-manual.en.md`

### Main Page Modules

These are the modules actually mounted on the main page, in the same order users see them:

1. Wallet and contract status
   - Connect / disconnect MetaMask
   - Validate the target network
   - Show wallet address, connected duration, and block explorer link
   - Trigger deployment and display saved contract addresses
   - Let the owner enable or disable transfer entry points
2. Reward module
   - Claim initial reward
   - Withdraw pending post / comment / initial / all rewards
   - Execute CTK transfers when the owner has enabled transfers
3. Post interaction module
   - Record post rewards
   - Refresh the post list
   - Record comment rewards for a selected post
4. NFT module
   - Mint Bronze / Silver / Gold NFTs
   - Burn NFTs and refund CTK by contract rules
   - Execute NFT transfer when the owner has enabled transfers
5. Admin module
   - Query pool usage and NFT contract balances
   - Send rewards from creator / interaction pools
   - Reset prices or trigger random price adjustment
   - Withdraw withdrawable CTK, all withdrawable CTK, or overflow CTK from the NFT contract
6. Sidebar
   - On-chain data overview
   - Transaction history

### Primary Flow

```text
Wallet connection and network validation
-> contract deployment or local address restore
-> on-chain reads and local cache load
-> reward recording (post / comment / initial reward)
-> withdrawal into CTK balance
-> NFT minting for reward boosts
-> continued participation or admin fund operations
```

## Frontend Capabilities Implemented Today

### Wallet, network, and deployment

- Connects through `ethers.BrowserProvider(window.ethereum)`
- Auto-restores already authorized accounts
- Supports switching to the `.env` target chain, Sepolia `11155111` by default
- Deploys `CreatorToken` from the frontend
- Reads and saves the `CreatorNFT` address via `creatorNFT()` after deployment
- Saves contract addresses per chain and restores them after refresh

### On-chain data and caching

- Reads CTK balance, initial-claim status, post/comment cooldowns, NFT boost, NFT prices, owned NFTs, and pending rewards
- Reads admin pool status and NFT contract withdrawable balance
- Locally caches user data, post list, pool data, transaction history, and UI settings
- Restores local post/comment countdown display after refresh

### Rewards and interaction

- `claimInitialReward`
- `rewardPost`
- `rewardComment`
- `withdrawPostRewards`
- `withdrawCommentRewards`
- `withdrawInitialReward`
- `withdrawAllRewards`

Important: `claimInitialReward`, `rewardPost`, and `rewardComment` only record pending rewards. They do not immediately increase the wallet CTK balance. The frontend exposes separate withdrawal actions for that second step.

### NFT

- `mintBronzeNFT`
- `mintSilverNFT`
- `mintGoldNFT`
- `burnNFTForRefund`
- `transferFrom` for NFT transfers, gated by the owner-controlled transfer toggle

### Admin actions

- `sendCreatorReward`
- `sendInteractReward`
- `resetNFTPrice`
- `randomlyAdjustNFTPrice`
- `withdrawCTK`
- `withdrawAllCTK`
- `withdrawOverflow`

### Docs and bilingual support

- Chinese and English README variants
- Chinese and English in-app manuals
- The manual page loads these source files at runtime:
  - `public/user-manual.zh.md`
  - `public/user-manual.en.md`

## Contract Surface vs Frontend Surface

### Write actions wired into the UI

| Contract | Exposed in the frontend |
| --- | --- |
| `CreatorToken` | `claimInitialReward`, `rewardPost`, `rewardComment`, `withdrawPostRewards`, `withdrawCommentRewards`, `withdrawInitialReward`, `withdrawAllRewards`, `transfer`, `sendCreatorReward`, `sendInteractReward` |
| `CreatorNFT` | `mintBronzeNFT`, `mintSilverNFT`, `mintGoldNFT`, `burnNFTForRefund`, `transferFrom`, `resetNFTPrice`, `randomlyAdjustNFTPrice`, `withdrawCTK`, `withdrawAllCTK`, `withdrawOverflow` |

### Methods present in contracts but not directly exposed in the UI

| Contract | Methods |
| --- | --- |
| `CreatorToken` | `batchSendReward`, `withdrawTokens`, `destroyContract` |
| `CreatorNFT` | `recoverCTK` |

The README now reflects the actual frontend scope instead of describing the UI as if it covered the full contract surface.

### Key read-only logic used by the frontend

- `CreatorToken`
  - `balanceOf`
  - `hasClaimedInitialReward`
  - `lastPostTime`
  - `POST_INTERVAL`
  - `lastCommentTime`
  - `COMMENT_INTERVAL`
  - `calculateNFTBoost`
  - `getPendingRewards`
  - `postIdCounter`
  - `postAuthor`
  - `CREATOR_POOL`
  - `INTERACT_POOL`
  - `creatorPoolUsed`
  - `interactPoolUsed`
- `CreatorNFT`
  - `bronzePrice`
  - `silverPrice`
  - `goldPrice`
  - `balanceOf`
  - `getNFTsByOwner`
  - `nftRank`
  - `NFT_POOL`
  - `nftPoolUsed`
  - `getWithdrawableAmount`

## Architecture and Data Flow

### Frontend architecture

- `App.vue`
  - the only orchestration layer
  - composes all business composables
  - owns write flows, notifications, refreshes, and cache persistence
  - distributes state and events via `provide()`
- Child components
  - presentation-only
  - communicate through `props` and `emit`
  - do not import business composables directly

### Contract instance model

Each contract exists in two forms:

- `tokenContractRead` / `nftContractRead`
  - provider-backed
  - used for reads
- `tokenContractWrite` / `nftContractWrite`
  - signer-backed
  - used for transactions

These instances are stored with `shallowRef` to avoid Vue deep-reactivity issues on contract objects.

### Transaction pipeline

All frontend writes flow through:

1. `useTransaction().execute(fn)`
2. `doWrite(...)` inside `App.vue`

Together they handle:

- pending / success / error state
- block explorer links
- error mapping
- local transaction history
- read refresh after writes

### Cache and local persistence

The current implementation uses these key patterns:

- Contract addresses
  - `creatorcommunity_${chainId}_token_address`
  - `creatorcommunity_${chainId}_nft_address`
- Active chain
  - `creatorcommunity_current_chainId`
- Unified data cache
  - `creatorcommunity_${chainId}_${tokenAddr}`
- Cooldown cache
  - `creatorcommunity_${chainId}_${account}_cooldown_post`
  - `creatorcommunity_${chainId}_${account}_cooldown_comment`
- Dark mode
  - `creatorcommunity-dark-mode`

Inside the unified cache, the app stores:

- `userData_${account}`
- `pools`
- `txHistory`
- `posts`
- `settings`

### Important behavior limits

- Transfer forms are not always visible. CTK and NFT transfer entry points only appear after the owner enables the transfer toggle.
- Disconnecting the wallet does not delete saved contract addresses. Disconnect is not the same as resetting deployment state.
- Switching networks requires address records for that chain. If none exist, the app falls back to the undeployed state.
- The app currently uses transaction history stored in `useDataStore`; the separate `useTxHistory.js` composable is still in the repo but is not wired into the main flow.

## Getting Started

### Requirements

- Node.js `^20.19.0 || >=22.12.0`
- MetaMask or another wallet that injects `window.ethereum`
- Sepolia test ETH

### Install dependencies

```bash
git clone https://github.com/anweicaiwei/CreatorCommunity.git
cd creatorcommunity
npm install
```

### Local development

```bash
npm run dev
```

Default URLs:

- Home: `http://localhost:5173/CreatorCommunity/`
- Manual: `http://localhost:5173/CreatorCommunity/manual`

### Production build

```bash
npm run build
npm run preview
```

### Environment variables

```env
VITE_TARGET_CHAIN_ID=11155111
VITE_NETWORK_NAME=Sepolia Testnet
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
```

## Key Paths

```text
src/
  App.vue                    # sole orchestration layer
  main.js                    # app entry
  router/index.js            # /CreatorCommunity route config
  components/
    HomeView.vue             # main-page presentation layer
    ManualView.vue           # manual-page presentation layer
    WalletSection.vue        # wallet, deployment, transfer toggle
    RewardSection.vue        # reward recording and withdrawals
    PostSection.vue          # post and comment rewards
    NFTSection.vue           # NFT mint, burn, transfer
    AdminSection.vue         # admin panel
    ChainDataSection.vue     # on-chain overview
    TxHistorySection.vue     # transaction history
  composables/
    useWallet.js
    useDeploy.js
    useTransaction.js
    useContractAddress.js
    useDataStore.js
  contracts/
    CreatorToken.sol
    CreatorNFT.sol
    CreatorToken_ABI.json
    CreatorNFT_ABI.json
    CreatorToken_Bytecode
    CreatorNFT_Bytecode
public/
  user-manual.zh.md          # Chinese manual source
  user-manual.en.md          # English manual source
README.md
README.en.md
```

## Review Focus

If you are reviewing or demoing this project, prioritize these implementation facts:

1. Rewards use a two-step "record first, withdraw later" model
2. `App.vue` is the only business coordinator and child components are largely presentation-only
3. Contract addresses, caches, and cooldown display are restored locally
4. Admin and regular users share the same page, with visibility gated by ownership and toggles
5. The manual page loads `public/user-manual.*.md` at runtime instead of hardcoding the content

## License

There is no standalone license file in the repository. Add an explicit license before redistributing or publishing the project.
