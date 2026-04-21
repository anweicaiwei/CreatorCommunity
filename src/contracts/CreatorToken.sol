// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts@5.0.2/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@5.0.2/access/Ownable.sol";
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import "./CreatorNFT.sol";

interface INFT {
    function getUserNFTRankCount(address user, uint8 rank) external view returns (uint256);
    function recoverCTK() external;
}

contract CreatorToken is ERC20, Ownable, ReentrancyGuard {
    // ========== 固定代币供应（总量1000万CTK） ==========
    uint256 public constant TOTAL_SUPPLY = 10_000_000 * 10 ** 18;   // 总供应量
    uint256 public constant CREATOR_POOL = 4_000_000 * 10 ** 18;   // 创作者激励池（40%）
    uint256 public constant INTERACT_POOL = 2_000_000 * 10 ** 18;  // 互动激励池（20%）
    uint256 public constant NFT_POOL = 2_000_000 * 10 ** 18;       // NFT兑换池（20%）
    uint256 public constant FOUNDER_POOL = 2_000_000 * 10 ** 18;   // 创始人池（20%）

    // ========== 池使用追踪 ==========
    uint256 public creatorPoolUsed;     // 创作者池已发放总额
    uint256 public interactPoolUsed;    // 互动池已发放总额
    uint256 public nftPoolUsed;         // NFT池已转出总额

    CreatorNFT public immutable creatorNFT;  // 关联的NFT合约实例

    // ========== 初始奖励 ==========
    uint256 public constant INITIAL_REWARD = 1 * 10 ** 18;         // 新用户初始奖励1 CTK
    mapping(address => bool) public hasClaimedInitialReward;       // 是否已领取初始奖励

    // ========== 事件 ==========
    event TokenTransfer(address indexed from, address indexed to, uint256 amount);
    event CreatorPoolUpdated(uint256 amount, uint256 totalUsed);
    event InteractPoolUpdated(uint256 amount, uint256 totalUsed);
    event NFTPoolUpdated(uint256 amount, uint256 totalUsed);
    event InitialRewardClaimed(address indexed user, uint256 amount);
    event PostRewardRecorded(address indexed user, uint256 postId, uint256 amount);
    event CommentRewardRecorded(address indexed user, uint256 postId, uint256 amount);
    event PostRewardWithdrawn(address indexed user, uint256 amount);
    event CommentRewardWithdrawn(address indexed user, uint256 amount);
    event InitialRewardRecorded(address indexed user, uint256 amount);

    constructor() ERC20("Creator Community Token", "CTK") Ownable(msg.sender) {
        _mint(address(this), TOTAL_SUPPLY);
        _transfer(address(this), owner(), FOUNDER_POOL);
        creatorNFT = new CreatorNFT(address(this));
        creatorNFT.transferOwnership(msg.sender);
        nftPoolUsed = NFT_POOL;
        _transfer(address(this), address(creatorNFT), NFT_POOL);
    }

    // ========== 管理员功能 ==========

    // 从创作者池发放奖励
    function sendCreatorReward(address to, uint256 amount) public onlyOwner {
        require(creatorPoolUsed + amount <= CREATOR_POOL, "Creator pool exhausted");
        creatorPoolUsed += amount;
        _transfer(address(this), to, amount);
        emit TokenTransfer(address(this), to, amount);
        emit CreatorPoolUpdated(amount, creatorPoolUsed);
    }

    // 从互动池发放奖励
    function sendInteractReward(address to, uint256 amount) external onlyOwner nonReentrant {
        require(interactPoolUsed + amount <= INTERACT_POOL, "Interaction pool exhausted");
        interactPoolUsed += amount;
        _transfer(address(this), to, amount);
        emit TokenTransfer(address(this), to, amount);
        emit InteractPoolUpdated(amount, interactPoolUsed);
    }

    // 批量从创作者池发放
    function batchSendReward(address[] calldata tos, uint256[] calldata amounts) external onlyOwner nonReentrant {
        require(tos.length == amounts.length, "Mismatch");
        require(tos.length <= 100, "Too many");
        for (uint256 i = 0; i < tos.length; i++) {
            sendCreatorReward(tos[i], amounts[i]);
        }
    }

    // 管理员提取代币（70%创作者池+30%互动池）
    function withdrawTokens(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Zero amount");
        uint256 cp = (amount * 70) / 100;
        uint256 ip = amount - cp;
        require(creatorPoolUsed + cp <= CREATOR_POOL, "Creator pool exhausted");
        require(interactPoolUsed + ip <= INTERACT_POOL, "Interaction pool exhausted");
        creatorPoolUsed += cp;
        interactPoolUsed += ip;
        _transfer(address(this), owner(), amount);
        emit TokenTransfer(address(this), owner(), amount);
        emit CreatorPoolUpdated(cp, creatorPoolUsed);
        emit InteractPoolUpdated(ip, interactPoolUsed);
    }

    // ========== 社区互动参数 ==========
    uint256 public constant POST_REWARD = 2 * 10 ** 18;            // 发帖基础奖励2 CTK
    uint256 public constant COMMENT_REWARD = 0.1 * 10 ** 18;       // 评论基础奖励0.1 CTK
    uint256 public constant POST_INTERVAL = 300;                   // 发帖冷却间隔（秒，5分钟）
    uint256 public constant COMMENT_INTERVAL = 30;                 // 评论冷却间隔（秒，30秒）
    uint256 public constant POST_COMMENT_REWARD_CAP = 3 * 10 ** 18;       // 单帖子评论奖励总上限3 CTK
    uint256 public constant USER_COMMENT_REWARD_CAP = 0.5 * 10 ** 18;    // 单用户对单帖子评论奖励上限0.5 CTK

    // NFT增益：放大10倍存储，实际0.5%/2%/12%，上限50%（即500/10=50%）
    uint256 public constant BRONZE_BOOST_RATE = 5;                 // 青铜增益0.5%/个（×10=5）
    uint256 public constant SILVER_BOOST_RATE = 20;                // 白银增益2%/个（×10=20）
    uint256 public constant GOLD_BOOST_RATE = 120;                 // 黄金增益12%/个（×10=120）
    uint256 public constant MAX_BOOST_RATE = 500;                  // 总增益上限50%（×10=500）
    uint256 public constant BRONZE_POST_CAP_BOOST = 200000000000000000;     // 青铜0.2 CTK/个 发帖上限加成
    uint256 public constant SILVER_POST_CAP_BOOST = 1500000000000000000;    // 白银1.5 CTK/个 发帖上限加成
    uint256 public constant GOLD_POST_CAP_BOOST = 6000000000000000000;      // 黄金6 CTK/个 发帖上限加成
    uint256 public constant BRONZE_COMMENT_CAP_BOOST = 50000000000000000;   // 青铜0.05 CTK/个 评论上限加成
    uint256 public constant SILVER_COMMENT_CAP_BOOST = 300000000000000000;  // 白银0.3 CTK/个 评论上限加成
    uint256 public constant GOLD_COMMENT_CAP_BOOST = 1800000000000000000;   // 黄金1.8 CTK/个 评论上限加成
    uint256 public constant MAX_POST_REWARD = 10 * 10 ** 18;       // 发帖奖励绝对上限10 CTK
    uint256 public constant MAX_COMMENT_REWARD = 2 * 10 ** 18;     // 评论奖励绝对上限2 CTK

    // ========== 状态映射 ==========
    mapping(address => uint256) public lastPostTime;               // 用户上次发帖时间戳
    mapping(address => uint256) public lastCommentTime;            // 用户上次评论时间戳
    mapping(uint256 => uint256) public postCommentRewardTotal;     // 每个帖子的评论奖励累计
    mapping(address => mapping(uint256 => uint256)) public userPostCommentReward;  // 用户对每个帖子的评论奖励累计
    uint256 public postIdCounter;                                   // 帖子ID自增计数器
    mapping(uint256 => address) public postAuthor;                  // 帖子ID→作者地址映射
    mapping(address => uint256) public pendingPostRewards;          // 待提取帖子奖励（来自创作者池）
    mapping(address => uint256) public pendingCommentRewards;       // 待提取评论奖励（来自互动池）
    mapping(address => uint256) public pendingInitialReward;        // 待提取初始奖励

    // ========== NFT增益计算 ==========

    function calculateNFTBoost(address user) public view returns (uint256) {
        INFT nft = INFT(address(creatorNFT));
        uint256 totalBoost = nft.getUserNFTRankCount(user, uint8(NFTRank.BRONZE)) * BRONZE_BOOST_RATE
                          + nft.getUserNFTRankCount(user, uint8(NFTRank.SILVER)) * SILVER_BOOST_RATE
                          + nft.getUserNFTRankCount(user, uint8(NFTRank.GOLD)) * GOLD_BOOST_RATE;
        uint256 boostRate = totalBoost / 10;
        if (boostRate > MAX_BOOST_RATE / 10) boostRate = MAX_BOOST_RATE / 10;
        return boostRate;
    }

    function calculatePostCap(address user) public view returns (uint256) {
        INFT nft = INFT(address(creatorNFT));
        uint256 cap = POST_REWARD
            + nft.getUserNFTRankCount(user, uint8(NFTRank.BRONZE)) * BRONZE_POST_CAP_BOOST
            + nft.getUserNFTRankCount(user, uint8(NFTRank.SILVER)) * SILVER_POST_CAP_BOOST
            + nft.getUserNFTRankCount(user, uint8(NFTRank.GOLD)) * GOLD_POST_CAP_BOOST;
        if (cap > MAX_POST_REWARD) cap = MAX_POST_REWARD;
        return cap;
    }

    function calculateCommentCap(address user) public view returns (uint256) {
        INFT nft = INFT(address(creatorNFT));
        uint256 cap = COMMENT_REWARD
            + nft.getUserNFTRankCount(user, uint8(NFTRank.BRONZE)) * BRONZE_COMMENT_CAP_BOOST
            + nft.getUserNFTRankCount(user, uint8(NFTRank.SILVER)) * SILVER_COMMENT_CAP_BOOST
            + nft.getUserNFTRankCount(user, uint8(NFTRank.GOLD)) * GOLD_COMMENT_CAP_BOOST;
        if (cap > MAX_COMMENT_REWARD) cap = MAX_COMMENT_REWARD;
        return cap;
    }

    // ========== 社区互动（记账模式） ==========

    function rewardPost() external whenNotPaused nonReentrant returns (uint256) {
        require(block.timestamp >= lastPostTime[msg.sender] + POST_INTERVAL, "Too frequent");
        uint256 boostRate = calculateNFTBoost(msg.sender);
        uint256 reward = POST_REWARD + (POST_REWARD * boostRate) / 100;
        if (reward > MAX_POST_REWARD) reward = MAX_POST_REWARD;
        require(creatorPoolUsed + reward <= CREATOR_POOL, "Creator pool exhausted");
        uint256 postId = postIdCounter++;
        postAuthor[postId] = msg.sender;
        lastPostTime[msg.sender] = block.timestamp;
        creatorPoolUsed += reward;
        pendingPostRewards[msg.sender] += reward;
        emit PostRewardRecorded(msg.sender, postId, reward);
        emit CreatorPoolUpdated(reward, creatorPoolUsed);
        return postId;
    }

    function rewardComment(address author, uint256 postId) external whenNotPaused nonReentrant {
        if (msg.sender == author) return;
        require(block.timestamp >= lastCommentTime[msg.sender] + COMMENT_INTERVAL, "Too frequent");
        require(userPostCommentReward[msg.sender][postId] < USER_COMMENT_REWARD_CAP, "User cap reached");
        require(postCommentRewardTotal[postId] < POST_COMMENT_REWARD_CAP, "Post cap reached");
        uint256 commenterReward = COMMENT_REWARD + (COMMENT_REWARD * calculateNFTBoost(msg.sender)) / 100;
        uint256 authorReward = COMMENT_REWARD + (COMMENT_REWARD * calculateNFTBoost(author)) / 100;
        if (commenterReward > MAX_COMMENT_REWARD) commenterReward = MAX_COMMENT_REWARD;
        if (authorReward > MAX_COMMENT_REWARD) authorReward = MAX_COMMENT_REWARD;
        require(interactPoolUsed + commenterReward + authorReward <= INTERACT_POOL, "Interact pool exhausted");
        lastCommentTime[msg.sender] = block.timestamp;
        userPostCommentReward[msg.sender][postId] += commenterReward;
        postCommentRewardTotal[postId] += authorReward;
        pendingCommentRewards[msg.sender] += commenterReward;
        pendingCommentRewards[author] += authorReward;
        interactPoolUsed += commenterReward + authorReward;
        emit CommentRewardRecorded(msg.sender, postId, commenterReward);
        emit InteractPoolUpdated(commenterReward + authorReward, interactPoolUsed);
    }

    // ========== 初始奖励（记账模式） ==========

    function claimInitialReward() external whenNotPaused nonReentrant {
        require(!hasClaimedInitialReward[msg.sender], "Already claimed");
        require(interactPoolUsed + INITIAL_REWARD <= INTERACT_POOL, "Interact pool exhausted");
        hasClaimedInitialReward[msg.sender] = true;
        interactPoolUsed += INITIAL_REWARD;
        pendingInitialReward[msg.sender] = INITIAL_REWARD;
        emit InitialRewardRecorded(msg.sender, INITIAL_REWARD);
        emit InteractPoolUpdated(INITIAL_REWARD, interactPoolUsed);
    }

    // ========== 奖励提现 ==========

    function withdrawPostRewards() external nonReentrant {
        uint256 amount = pendingPostRewards[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingPostRewards[msg.sender] = 0;
        _transfer(address(this), msg.sender, amount);
        emit TokenTransfer(address(this), msg.sender, amount);
        emit PostRewardWithdrawn(msg.sender, amount);
    }

    function withdrawCommentRewards() external nonReentrant {
        uint256 amount = pendingCommentRewards[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingCommentRewards[msg.sender] = 0;
        _transfer(address(this), msg.sender, amount);
        emit TokenTransfer(address(this), msg.sender, amount);
        emit CommentRewardWithdrawn(msg.sender, amount);
    }

    function withdrawInitialReward() external nonReentrant {
        uint256 amount = pendingInitialReward[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingInitialReward[msg.sender] = 0;
        _transfer(address(this), msg.sender, amount);
        emit TokenTransfer(address(this), msg.sender, amount);
        emit InitialRewardClaimed(msg.sender, amount);
    }

    function withdrawAllRewards() external nonReentrant {
        uint256 p = pendingPostRewards[msg.sender];
        uint256 c = pendingCommentRewards[msg.sender];
        uint256 i = pendingInitialReward[msg.sender];
        uint256 total = p + c + i;
        require(total > 0, "Nothing to withdraw");
        pendingPostRewards[msg.sender] = 0;
        pendingCommentRewards[msg.sender] = 0;
        pendingInitialReward[msg.sender] = 0;
        _transfer(address(this), msg.sender, total);
        emit TokenTransfer(address(this), msg.sender, total);
        if (p > 0) emit PostRewardWithdrawn(msg.sender, p);
        if (c > 0) emit CommentRewardWithdrawn(msg.sender, c);
        if (i > 0) emit InitialRewardClaimed(msg.sender, i);
    }

    // ========== NFT合约互操作 ==========

    function nftPoolTransfer(address to, uint256 amount) external onlyOwner nonReentrant {
        require(nftPoolUsed + amount <= NFT_POOL, "NFT pool exhausted");
        nftPoolUsed += amount;
        _transfer(address(this), to, amount);
        emit TokenTransfer(address(this), to, amount);
        emit NFTPoolUpdated(amount, nftPoolUsed);
    }

    function transferFromUserForNFT(address from, uint256 amount) external nonReentrant {
        require(msg.sender == address(creatorNFT), "Only NFT contract");
        _transfer(from, address(creatorNFT), amount);
        emit TokenTransfer(from, address(creatorNFT), amount);
    }

    function receiveFromNFTToCreatorPool(uint256 amount) external nonReentrant {
        require(msg.sender == address(creatorNFT), "Only NFT contract");
        creatorPoolUsed = creatorPoolUsed >= amount ? creatorPoolUsed - amount : 0;
        emit CreatorPoolUpdated(amount, creatorPoolUsed);
    }

    function receiveFromNFTToInteractPool(uint256 amount) external nonReentrant {
        require(msg.sender == address(creatorNFT), "Only NFT contract");
        interactPoolUsed = interactPoolUsed >= amount ? interactPoolUsed - amount : 0;
        emit InteractPoolUpdated(amount, interactPoolUsed);
    }

    function transferFromCreatorPoolToNFT(uint256 amount) external nonReentrant {
        require(msg.sender == address(creatorNFT), "Only NFT contract");
        require(creatorPoolUsed + amount <= CREATOR_POOL, "Creator pool exhausted");
        creatorPoolUsed += amount;
        _transfer(address(this), address(creatorNFT), amount);
        emit TokenTransfer(address(this), address(creatorNFT), amount);
        emit CreatorPoolUpdated(amount, creatorPoolUsed);
    }

    function transferFromInteractPoolToNFT(uint256 amount) external nonReentrant {
        require(msg.sender == address(creatorNFT), "Only NFT contract");
        require(interactPoolUsed + amount <= INTERACT_POOL, "Interact pool exhausted");
        interactPoolUsed += amount;
        _transfer(address(this), address(creatorNFT), amount);
        emit TokenTransfer(address(this), address(creatorNFT), amount);
        emit InteractPoolUpdated(amount, interactPoolUsed);
    }

    // ========== 查询 ==========

    function getPendingRewards(address user) public view returns (uint256 post, uint256 comment, uint256 initial, uint256 total) {
        post = pendingPostRewards[user];
        comment = pendingCommentRewards[user];
        initial = pendingInitialReward[user];
        total = post + comment + initial;
    }

    // public mappings自动生成getter: creatorPoolUsed, interactPoolUsed, nftPoolUsed, postAuthor, postIdCounter等

    function getAuthorByPostId(uint256 postId) public view returns (address) {
        require(postId < postIdCounter, "Not exist");
        return postAuthor[postId];
    }

    // ========== 合约停用 ==========

    bool public isPaused;  // 合约暂停状态，暂停后禁止发帖/评论/mint/领取，但允许提现

    modifier whenNotPaused() {
        require(!isPaused, "Paused");
        _;
    }

    // 回收NFT合约CTK，转移余额给owner，永久暂停
    function destroyContract() external onlyOwner {
        INFT(address(creatorNFT)).recoverCTK();
        uint256 balance = ERC20.balanceOf(address(this));
        if (balance > 0) _transfer(address(this), owner(), balance);
        isPaused = true;
    }
}