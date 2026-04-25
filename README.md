# CreatorCommunity

**简体中文** | [English](./README.en.md)

开源仓库：[anweicaiwei/CreatorCommunity](https://github.com/anweicaiwei/CreatorCommunity)

## 项目概述

`CreatorCommunity` 是一个基于 Vue 3、Element Plus 和 ethers.js v6 的前端 Web3 dApp，用来演示“创作激励 + NFT 徽章增益”的社区机制。应用围绕两份合约工作：

- `CreatorToken`：负责 CTK 奖励记录、奖励提现、帖子/评论激励、管理员奖池发放
- `CreatorNFT`：负责 Bronze / Silver / Gold 三档 NFT 的铸造、销毁退款、价格调整和 NFT 合约余额管理

当前前端以“可操作、可观察、可恢复”为目标，重点覆盖钱包连接、合约部署、链上数据读取、本地缓存、奖励流程、NFT 流转和管理员操作。

## 系统功能结构

### 页面结构

- `/CreatorCommunity/`
  - 主页，实际由 `App.vue` 统一编排
  - `HomeView.vue` 只负责展示，并通过 `inject()` 接收状态和事件
- `/CreatorCommunity/manual`
  - 根据当前语言重定向到 `/CreatorCommunity/manual-zh` 或 `/CreatorCommunity/manual-en`
- `/CreatorCommunity/manual-zh`
  - 加载 `public/user-manual.zh.md`
- `/CreatorCommunity/manual-en`
  - 加载 `public/user-manual.en.md`

### 主页模块结构

主页实际挂载的功能块如下，顺序与用户看到的界面一致：

1. 钱包与合约状态
   - 连接 / 断开 MetaMask
   - 校验目标网络
   - 显示钱包地址、连接时长、区块浏览器地址
   - 触发部署、显示已保存的合约地址
   - 管理员可开启或关闭转账入口
2. 奖励模块
   - 领取初始奖励
   - 提现发帖 / 评论 / 初始 / 全部待领取奖励
   - 在管理员开启转账功能时执行 CTK 转账
3. 帖子互动模块
   - 发帖奖励
   - 帖子列表刷新
   - 按帖子执行评论奖励
4. NFT 模块
   - 铸造 Bronze / Silver / Gold NFT
   - 销毁 NFT 并按规则退款
   - 在管理员开启转账功能时执行 NFT 转移
5. 管理员模块
   - 查询奖池与 NFT 合约余额
   - 从创作者池 / 互动池发奖
   - 重置价格 / 随机调价
   - 提取 NFT 合约中的可提取 CTK、全部可提取 CTK、溢出 CTK
6. 侧边栏
   - 链上数据总览
   - 交易历史

### 业务主线

```text
钱包连接与网络校验
-> 合约部署或恢复本地地址
-> 加载链上数据与本地缓存
-> 记录奖励（发帖 / 评论 / 初始奖励）
-> 提现到 CTK 余额
-> 用 CTK 铸造 NFT 获取奖励增益
-> 继续创作或执行管理员资金操作
```

## 当前前端已实现能力

### 钱包、网络与部署

- 使用 `ethers.BrowserProvider(window.ethereum)` 连接钱包
- 自动恢复已授权账户
- 支持切换到 `.env` 指定的目标网络，默认 Sepolia `11155111`
- 支持从前端部署 `CreatorToken`
- 部署完成后通过 `creatorNFT()` 自动读取并保存 `CreatorNFT` 地址
- 合约地址按链隔离保存，刷新页面后自动恢复

### 链上数据与缓存

- 查询 CTK 余额、初始奖励领取状态、发帖/评论冷却、NFT 增益、NFT 价格、NFT 持有情况、待提现奖励
- 查询管理员奖池状态和 NFT 合约可提取余额
- 本地缓存用户数据、帖子列表、奖池数据、交易历史和 UI 设置
- 本地恢复发帖 / 评论倒计时，避免刷新后冷却展示丢失

### 奖励与互动

- `claimInitialReward`
- `rewardPost`
- `rewardComment`
- `withdrawPostRewards`
- `withdrawCommentRewards`
- `withdrawInitialReward`
- `withdrawAllRewards`

重要：`claimInitialReward`、`rewardPost`、`rewardComment` 只记录“待领取奖励”，不会立刻把 CTK 打到钱包余额；前端已单独提供对应提现入口。

### NFT

- `mintBronzeNFT`
- `mintSilverNFT`
- `mintGoldNFT`
- `burnNFTForRefund`
- `transferFrom`（NFT 转移，受管理员开关控制）

### 管理员能力

- `sendCreatorReward`
- `sendInteractReward`
- `resetNFTPrice`
- `randomlyAdjustNFTPrice`
- `withdrawCTK`
- `withdrawAllCTK`
- `withdrawOverflow`

### 文档与双语

- README 中英双份
- 应用内手册中英双份
- 手册页运行时读取的源文件为：
  - `public/user-manual.zh.md`
  - `public/user-manual.en.md`

## 合约交互边界

### 前端已接入的写操作

| 合约 | 前端已接入 |
| --- | --- |
| `CreatorToken` | `claimInitialReward`, `rewardPost`, `rewardComment`, `withdrawPostRewards`, `withdrawCommentRewards`, `withdrawInitialReward`, `withdrawAllRewards`, `transfer`, `sendCreatorReward`, `sendInteractReward` |
| `CreatorNFT` | `mintBronzeNFT`, `mintSilverNFT`, `mintGoldNFT`, `burnNFTForRefund`, `transferFrom`, `resetNFTPrice`, `randomlyAdjustNFTPrice`, `withdrawCTK`, `withdrawAllCTK`, `withdrawOverflow` |

### 合约存在但前端未直接暴露的方法

| 合约 | 方法 |
| --- | --- |
| `CreatorToken` | `batchSendReward`, `withdrawTokens`, `destroyContract` |
| `CreatorNFT` | `recoverCTK` |

这意味着 README 不再把前端说成“完整覆盖全部合约能力”；当前 UI 只接入了上表中的实际入口。

### 前端依赖的关键只读逻辑

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

## 架构与数据流

### 前端架构

- `App.vue`
  - 唯一业务编排层
  - 组合所有 composable
  - 处理所有写操作、通知、刷新、缓存保存
  - 用 `provide()` 向子组件分发状态和事件
- 子组件
  - 纯展示组件
  - 只通过 `props` 和 `emit` 交互
  - 不直接持有业务 composable

### 合约实例模型

每份合约都会创建两类实例：

- `tokenContractRead` / `nftContractRead`
  - 基于 provider
  - 用于只读查询
- `tokenContractWrite` / `nftContractWrite`
  - 基于 signer
  - 用于写交易

实例存储使用 `shallowRef`，避免把合约对象交给 Vue 深度响应式代理。

### 交易处理模型

所有前端写操作统一经过：

1. `useTransaction().execute(fn)`
2. `App.vue` 中的 `doWrite(...)`

这两层负责：

- pending / success / error 生命周期
- 区块浏览器跳转
- 错误码映射
- 本地交易历史记录
- 读数据刷新

### 缓存与本地持久化

当前实现使用以下关键存储规则：

- 合约地址
  - `creatorcommunity_${chainId}_token_address`
  - `creatorcommunity_${chainId}_nft_address`
- 当前链
  - `creatorcommunity_current_chainId`
- 统一数据缓存
  - `creatorcommunity_${chainId}_${tokenAddr}`
- 冷却缓存
  - `creatorcommunity_${chainId}_${account}_cooldown_post`
  - `creatorcommunity_${chainId}_${account}_cooldown_comment`
- 暗色模式
  - `creatorcommunity-dark-mode`

统一数据缓存内部包含：

- `userData_${account}`
- `pools`
- `txHistory`
- `posts`
- `settings`

### 当前实现上的重要限制

- 转账入口不是默认可见，只有管理员打开后用户侧才显示 CTK / NFT 转账表单
- 断开钱包不会清除已保存的合约地址；断开连接不等于重置部署
- 切换网络后需要对应链上的地址记录；如果该链没有地址，前端会回到“未部署”状态
- 交易历史当前使用 `useDataStore` 里的统一缓存；仓库内还保留一个未接入主流程的 `useTxHistory.js`

## 快速开始

### 环境要求

- Node.js `^20.19.0 || >=22.12.0`
- MetaMask 或兼容 `window.ethereum` 的钱包
- Sepolia 测试 ETH

### 安装依赖

```bash
git clone https://github.com/anweicaiwei/CreatorCommunity.git
cd creatorcommunity
npm install
```

### 本地开发

```bash
npm run dev
```

默认访问地址：

- 首页：`http://localhost:5173/CreatorCommunity/`
- 手册页：`http://localhost:5173/CreatorCommunity/manual`

### 生产构建

```bash
npm run build
npm run preview
```

### 环境变量

```env
VITE_TARGET_CHAIN_ID=11155111
VITE_NETWORK_NAME=Sepolia Testnet
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
```

## 关键目录

```text
src/
  App.vue                    # 唯一业务编排层
  main.js                    # 应用入口
  router/index.js            # /CreatorCommunity 路由配置
  components/
    HomeView.vue             # 主页展示层
    ManualView.vue           # 手册页展示层
    WalletSection.vue        # 钱包、部署、转账开关
    RewardSection.vue        # 奖励记录与提现
    PostSection.vue          # 发帖与评论奖励
    NFTSection.vue           # NFT 铸造、销毁、转移
    AdminSection.vue         # 管理员面板
    ChainDataSection.vue     # 链上数据总览
    TxHistorySection.vue     # 交易历史
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
  user-manual.zh.md          # 中文手册源文件
  user-manual.en.md          # 英文手册源文件
README.md
README.en.md
```

## 评审重点

阅读或演示这个项目时，优先关注这些实现点：

1. 奖励是“记账 + 提现”两阶段，不是即时到账
2. `App.vue` 是唯一业务协调层，子组件基本不含业务逻辑
3. 合约地址、缓存和冷却都做了本地恢复
4. 管理员与普通用户看到的是同一主页，不同权限决定不同入口可见性
5. 手册页不是硬编码内容，而是运行时加载 `public/user-manual.*.md`

## 许可

仓库内未提供单独的许可证文件；如需发布或复用，请先补充明确的许可声明。
