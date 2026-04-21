# CreatorCommunity

**中文** | [English](#english-version)

## 项目概述

**CreatorCommunity** 是一个基于以太坊的去中心化创作者社区平台，通过 **CTK Token** 与 **CMN NFT 勋章** 的双代币经济模型，构建"创作 → 获取奖励 → 升级勋章 → 更高增益 → 持续创作"的激励机制闭环。

### 代币与 NFT 流转逻辑

```
               发帖 / 评论
          ┌─────────────────────┐
          │   获取 CTK 奖励      │
          │  (基础奖励 + NFT增益)│
          └─────────┬───────────┘
                    │ 累积 CTK
                    ▼
          ┌─────────────────────┐
          │   用 CTK 铸造 NFT    │
          │  青铜(1000)/白银    │
          │  (5000)/黄金(10000) │
          └─────────┬───────────┘
                    │ 持有 NFT
                    ▼
          ┌─────────────────────┐
          │   NFT 增益生效       │
          │  发帖/评论奖励提升   │
          │  (最多可叠加至50%)   │
          └─────────┬───────────┘
                    │ 更多 CTK
                    ▼
          ┌─────────────────────┐
          │   循环：铸造更多 NFT │
          │   或销毁 NFT 变现    │
          └─────────────────────┘
```

### 社区激励机制

1. **创作即挖矿**：用户发帖可获得 CTK 奖励（基础 2 CTK/次，5 分钟冷却），评论可同时让评论者和帖子作者获得 CTK（基础各 0.1 CTK/次，30 秒冷却）。通过链上记录行为，将内容创作转化为可量化的代币收益。

2. **勋章增益（NFT 越多，收益越大）**：用户持有的 NFT 勋章数量直接影响发帖和评论的奖励额度。每枚青铜 NFT 提供 0.5% 增益、白银 2%、黄金 12%，增益可累加（上限 50%）。例如：持有 5 枚黄金 NFT 的用户，发帖奖励可提升 50%（2 CTK → 3 CTK）。这鼓励用户持续投入、升级自己的勋章组合。

3. **代币 ↔ 勋章双向兑换**：用户累积的 CTK 可用于铸造三种等级的 NFT 勋章，形成代币消耗通路；同时 NFT 可销毁并返还 80% 铸造时价格的 CTK，形成回流机制。代币和 NFT 之间形成完整的流通闭环。

4. **NFT 价格波动机制**：管理员可通过 `randomlyAdjustNFTPrice` 函数随机调整 NFT 价格（±10%，受 50%-150% 初始价格区间约束）。这意味着用户可以在价格低位时铸造 NFT，待价格上涨后销毁，返还的 CTK 可能 **超过** 当初铸造时的成本，从而产生类似"投资获利"的正向预期，进一步激励用户参与。

5. **四池分配，可持续激励**：CTK 总量 1000 万枚，分为创作者池（400 万）、互动池（200 万）、NFT 池（200 万）、创始人池（200 万）。创作者池用于发帖奖励发放，互动池用于评论奖励和初始奖励，NFT 池用于 NFT 铸造的代币流通。各池额度独立追踪，防止单一通道过度消耗。

> 一个完整的 Web3 dApp，涵盖钱包连接、智能合约交互、含冷却时间的奖励机制以及 NFT 等级徽章系统。

## 功能特性

- **初始奖励领取** — 每个新地址可领取 1 CTK 初始奖励（仅一次）(`claimInitialReward`)
- **发帖奖励** — 发帖获取 CTK 奖励，含 5 分钟冷却时间 (`rewardPost`)
- **评论奖励** — 评论获取 CTK 奖励，评论者和帖子作者双方均可获得奖励，含 30 秒冷却时间 (`rewardComment`)
- **Token 余额** — 实时查询并展示 CTK 余额
- **NFT 徽章** — 使用 CTK 铸造三个等级的 NFT（青铜 / 白银 / 黄金），提供奖励倍率加成
- **NFT 销毁退款** — 销毁 NFT 可返还 80% 铸造成本的 CTK
- **管理员控制** — 创作者池 / 互动池奖励发放、批量发放、NFT 价格管理、溢出 CTK 提取
- **合约部署** — 从前端界面直接部署 CreatorToken 和 CreatorNFT 合约
- **交易历史** — 本地缓存交易记录，并提供区块浏览器跳转链接
- **数据缓存** — 按链 ID + 合约地址 + 账户地址智能缓存链上只读数据、帖子列表和交易历史

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Vue 3](https://cn.vuejs.org/)（Composition API + `<script setup>`） |
| 构建工具 | [Vite 8](https://cn.vite.dev/) |
| Web3 库 | [ethers.js v6](https://docs.ethers.org/v6/) |
| UI 库 | [Element Plus](https://element-plus.org/zh-CN/) |
| 钱包 | MetaMask（BrowserProvider） |
| 网络 | 以太坊 Sepolia 测试网（Chain ID: 11155111） |

## 智能合约

本项目与两个智能合约交互：

### CreatorToken（ERC-20，符号：CTK，总量 10,000,000）

具有四池分配机制（创作者池 40%、互动池 20%、NFT 池 20%、创始人池 20%）的 ERC-20 代币。

> 以下列出合约全部函数。部分函数已由前端调用，其余函数预实现但未在前端使用，开发者可自行修改前端代码进行调用。

#### 管理员函数（仅合约 owner 可调用）

| 函数 | 参数 | 说明 |
|------|------|------|
| `sendCreatorReward` | `(address to, uint256 amount)` | 从创作者池向指定地址发放 CTK 奖励 |
| `sendInteractReward` | `(address to, uint256 amount)` | 从互动池向指定地址发放 CTK 奖励 |
| `batchSendReward` | `(address[] tos, uint256[] amounts)` | 批量从创作者池发放奖励，上限 100 条 |
| `withdrawTokens` | `(uint256 amount)` | 管理员提取代币，按 70% 创作者池 + 30% 互动池比例扣除额度 |
| `destroyContract` | 无 | 永久停用合约：回收 NFT 合约中的 CTK 余额至 owner，设置 `isPaused = true` |

#### 社区互动函数（发帖 / 评论奖励，记账模式）

采用"先记账、后提现"模式：调用 `rewardPost` / `rewardComment` / `claimInitialReward` 仅记录待领取奖励，需调用对应 `withdraw*` 函数才能将 CTK 转入钱包余额。

| 函数 | 参数 | 说明 |
|------|------|------|
| `rewardPost` | 无 | 发帖获取 CTK 奖励（基础 2 CTK + NFT 增益），5 分钟冷却，返回 `postId` |
| `rewardComment` | `(address author, uint256 postId)` | 评论获取奖励，评论者和帖子作者双方均获得 CTK（基础各 0.1 CTK + NFT 增益），30 秒冷却 |
| `claimInitialReward` | 无 | 领取初始奖励（1 CTK），每地址仅限一次 |

#### 奖励提现函数

| 函数 | 参数 | 说明 |
|------|------|------|
| `withdrawPostRewards` | 无 | 提取当前地址所有待领取的发帖奖励 |
| `withdrawCommentRewards` | 无 | 提取当前地址所有待领取的评论奖励 |
| `withdrawInitialReward` | 无 | 提取当前地址待领取的初始奖励 |
| `withdrawAllRewards` | 无 | 一键提取所有类型的待领取奖励（发帖 + 评论 + 初始） |

#### NFT 合约互操作函数（合约间调用）

这些函数仅供 `CreatorNFT` 合约调用，用于两合约间的 CTK 流转与池额度同步。

| 函数 | 参数 | 说明 |
|------|------|------|
| `nftPoolTransfer` | `(address to, uint256 amount)` | 从 NFT 池向指定地址转出 CTK（仅 owner） |
| `transferFromUserForNFT` | `(address from, uint256 amount)` | 从用户地址向 NFT 合约转入 CTK（仅 NFT 合约可调用） |
| `receiveFromNFTToCreatorPool` | `(uint256 amount)` | 接收 NFT 合约退回的 CTK，减少创作者池已用额度（仅 NFT 合约可调用） |
| `receiveFromNFTToInteractPool` | `(uint256 amount)` | 接收 NFT 合约退回的 CTK，减少互动池已用额度（仅 NFT 合约可调用） |
| `transferFromCreatorPoolToNFT` | `(uint256 amount)` | 从创作者池向 NFT 合约转入 CTK（仅 NFT 合约可调用，用于 NFT 销毁退款时补充流动性） |
| `transferFromInteractPoolToNFT` | `(uint256 amount)` | 从互动池向 NFT 合约转入 CTK（仅 NFT 合约可调用） |

#### 只读查询函数

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `balanceOf` | `(address)` | `uint256` | 标准 ERC-20 余额查询 |
| `hasClaimedInitialReward` | `(address)` | `bool` | 是否已领取初始奖励 |
| `lastPostTime` | `(address)` | `uint256` | 用户上次发帖时间戳 |
| `lastCommentTime` | `(address)` | `uint256` | 用户上次评论时间戳 |
| `calculateNFTBoost` | `(address user)` | `uint256` | NFT 奖励增益百分比（上限 50%） |
| `calculatePostCap` | `(address user)` | `uint256` | 考虑 NFT 增益后的发帖奖励上限 |
| `calculateCommentCap` | `(address user)` | `uint256` | 考虑 NFT 增益后的评论奖励上限 |
| `getPendingRewards` | `(address user)` | `(post, comment, initial, total)` | 查询用户各类型待领取奖励及总额 |
| `getAuthorByPostId` | `(uint256 postId)` | `address` | 根据帖子 ID 查询作者地址 |
| `postAuthor` | `(uint256)` | `address` | 帖子 ID → 作者地址映射（公开只读） |
| `postIdCounter` | 无 | `uint256` | 帖子 ID 自增计数器 |
| `creatorPoolUsed` | 无 | `uint256` | 创作者池已发放总额 |
| `interactPoolUsed` | 无 | `uint256` | 互动池已发放总额 |
| `nftPoolUsed` | 无 | `uint256` | NFT 池已转出总额 |
| `isPaused` | 无 | `bool` | 合约是否处于暂停状态 |

#### 常量参数

| 常量 | 值 | 说明 |
|------|------|------|
| `TOTAL_SUPPLY` | 10,000,000 CTK | 代币总供应量 |
| `CREATOR_POOL` | 4,000,000 CTK | 创作者激励池总量 |
| `INTERACT_POOL` | 2,000,000 CTK | 互动激励池总量 |
| `NFT_POOL` | 2,000,000 CTK | NFT 兑换池总量 |
| `FOUNDER_POOL` | 2,000,000 CTK | 创始人池总量 |
| `INITIAL_REWARD` | 1 CTK | 新用户初始奖励 |
| `POST_REWARD` | 2 CTK | 发帖基础奖励 |
| `COMMENT_REWARD` | 0.1 CTK | 评论基础奖励 |
| `POST_INTERVAL` | 300 秒 | 发帖冷却时间 |
| `COMMENT_INTERVAL` | 30 秒 | 评论冷却时间 |
| `POST_COMMENT_REWARD_CAP` | 3 CTK | 单帖子评论奖励总上限 |
| `USER_COMMENT_REWARD_CAP` | 0.5 CTK | 单用户对单帖子评论奖励上限 |
| `MAX_BOOST_RATE` | 50% | NFT 增益上限 |
| `MAX_POST_REWARD` | 10 CTK | 发帖奖励绝对上限 |
| `MAX_COMMENT_REWARD` | 2 CTK | 评论奖励绝对上限 |

### CreatorNFT（ERC-721，符号：CMN）

三等级 NFT 徽章系统：青铜（BRONZE）、白银（SILVER）、黄金（GOLD）。继承 OpenZeppelin 的 `ERC721Enumerable` 和 `ERC721Burnable`。

> 以下列出合约全部函数。部分函数已由前端调用，其余函数预实现但未在前端使用，开发者可自行修改前端代码进行调用。

#### NFT 铸造函数

| 函数 | 参数 | 说明 |
|------|------|------|
| `mintBronzeNFT` | 无 | 铸造青铜 NFT（消耗 CTK，初始价格 1000 CTK） |
| `mintSilverNFT` | 无 | 铸造白银 NFT（消耗 CTK，初始价格 5000 CTK） |
| `mintGoldNFT` | 无 | 铸造黄金 NFT（消耗 CTK，初始价格 10000 CTK） |

内部流程：检查用户 CTK 余额 → 从用户账户转 CTK 到 NFT 合约 → 铸造 NFT → 更新动态提取阈值 → 处理溢出 CTK（超过 200 万 CTK 的部分按比例返还给 CreatorToken 的两个池）。

#### NFT 销毁函数

| 函数 | 参数 | 说明 |
|------|------|------|
| `burnNFTForRefund` | `(uint256 tokenId)` | 销毁指定 NFT，返还 80% 铸造价格的 CTK；若 NFT 合约余额不足，自动从 CreatorToken 的创作者池和互动池补充流动性 |
| `burn` | `(uint256 tokenId)` | 标准 ERC721Burnable 销毁（无 CTK 退款，仅销毁 NFT） |

#### NFT 转移函数

| 函数 | 参数 | 说明 |
|------|------|------|
| `transferFrom` | `(address from, address to, uint256 tokenId)` | 标准 ERC721 转移，自动更新双方 NFT 等级计数 |
| `safeTransferFrom` | `(address from, address to, uint256 tokenId, bytes data)` | 安全转移（含附加数据），自动更新双方 NFT 等级计数 |

#### CTK 提取与溢出处理（管理员）

| 函数 | 参数 | 说明 |
|------|------|------|
| `withdrawCTK` | 无 | 提取 NFT 合约中超出阈值的 CTK 余额，按 70% 创作者池 + 30% 互动池比例返还给 CreatorToken |
| `recoverCTK` | 无 | 回收 NFT 合约全部 CTK 余额至 CreatorToken 合约，设置 `isPaused = true`（永久停用） |
| `checkAndHandleOverflow` | 内部函数 | 当 NFT 合约 CTK 余额超过 200 万（NFT_POOL_INITIAL）时，自动将溢出部分按 70/30 比例返还给 CreatorToken 的创作者池和互动池 |

#### NFT 价格管理（管理员）

| 函数 | 参数 | 说明 |
|------|------|------|
| `randomlyAdjustNFTPrice` | 无 | 随机调整三种 NFT 价格（±10%），受初始值 50%-150% 区间和等级价格关系约束 |
| `resetNFTPrice` | 无 | 重置三种 NFT 价格为初始值（青铜 1000 / 白银 5000 / 黄金 10000 CTK） |

#### 只读查询函数

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `nftRank` | `(uint256 tokenId)` | `NFTRank (0/1/2)` | 查询指定 NFT 的等级 |
| `nftRankCount` | `(NFTRank rank)` | `uint256` | 全网各等级 NFT 总数量 |
| `userNFTRankCount` | `(address, NFTRank)` | `uint256` | 指定用户持有各等级 NFT 数量 |
| `bronzePrice` | 无 | `uint256` | 当前青铜 NFT 价格 |
| `silverPrice` | 无 | `uint256` | 当前白银 NFT 价格 |
| `goldPrice` | 无 | `uint256` | 当前黄金 NFT 价格 |
| `withdrawalThreshold` | 无 | `uint256` | 当前动态提取阈值（所有 NFT 价值 × 80%） |
| `getWithdrawableAmount` | 无 | `uint256` | NFT 合约中可提取的 CTK 数量 |
| `getNFTsByOwner` | `(address owner)` | `uint256[]` | 获取指定用户所有 NFT 的 token ID 列表 |
| `getNFTRankCounts` | 无 | `(bronze, silver, gold)` | 全网各等级 NFT 数量统计 |
| `getNFTRankCountsByOwner` | `(address owner)` | `(bronze, silver, gold)` | 指定用户各等级 NFT 数量统计 |
| `getUserNFTRankCount` | `(address user, uint8 rank)` | `uint256` | 指定用户指定等级 NFT 数量（rank: 0=青铜, 1=白银, 2=黄金） |
| `balanceOf` | `(address owner)` | `uint256` | 标准 ERC-721 查询用户 NFT 持有数量 |
| `ownerOf` | `(uint256 tokenId)` | `address` | 标准 ERC-721 查询 NFT 持有者地址 |
| `tokenOfOwnerByIndex` | `(address owner, uint256 index)` | `uint256` | ERC-721Enumerable 按索引查询用户 NFT |
| `totalSupply` | 无 | `uint256` | ERC-721Enumerable 全网 NFT 总供应量 |
| `tokenByIndex` | `(uint256 index)` | `uint256` | ERC-721Enumerable 按索引查询全网 NFT |
| `isPaused` | 无 | `bool` | 合约是否处于暂停状态 |

#### 常量参数

| 常量 | 值 | 说明 |
|------|------|------|
| `MIN_BALANCE_THRESHOLD` | 10,000 CTK | 合约最低 CTK 余额阈值 |
| `NFT_POOL_INITIAL` | 2,000,000 CTK | NFT 池初始注入金额 |
| `CREATOR_POOL_RATIO` | 70 | 溢出分配比例 — 创作者池占比 |
| `INTERACT_POOL_RATIO` | 30 | 溢出分配比例 — 互动池占比 |
| `INITIAL_BRONZE_PRICE` | 1,000 CTK | 青铜 NFT 初始价格（调价基准） |
| `INITIAL_SILVER_PRICE` | 5,000 CTK | 白银 NFT 初始价格（调价基准） |
| `INITIAL_GOLD_PRICE` | 10,000 CTK | 黄金 NFT 初始价格（调价基准） |

## 快速开始

### 环境要求

- **Node.js** `^20.19.0` 或 `>=22.12.0`
- **MetaMask** 浏览器插件（或其他兼容的 Web3 钱包）
- **以太坊 Sepolia 测试网** 访问权限（在 MetaMask 中添加 Sepolia 网络并从水龙头获取测试 ETH）

### 安装依赖

```bash
# 克隆仓库
git clone <repository-url>
cd creatorcommunity

# 安装依赖
npm install
```

### 本地开发

```bash
# 启动开发服务器（支持热重载）
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 生产构建

```bash
# 构建生产版本（已压缩）
npm run build

# 本地预览生产构建
npm run preview
```

### 环境变量（可选）

在项目根目录创建 `.env` 文件以覆盖默认网络配置：

```env
VITE_TARGET_CHAIN_ID=11155111
VITE_NETWORK_NAME=Sepolia Testnet
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
```

## 项目结构

```
creatorcommunity/
├── src/
│   ├── assets/                  # 全局样式与 Logo
│   │   ├── base.css
│   │   └── main.css
│   ├── components/              # Vue UI 组件
│   │   ├── WalletSection.vue    # 钱包连接/断开与网络状态指示
│   │   ├── DeploySection.vue    # 合约部署面板
│   │   ├── RewardSection.vue    # 领取奖励与 CTK 转账
│   │   ├── PostSection.vue      # 发帖/评论奖励操作与帖子列表
│   │   ├── NFTSection.vue       # NFT 铸造与销毁面板
│   │   ├── AdminSection.vue     # 管理员专属控制面板（仅 owner）
│   │   ├── ChainDataSection.vue # 侧边栏：余额、冷却时间、NFT 信息
│   │   ├── TxHistorySection.vue # 交易历史记录
│   │   ├── TransferSection.vue  # 资产转账 UI
│   │   └── card.vue             # 通用卡片容器组件
│   ├── composables/             # Vue Composition API 逻辑钩子
│   │   ├── useWallet.js         # 钱包连接、Provider/Signer、网络校验
│   │   ├── useTransaction.js    # 统一交易状态管理（pending/success/fail）
│   │   ├── useDeploy.js         # 合约部署逻辑
│   │   ├── useContractAddress.js# 合约地址管理（按链存储）
│   │   ├── usePostList.js       # 帖子列表获取与缓存
│   │   ├── useTxHistory.js      # 交易历史持久化
│   │   └── useDataCache.js      # 通用链上数据缓存
│   ├── contracts/               # 合约 ABI 与字节码
│   │   ├── CreatorToken_ABI.json
│   │   ├── CreatorNFT_ABI.json
│   │   ├── CreatorToken.sol     # Solidity 源码（参考）
│   │   ├── CreatorNFT.sol       # Solidity 源码（参考）
│   │   ├── CreatorToken_Bytecode
│   │   ├── CreatorNFT_Bytecode
│   │   └── index.js             # 合约工厂与统一导出
│   ├── utils/
│   │   ├── constants.js         # Token 精度、NFT 等级常量
│   │   └── format.js            # 格式化工具（金额、地址、时间）
│   ├── config.js                # 网络配置（支持环境变量）
│   ├── App.vue                  # 主应用布局
│   └── main.js                  # 应用入口
├── .env.example                 # 环境变量示例
├── index.html
├── package.json
└── vite.config.js
```

## 架构设计

```
用户浏览器（MetaMask）
        │
        ▼
  ethers.js BrowserProvider  ←─ 写入交易需钱包签名
        │
        ├── Provider（只读调用）
        └── Signer（签名交易）
                │
                ▼
        CreatorToken 合约  ──  ERC20 + 奖励池
        CreatorNFT 合约    ──  ERC721 + 等级徽章
                │
                ▼
        以太坊 Sepolia 网络
```

- **只读调用**：通过 `Provider` 直接调用，无需 Gas 和签名，结果由 `useDataCache` 缓存
- **写入交易**：通过 `Signer` 发起，完整生命周期由 `useTransaction` 管理（预估 Gas → 等待确认 → 解析回执 → 区块浏览器链接）
- **数据缓存**：localStorage 按 `chainId + tokenAddress + accountAddress` 作为缓存键，避免跨链数据混淆

## Web3 注意事项

- **需要钱包**：必须安装并连接 Web3 钱包（如 MetaMask）才能使用链上功能
- **网络要求**：应用目标网络为 **以太坊 Sepolia 测试网**（Chain ID: `11155111`）。如果钱包处于其他网络，应用会提示切换
- **Gas 费用**：所有写入操作（发帖、评论、铸造等）均消耗 ETH 作为 Gas，请确保 Sepolia 钱包中有测试 ETH
- **不可撤销**：区块链交易一旦确认无法撤销，请在签名前仔细确认
- **安全性**：前端代码不存储任何私钥，所有签名操作由用户钱包插件完成

## 许可

本项目仅供学习和演示使用。

---

## English Version

<a id="english-version"></a>

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

3. **Two-Way CTK ↔ NFT Exchange**: Accumulated CTK can be spent to mint tiered NFT medals, creating a token sink; simultaneously, NFTs can be burned for an 80% refund in CTK, creating a回流 (reflux) channel. This forms a complete circulation loop between tokens and NFTs.

4. **NFT Price Fluctuation**: The admin can trigger `randomlyAdjustNFTPrice` to randomly adjust NFT prices by ±10% (constrained within 50%-150% of initial values). This creates an investment-like dynamic: users can mint NFTs at low prices, wait for prices to rise, then burn for a CTK refund that may **exceed** their original mint cost — generating positive expectations that further motivate participation.

5. **Four-Pool Allocation for Sustainability**: CTK's total supply of 10 million is split across four pools: Creator Pool (4M for post rewards), Interaction Pool (2M for comment rewards + initial claims), NFT Pool (2M for NFT minting circulation), and Founder Pool (2M). Each pool's usage is independently tracked, preventing overconsumption from any single channel.

> A Web3 dApp demonstrating wallet connection, smart contract interaction, reward mechanics with cooldown timers, and NFT-based reputation badges.

### Features

- **Initial Reward** — Every new address can claim 1 CTK token once (`claimInitialReward`)
- **Post Rewards** — Earn CTK by posting on-chain, with a 5-minute cooldown (`rewardPost`)
- **Comment Rewards** — Earn CTK for commenting; both commenter and post author receive rewards, with a 30-second cooldown (`rewardComment`)
- **Token Balance** — Real-time CTK balance query and display
- **NFT Badges** — Mint tiered NFTs (Bronze / Silver / Gold) with CTK, providing reward boost multipliers
- **NFT Burn & Refund** — Burn NFT to receive 80% of its cost back in CTK
- **Admin Controls** — Pool distribution (creator pool / interaction pool), batch rewards, NFT price management, and overflow withdrawal
- **Contract Deployment** — Deploy CreatorToken and CreatorNFT contracts directly from the UI
- **Transaction History** — Local caching of transaction records with block explorer links
- **Data Caching** — Smart caching for on-chain read data, post lists, and history (keyed by chainId + contract address + account)

### Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Vue 3](https://vuejs.org/) (Composition API + `<script setup>`) |
| Build Tool | [Vite 8](https://vite.dev/) |
| Web3 Library | [ethers.js v6](https://docs.ethers.org/v6/) |
| UI Library | [Element Plus](https://element-plus.org/) |
| Wallet | MetaMask (BrowserProvider) |
| Network | Ethereum Sepolia Testnet (Chain ID: 11155111) |

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
# Start the development server with hot reload
npm run dev
```

The app will be available at `http://localhost:5173`.

#### Production Build

```bash
# Build for production (minified)
npm run build

# Preview the production build locally
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
├── src/
│   ├── assets/                  # Global styles & logo
│   │   ├── base.css
│   │   └── main.css
│   ├── components/              # Vue UI components
│   │   ├── WalletSection.vue    # Wallet connect/disconnect & network indicator
│   │   ├── DeploySection.vue    # Contract deployment panel
│   │   ├── RewardSection.vue    # Claim reward & CTK transfer
│   │   ├── PostSection.vue      # Post/comment reward actions & post list
│   │   ├── NFTSection.vue       # NFT mint & burn panel
│   │   ├── AdminSection.vue     # Owner-only admin controls
│   │   ├── ChainDataSection.vue # Sidebar: balance, cooldowns, NFT info
│   │   ├── TxHistorySection.vue # Transaction history log
│   │   ├── TransferSection.vue  # Asset transfer UI
│   │   └── card.vue             # Generic card wrapper
│   ├── composables/             # Vue Composition API logic hooks
│   │   ├── useWallet.js         # Wallet connection, provider/signer, network check
│   │   ├── useTransaction.js    # Unified transaction state (pending/success/fail)
│   │   ├── useDeploy.js         # Contract deployment logic
│   │   ├── useContractAddress.js# Contract address management (per-chain)
│   │   ├── usePostList.js       # Post list fetching & caching
│   │   ├── useTxHistory.js      # Transaction history persistence
│   │   └── useDataCache.js      # Generic on-chain data caching
│   ├── contracts/               # Contract ABI & bytecode
│   │   ├── CreatorToken_ABI.json
│   │   ├── CreatorNFT_ABI.json
│   │   ├── CreatorToken.sol     # Solidity source (reference)
│   │   ├── CreatorNFT.sol       # Solidity source (reference)
│   │   ├── CreatorToken_Bytecode
│   │   ├── CreatorNFT_Bytecode
│   │   └── index.js             # Contract factory & exports
│   ├── utils/
│   │   ├── constants.js         # Token decimals, NFT rank constants
│   │   └── format.js            # Formatting utilities (amount, address, time)
│   ├── config.js                # Network configuration (env-aware)
│   ├── App.vue                  # Main application layout
│   └── main.js                  # App entry point
├── .env.example                 # Environment variable template
├── index.html
├── package.json
└── vite.config.js
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

- **Read-only calls**: Directly through `Provider`, no gas, no signature, results cached by `useDataCache`
- **Write transactions**: Through `Signer`, full lifecycle managed by `useTransaction` (estimate gas → pending → confirmed → block explorer link)
- **Data caching**: localStorage keyed by `chainId + tokenAddress + accountAddress` to avoid stale cross-chain data

### Web3 Notes

- **Wallet Required**: A Web3 wallet (e.g., MetaMask) must be installed and connected to interact with on-chain features
- **Network**: The app targets **Ethereum Sepolia Testnet** (Chain ID: `11155111`). If your wallet is on a different network, the app will prompt you to switch
- **Gas Fees**: All write operations (posting, commenting, minting, etc.) consume ETH as gas. Ensure your Sepolia wallet has test ETH
- **Irreversible**: Blockchain transactions cannot be undone. Please confirm details before signing
- **Security**: No private keys are stored in the frontend. All signing is handled by the user's wallet extension

### License

This project is for educational and demonstration purposes.
