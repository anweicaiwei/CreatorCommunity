# CreatorCommunity User Manual

[中文](./user-manual.zh.md) | **English**

> This manual reflects the current frontend implementation. It explains what you can actually do in the UI and what each action does.

Open-source repository: [anweicaiwei/CreatorCommunity](https://github.com/anweicaiwei/CreatorCommunity)

## Table of Contents

- [1. Project and page structure](#1-project-and-page-structure)
- [2. Quick start](#2-quick-start)
- [3. Feature guide](#3-feature-guide)
- [4. Admin workflow](#4-admin-workflow)
- [5. Data, cache, and limits](#5-data-cache-and-limits)
- [6. FAQ](#6-faq)

## 1. Project and page structure

`CreatorCommunity` is a Web3 frontend for a "create to earn rewards, then mint NFT badges to increase returns" flow.

### Entry points

- Home: `/CreatorCommunity/`
- Manual landing route: `/CreatorCommunity/manual`
- Chinese manual: `/CreatorCommunity/manual-zh`
- English manual: `/CreatorCommunity/manual-en`

### Main page sections

You will see these sections on the home page:

1. Wallet and contract status
   - Connect wallet
   - Validate network
   - View the current address, block explorer link, and connected duration
   - Deploy or view CTK / NFT contract addresses on the current chain
2. Reward section
   - Claim the initial reward
   - Withdraw post, comment, initial, or all pending rewards
   - Send CTK only when the owner has enabled transfers
3. Post interaction section
   - Record a post reward
   - View the post list
   - Record a comment reward for a selected post
4. NFT section
   - Mint Bronze / Silver / Gold NFTs
   - Burn NFTs for refunds
   - Transfer NFTs only when the owner has enabled transfers
5. Admin section
   - View pools and NFT contract balances
   - Send rewards
   - Adjust NFT prices
   - Withdraw CTK from the NFT contract
6. Right sidebar
   - On-chain data overview
   - Transaction history

## 2. Quick start

### 2.1 Prepare the environment

Before using the app, you need:

- MetaMask or another wallet that injects `window.ethereum`
- Sepolia selected as the active network
- A small amount of Sepolia test ETH for gas

Default network config:

- Chain ID: `11155111`
- Network name: `Sepolia Testnet`
- RPC: `https://ethereum-sepolia-rpc.publicnode.com`
- Explorer: `https://sepolia.etherscan.io`

### 2.2 Connect a wallet

1. Open the home page
2. Click the wallet connect button
3. Confirm authorization in MetaMask
4. After the connection succeeds, the page shows:
   - Wallet address
   - Current network
   - Whether contracts are deployed
   - Block explorer address link

If the current network is not the target network, the page will prompt you to switch.

### 2.3 First deployment or address restore

The app does not ship with hardcoded contract addresses. You deploy them per chain.

1. Connect your wallet and inspect the contract status area
2. If the app shows an undeployed state, click the deploy button
3. The frontend deploys `CreatorToken`
4. After deployment, the frontend reads `creatorNFT()` and saves the NFT contract address automatically
5. After a refresh, both addresses are restored from local storage

Notes:

- Addresses are stored per chain
- If you switch to another chain with no saved addresses, the app returns to the undeployed state
- Disconnecting the wallet does not delete saved addresses

### 2.4 Suggested first run

Use this order to experience the full flow:

1. Connect your wallet and verify the network
2. Deploy contracts or restore existing addresses
3. Claim the initial reward
4. Withdraw the initial reward so CTK reaches your wallet balance
5. Record one post reward
6. Record one comment reward from the post list
7. Withdraw pending rewards
8. Mint an NFT after accumulating enough CTK

## 3. Feature guide

### 3.1 On-chain data panel

The sidebar data panel shows:

- CTK balance
- Initial reward claim status
- Post cooldown
- Comment cooldown
- NFT boost
- Current Bronze / Silver / Gold prices
- Total NFT count
- Owned NFT counts by tier
- Pending rewards by type

When you refresh, the app reads fresh data from the chain.  
If local cache exists, the UI can display cached data first and then refresh when needed.

### 3.2 Initial reward

Each address can claim the initial reward only once.

Steps:

1. Click the initial reward claim button
2. Confirm the transaction in your wallet
3. After success, the reward moves into pending initial rewards

Important:

- This step only records the reward
- To move CTK into your wallet balance, you must also click the initial reward withdrawal button

### 3.3 Post reward

Steps:

1. Click the post reward button
2. Confirm the transaction in your wallet
3. After success, the app records a new post ID
4. The corresponding reward moves into pending post rewards

Behavior to know:

- Post rewards have a 5-minute cooldown
- You cannot record another post reward before the cooldown ends
- The page shows a countdown
- The countdown is cached locally and restored after refresh

### 3.4 Comment reward

The post list is built from on-chain `postIdCounter` and `postAuthor` data.

How to use it:

1. Open the post list
2. Pick a post
3. Click the comment reward action next to that post
4. Confirm the transaction in your wallet

Comment reward behavior:

- Both the commenter and the post author receive reward records
- The rewards become pending rewards first, not immediate wallet balance
- Comment rewards have a 30-second cooldown

### 3.5 Reward withdrawal

The reward section exposes four withdrawal actions:

- Withdraw post rewards
- Withdraw comment rewards
- Withdraw initial reward
- Withdraw all rewards at once

This is the most important behavior in the app:

- `claimInitialReward`, `rewardPost`, and `rewardComment` only record pending rewards
- Only the matching `withdraw*` transaction moves CTK into your wallet balance

If you already "got the reward" but your CTK balance did not change, inspect the pending reward fields first and then run the withdrawal step.

### 3.6 CTK transfer

CTK transfer is not always available.

The CTK transfer form only appears after the owner enables the transfer feature in the UI.  
If you do not see the CTK transfer entry point, that usually means it is currently disabled.

### 3.7 NFT minting

The app supports three NFT tiers:

- Bronze
- Silver
- Gold

Before minting, the frontend checks whether your CTK balance is sufficient.  
After a successful mint, the page refreshes:

- CTK balance
- NFT count
- NFT boost
- Your owned NFT lists by tier

NFT boost rules:

- Bronze: `0.5%` per NFT
- Silver: `2%` per NFT
- Gold: `12%` per NFT

The frontend shows both:

- The theoretical total boost
- The actual NFT boost returned by the contract

### 3.8 NFT burn and refund

You can burn a specific NFT directly from the owned NFT list.

Before sending the transaction, the frontend checks:

- Whether the NFT exists
- Whether the current address owns that NFT

After a successful burn:

- The NFT is removed
- CTK is refunded according to the contract rule of 80% of the mint price
- The page refreshes NFT counts, boost, and CTK balance

### 3.9 NFT transfer

Like CTK transfer, NFT transfer is gated by the owner-controlled transfer toggle.  
The transfer form only appears at the bottom of the NFT section when transfers are enabled.

The form requires:

- Receiver address
- NFT token ID

### 3.10 Transaction history

Every write transaction triggered from the page is saved into local transaction history, including:

- Transaction type
- Transaction hash
- Timestamp
- Block explorer link

This history is local cache, not a chain indexer result.  
Clearing it only removes the local records and does not affect on-chain transactions.

## 4. Admin workflow

The admin section only appears when `CreatorToken.owner()` matches the current wallet address.

The frontend admin actions are:

### 4.1 Pool inspection

The owner can inspect:

- Creator pool remaining / total
- Interaction pool remaining / total
- NFT pool remaining / total
- Current CTK balance of the NFT contract
- Withdrawable CTK
- Overflow CTK

### 4.2 Reward distribution

The owner can:

- Send rewards from the creator pool to any address
- Send rewards from the interaction pool to any address

The current frontend does not expose batch reward entry points, even though the contract includes `batchSendReward`.

### 4.3 NFT price management

The owner can:

- Reset NFT prices
- Randomly adjust NFT prices

Price changes affect future mint and refund logic. They do not change ownership of already minted NFTs.

### 4.4 Withdraw CTK from the NFT contract

The owner can perform three NFT-contract withdrawal actions:

- Withdraw a specific CTK amount
- Withdraw all withdrawable CTK
- Withdraw overflow CTK

The current frontend does not expose:

- `CreatorToken.withdrawTokens`
- `CreatorToken.destroyContract`
- `CreatorNFT.recoverCTK`

Those methods exist in the contracts but are not part of the current UI.

### 4.5 Transfer feature toggle

The owner can toggle the transfer feature.

That toggle controls whether regular users can see:

- The CTK transfer form
- The NFT transfer form

This is a frontend visibility control. It does not remove the underlying ERC-20 or ERC-721 transfer ability from the contracts themselves.

## 5. Data, cache, and limits

### 5.1 Local cache

The app stores several categories of data in `localStorage`:

- Contract addresses
- Active chain
- User on-chain snapshots
- Pool data
- Post list
- Transaction history
- Transfer toggle state
- Dark mode preference
- Post / comment cooldown end timestamps

### 5.2 Address and cache isolation by chain

The current implementation isolates cache by chain and contract address.  
In practice, that means:

- Address records on different chains do not overwrite each other
- User cache on different chains does not overwrite each other
- Different wallet addresses on the same chain/contract scope are also stored separately

### 5.3 Cooldown restoration

Post and comment cooldown end times are cached separately.  
If you refresh the page, the countdown does not restart from zero. The UI restores it from local cache.

### 5.4 Disconnect does not mean reset deployment

When you disconnect the wallet:

- The page clears the current user-state view
- The app does not delete saved contract addresses for the current chain

So when you reconnect on the same chain, the app can still restore previously deployed addresses.

### 5.5 Limits you may notice

- Transfer forms may be hidden by default
- Some contract methods exist without matching frontend buttons
- The post list only displays chain-readable post IDs and authors, not post body content
- Transaction history only includes write actions triggered through this frontend

## 6. FAQ

### 1. I already clicked a reward action. Why did my CTK balance not change?

Because rewards use a two-step flow:

1. Record a pending reward
2. Withdraw it into the wallet balance

### 2. Why can't I see the CTK transfer or NFT transfer form?

Because both forms are controlled by the owner's transfer toggle.  
If they are hidden, the feature is usually disabled right now.

### 3. Why do contract addresses still appear after refresh?

Because contract addresses are cached locally per chain.  
Refresh does not clear them, and disconnect does not clear them either.

### 4. Why does the app show an undeployed state after I switch networks?

Because addresses are stored per chain.  
If the new chain has no saved addresses, the app treats it as a fresh deployment environment.

### 5. Why does the post list only show post IDs and authors?

Because the current frontend only reads the post ID and author address values that are directly available from the chain. There is no post-body storage in the current implementation.

### 6. Do admin and regular users use different pages?

No.  
They use the same home page. When the current address is recognized as the owner, the app reveals the admin-only section and extra controls.
