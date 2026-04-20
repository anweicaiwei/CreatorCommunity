// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts@5.0.2/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@5.0.2/access/Ownable.sol";
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import "./CreatorNFT.sol";

// 外部NFT合约接口
interface INFT {
    function getUserNFTRankCount(address user, uint8 rank) external view returns (uint256);
}

/**
 * @title CreatorToken - 创作者社区激励代币
 * @dev 符合 ERC20 标准的代币，具有固定供应量、多池分配和仅管理员可调用的奖励功能
 */
contract CreatorToken is ERC20, Ownable, ReentrancyGuard {
    // ========== 固定代币 ==========
    uint256 public constant TOTAL_SUPPLY = 10_000_000 * 10 ** 18;
    uint256 public constant CREATOR_POOL = 4_000_000 * 10 ** 18;
    uint256 public constant INTERACT_POOL = 2_000_000 * 10 ** 18;
    uint256 public constant NFT_POOL = 2_000_000 * 10 ** 18;
    uint256 public constant FOUNDER_POOL = 2_000_000 * 10 ** 18;

    // ========== 追踪池使用情况 ==========
    uint256 public creatorPoolUsed;
    uint256 public interactPoolUsed;
    uint256 public nftPoolUsed;
    
    // ========== NFT合约地址 ==========
    CreatorNFT public immutable creatorNFT;
    
    // ========== 初始奖励配置 ==========
    // 初始奖励数量
    uint256 public constant INITIAL_REWARD = 1 * 10 ** 18;
    // 记录已领取初始奖励的地址
    mapping(address => bool) public hasClaimedInitialReward;

    // ========== 事件记录 ==========
    // 代币转移事件
    event TokenTransfer(address indexed from, address indexed to, uint256 amount);
    // 池操作事件
    event CreatorPoolUpdated(uint256 amount, uint256 totalUsed);
    event InteractPoolUpdated(uint256 amount, uint256 totalUsed);
    event NFTPoolUpdated(uint256 amount, uint256 totalUsed);
    // 初始奖励领取事件
    event InitialRewardClaimed(address indexed user, uint256 amount);

    /**
     * @dev 构造函数：初始化代币，铸造总供应量到合约，将创始人池转账给部署者，部署NFT合约并转移NFT池代币
     */
    constructor() ERC20("Creator Community Token", "CTK") Ownable(msg.sender) {
        _mint(address(this), TOTAL_SUPPLY);
        _transfer(address(this), owner(), FOUNDER_POOL);
        
        // 部署CreatorNFT合约
        creatorNFT = new CreatorNFT(address(this));
        // 将NFT合约的所有权转移给当前的管理员钱包
        creatorNFT.transferOwnership(msg.sender);
        
        // 将NFT池的代币转入NFT合约
        nftPoolUsed = NFT_POOL;
        _transfer(address(this), address(creatorNFT), NFT_POOL);
    }

    // ========== 核心管理员功能 ==========
    /**
     * @dev 从创作者池发送创作者奖励（仅管理员）
     * @param to 接收者地址
     * @param amount 奖励数量
     */
    function sendCreatorReward(address to, uint256 amount) public onlyOwner {
        require(creatorPoolUsed + amount <= CREATOR_POOL, "Creator pool exhausted");
        creatorPoolUsed += amount;
        _transfer(address(this), to, amount);
        emit TokenTransfer(address(this), to, amount);
        emit CreatorPoolUpdated(amount, creatorPoolUsed);
    }

    /**
     * @dev 从互动池发送互动奖励（仅管理员）
     * @param to 接收者地址
     * @param amount 奖励数量
     */
    function sendInteractReward(address to, uint256 amount) external onlyOwner nonReentrant {
        require(interactPoolUsed + amount <= INTERACT_POOL, "Interaction pool exhausted");
        interactPoolUsed += amount;
        _transfer(address(this), to, amount);
        emit TokenTransfer(address(this), to, amount);
        emit InteractPoolUpdated(amount, interactPoolUsed);
    }

    // ========== 社区互动功能 ==========
    // 发帖奖励数量
    uint256 public constant POST_REWARD = 2 * 10 ** 18;
    // 评论奖励数量
    uint256 public constant COMMENT_REWARD = 0.1 * 10 ** 18;
    // 时间间隔限制（秒）
    uint256 public constant POST_INTERVAL = 300; // 5分钟
    uint256 public constant COMMENT_INTERVAL = 30; // 30秒
    // 每个帖子的评论奖励上限
    uint256 public constant POST_COMMENT_REWARD_CAP = 3 * 10 ** 18;
    // 每个用户对同一帖子的评论奖励上限
    uint256 public constant USER_COMMENT_REWARD_CAP = 0.5 * 10 ** 18;
    
    // NFT增益配置
    // 青铜NFT增益比例（每持有1个增加0.5%）
    uint256 public constant BRONZE_BOOST_RATE = 5; // 实际为0.5%，使用放大10倍的整数
    // 白银NFT增益比例（每持有1个增加2%）
    uint256 public constant SILVER_BOOST_RATE = 20; // 实际为2%，使用放大10倍的整数
    // 黄金NFT增益比例（每持有1个增加12%）
    uint256 public constant GOLD_BOOST_RATE = 120; // 实际为12%，使用放大10倍的整数
    // 最大增益上限（50%）
    uint256 public constant MAX_BOOST_RATE = 500; // 实际为50%，使用放大10倍的整数
    // 每个青铜NFT增加的发帖奖励上限（0.2 CTK）
    uint256 public constant BRONZE_POST_CAP_BOOST = 200000000000000000; // 0.2 * 10^18
    // 每个白银NFT增加的发帖奖励上限（1.5 CTK）
    uint256 public constant SILVER_POST_CAP_BOOST = 1500000000000000000; // 1.5 * 10^18
    // 每个黄金NFT增加的发帖奖励上限（6 CTK）
    uint256 public constant GOLD_POST_CAP_BOOST = 6000000000000000000; // 6 * 10^18
    // 每个青铜NFT增加的评论奖励上限（0.05 CTK）
    uint256 public constant BRONZE_COMMENT_CAP_BOOST = 50000000000000000; // 0.05 * 10^18
    // 每个白银NFT增加的评论奖励上限（0.3 CTK）
    uint256 public constant SILVER_COMMENT_CAP_BOOST = 300000000000000000; // 0.3 * 10^18
    // 每个黄金NFT增加的评论奖励上限（1.8 CTK）
    uint256 public constant GOLD_COMMENT_CAP_BOOST = 1800000000000000000; // 1.8 * 10^18;
    // 发帖奖励上限（10 CTK）
    uint256 public constant MAX_POST_REWARD = 10 * 10 ** 18;
    // 评论奖励上限（2 CTK）
    uint256 public constant MAX_COMMENT_REWARD = 2 * 10 ** 18;
    
    // 记录用户上次发帖时间
    mapping(address => uint256) public lastPostTime;
    // 记录用户上次评论时间
    mapping(address => uint256) public lastCommentTime;
    // 记录每个帖子的评论奖励累计（使用帖子ID作为键）
    mapping(uint256 => uint256) public postCommentRewardTotal;
    // 记录每个用户对每个帖子的评论奖励累计
    mapping(address => mapping(uint256 => uint256)) public userPostCommentReward;
    // 帖子ID计数器
    uint256 public postIdCounter;

    /**
     * @dev 计算用户的NFT增益比例
     * @param user 用户地址
     * @return boostRate 增益比例（百分比）
     */
    function calculateNFTBoost(address user) public view returns (uint256) {
        INFT nft = INFT(address(creatorNFT));
        uint256 bronzeCount = nft.getUserNFTRankCount(user, uint8(NFTRank.BRONZE));
        uint256 silverCount = nft.getUserNFTRankCount(user, uint8(NFTRank.SILVER));
        uint256 goldCount = nft.getUserNFTRankCount(user, uint8(NFTRank.GOLD));
        
        // 计算总增益（使用放大10倍的整数）
        uint256 totalBoost = bronzeCount * BRONZE_BOOST_RATE +
                           silverCount * SILVER_BOOST_RATE +
                           goldCount * GOLD_BOOST_RATE;
        
        // 转换为实际百分比（除以10）
        uint256 boostRate = totalBoost / 10;
        
        // 限制最大增益
        if (boostRate > MAX_BOOST_RATE / 10) {
            boostRate = MAX_BOOST_RATE / 10;
        }
        
        return boostRate;
    }

    /**
     * @dev 计算用户的发帖奖励上限
     * @param user 用户地址
     * @return postCap 发帖奖励上限
     */
    function calculatePostCap(address user) public view returns (uint256) {
        INFT nft = INFT(address(creatorNFT));
        uint256 bronzeCount = nft.getUserNFTRankCount(user, uint8(NFTRank.BRONZE));
        uint256 silverCount = nft.getUserNFTRankCount(user, uint8(NFTRank.SILVER));
        uint256 goldCount = nft.getUserNFTRankCount(user, uint8(NFTRank.GOLD));
        
        uint256 capBoost = bronzeCount * BRONZE_POST_CAP_BOOST +
                          silverCount * SILVER_POST_CAP_BOOST +
                          goldCount * GOLD_POST_CAP_BOOST;
        
        uint256 postCap = POST_REWARD + capBoost;
        // 确保不超过最大发帖奖励上限
        if (postCap > MAX_POST_REWARD) {
            postCap = MAX_POST_REWARD;
        }
        
        return postCap;
    }

    /**
     * @dev 计算用户的评论奖励上限
     * @param user 用户地址
     * @return commentCap 评论奖励上限
     */
    function calculateCommentCap(address user) public view returns (uint256) {
        INFT nft = INFT(address(creatorNFT));
        uint256 bronzeCount = nft.getUserNFTRankCount(user, uint8(NFTRank.BRONZE));
        uint256 silverCount = nft.getUserNFTRankCount(user, uint8(NFTRank.SILVER));
        uint256 goldCount = nft.getUserNFTRankCount(user, uint8(NFTRank.GOLD));
        
        uint256 capBoost = bronzeCount * BRONZE_COMMENT_CAP_BOOST +
                          silverCount * SILVER_COMMENT_CAP_BOOST +
                          goldCount * GOLD_COMMENT_CAP_BOOST;
        
        uint256 commentCap = COMMENT_REWARD + capBoost;
        // 确保不超过最大评论奖励上限
        if (commentCap > MAX_COMMENT_REWARD) {
            commentCap = MAX_COMMENT_REWARD;
        }
        
        return commentCap;
    }

    /**
     * @dev 用户发帖，获得2枚代币
     * @return postId 帖子ID
     */
    function rewardPost() external nonReentrant returns (uint256) {
        // 检查时间间隔，防止滥用
        require(block.timestamp >= lastPostTime[msg.sender] + POST_INTERVAL, "Post too frequently");
        
        // 计算用户的NFT增益
        uint256 boostRate = calculateNFTBoost(msg.sender);
        // 计算实际奖励金额
        uint256 actualReward = POST_REWARD + (POST_REWARD * boostRate) / 100;
        // 确保不超过最大发帖奖励上限
        if (actualReward > MAX_POST_REWARD) {
            actualReward = MAX_POST_REWARD;
        }
        // 确保创作者池有足够的代币
        require(creatorPoolUsed + actualReward <= CREATOR_POOL, "Creator pool exhausted");
        
        // 生成帖子ID
        uint256 postId = postIdCounter++;
        // 更新上次发帖时间
        lastPostTime[msg.sender] = block.timestamp;
        // 从创作者池发送奖励
        creatorPoolUsed += actualReward;
        _transfer(address(this), msg.sender, actualReward);
        emit TokenTransfer(address(this), msg.sender, actualReward);
        emit CreatorPoolUpdated(actualReward, creatorPoolUsed);
        
        return postId;
    }

    /**
     * @dev 评论奖励，评论者和帖子创作者从交流池子获得代币
     * @param author 帖子作者地址
     * @param postId 帖子ID
     */
    function rewardComment(address author, uint256 postId) external nonReentrant {
        // 若帖子作者和评论者为同一人，则不获得代币
        if (msg.sender == author) {
            return;
        }
        // 检查时间间隔，防止滥用
        require(block.timestamp >= lastCommentTime[msg.sender] + COMMENT_INTERVAL, "Comment too frequently");
        // 检查用户对该帖子的评论奖励是否已达上限
        require(userPostCommentReward[msg.sender][postId] < USER_COMMENT_REWARD_CAP, "Comment reward cap reached for this post");
        // 检查帖子的评论奖励是否已达上限
        require(postCommentRewardTotal[postId] < POST_COMMENT_REWARD_CAP, "Post comment reward cap reached");
        
        // 计算评论者和帖子作者的NFT增益
        uint256 commenterBoost = calculateNFTBoost(msg.sender);
        uint256 authorBoost = calculateNFTBoost(author);
        // 计算实际奖励金额
        uint256 commenterReward = COMMENT_REWARD + (COMMENT_REWARD * commenterBoost) / 100;
        uint256 authorReward = COMMENT_REWARD + (COMMENT_REWARD * authorBoost) / 100;
        // 确保不超过最大评论奖励上限
        if (commenterReward > MAX_COMMENT_REWARD) {
            commenterReward = MAX_COMMENT_REWARD;
        }
        if (authorReward > MAX_COMMENT_REWARD) {
            authorReward = MAX_COMMENT_REWARD;
        }
        // 确保互动池有足够的代币
        require(interactPoolUsed + commenterReward + authorReward <= INTERACT_POOL, "Interaction pool exhausted");
        
        // 更新上次评论时间
        lastCommentTime[msg.sender] = block.timestamp;
        // 更新用户对该帖子的评论奖励累计
        userPostCommentReward[msg.sender][postId] += commenterReward;
        // 更新帖子的评论奖励累计（帖子作者获得的奖励）
        postCommentRewardTotal[postId] += authorReward;
        // 从互动池发送奖励给帖子作者
        interactPoolUsed += authorReward;
        _transfer(address(this), author, authorReward);
        emit TokenTransfer(address(this), author, authorReward);
        emit InteractPoolUpdated(authorReward, interactPoolUsed);
        // 从互动池发送奖励给评论者
        interactPoolUsed += commenterReward;
        _transfer(address(this), msg.sender, commenterReward);
        emit TokenTransfer(address(this), msg.sender, commenterReward);
        emit InteractPoolUpdated(commenterReward, interactPoolUsed);
    }

    /**
     * @dev 批量发送创作者奖励（仅所有者）
     * @param tos 接收者地址列表
     * @param amounts 奖励数量列表（需与 tos 长度一致）
     */
    function batchSendReward(address[] calldata tos, uint256[] calldata amounts) external onlyOwner nonReentrant {
        require(tos.length == amounts.length, "Address/amount length mismatch");
        require(tos.length <= 100, "Batch size exceeds limit");
        for (uint256 i = 0; i < tos.length; i++) {
            sendCreatorReward(tos[i], amounts[i]);
        }
    }

    /**
     * @dev 管理员从合约中提取代币，按照一定比例从创作者池和互动池获取
     * @param amount 提取的代币数量（以 wei 为单位）
     */
    function withdrawTokens(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be positive");
        
        // 计算从各个池提取的比例（70% 从创作者池，30% 从互动池）
        uint256 creatorPoolAmount = (amount * 70) / 100;
        uint256 interactPoolAmount = amount - creatorPoolAmount;
        
        // 检查创作者池是否有足够的代币
        require(creatorPoolUsed + creatorPoolAmount <= CREATOR_POOL, "Creator pool exhausted");
        // 检查互动池是否有足够的代币
        require(interactPoolUsed + interactPoolAmount <= INTERACT_POOL, "Interaction pool exhausted");
        
        // 更新池的使用情况
        creatorPoolUsed += creatorPoolAmount;
        interactPoolUsed += interactPoolAmount;
        
        // 执行代币转账给管理员
        _transfer(address(this), owner(), amount);
        emit TokenTransfer(address(this), owner(), amount);
        emit CreatorPoolUpdated(creatorPoolAmount, creatorPoolUsed);
        emit InteractPoolUpdated(interactPoolAmount, interactPoolUsed);
    }

    // ========== 新用户初始奖励功能 ==========
    /**
     * @dev 新用户领取初始奖励（1 CTK）
     * 每个地址只能领取一次
     */
    function claimInitialReward() external nonReentrant {
        // 检查用户是否已经领取过初始奖励
        require(!hasClaimedInitialReward[msg.sender], "Initial reward already claimed");
        // 检查互动池是否有足够的代币
        require(interactPoolUsed + INITIAL_REWARD <= INTERACT_POOL, "Interaction pool exhausted");
        
        // 标记用户已领取初始奖励
        hasClaimedInitialReward[msg.sender] = true;
        // 更新互动池使用情况
        interactPoolUsed += INITIAL_REWARD;
        // 转账初始奖励给用户
        _transfer(address(this), msg.sender, INITIAL_REWARD);
        emit TokenTransfer(address(this), msg.sender, INITIAL_REWARD);
        emit InteractPoolUpdated(INITIAL_REWARD, interactPoolUsed);
        emit InitialRewardClaimed(msg.sender, INITIAL_REWARD);
    }

    // ========== 与 ERC721 互操作功能 ==========
    /**
     * @dev 从 NFT 池转账代币（仅所有者）
     * @param to 接收者地址
     * @param amount 转账数量
     */
    function nftPoolTransfer(address to, uint256 amount) external onlyOwner nonReentrant {
        require(nftPoolUsed + amount <= NFT_POOL, "NFT pool exhausted");
        nftPoolUsed += amount;
        _transfer(address(this), to, amount);
        emit TokenTransfer(address(this), to, amount);
        emit NFTPoolUpdated(amount, nftPoolUsed);
    }
    
    /**
     * @dev 允许NFT合约直接从用户账户转移代币用于铸造NFT
     * @param from 用户地址
     * @param amount 转移数量
     */
    function transferFromUserForNFT(address from, uint256 amount) external nonReentrant {
        // 只允许NFT合约调用
        require(msg.sender == address(creatorNFT), "Only NFT contract can call this function");
        
        // 执行代币转账
        _transfer(from, address(creatorNFT), amount);
        emit TokenTransfer(from, address(creatorNFT), amount);
    }
    
    /**
     * @dev 接收从NFT合约提取的代币并分配到创作者池
     * @param amount 分配数量
     */
    function receiveFromNFTToCreatorPool(uint256 amount) external nonReentrant {
        // 只允许NFT合约调用
        require(msg.sender == address(creatorNFT), "Only NFT contract can call this function");
        // 减去已使用额度，相当于增加可用额度，防止下溢
        if (creatorPoolUsed >= amount) {
            creatorPoolUsed -= amount;
        } else {
            creatorPoolUsed = 0;
        }
        emit CreatorPoolUpdated(amount, creatorPoolUsed);
    }
    
    /**
     * @dev 接收从NFT合约提取的代币并分配到互动池
     * @param amount 分配数量
     */
    function receiveFromNFTToInteractPool(uint256 amount) external nonReentrant {
        // 只允许NFT合约调用
        require(msg.sender == address(creatorNFT), "Only NFT contract can call this function");
        // 减去已使用额度，相当于增加可用额度，防止下溢
        if (interactPoolUsed >= amount) {
            interactPoolUsed -= amount;
        } else {
            interactPoolUsed = 0;
        }
        emit InteractPoolUpdated(amount, interactPoolUsed);
    }
    
    /**
     * @dev 从创作者池转移代币到NFT合约
     * @param amount 转移数量
     */
    function transferFromCreatorPoolToNFT(uint256 amount) external nonReentrant {
        // 只允许NFT合约调用
        require(msg.sender == address(creatorNFT), "Only NFT contract can call this function");
        // 确保创作者池有足够的代币
        require(creatorPoolUsed + amount <= CREATOR_POOL, "Creator pool exhausted");
        
        creatorPoolUsed += amount;
        // 执行转账
        _transfer(address(this), address(creatorNFT), amount);
        
        emit TokenTransfer(address(this), address(creatorNFT), amount);
        emit CreatorPoolUpdated(amount, creatorPoolUsed);
    }
    
    /**
     * @dev 从互动池转移代币到NFT合约
     * @param amount 转移数量
     */
    function transferFromInteractPoolToNFT(uint256 amount) external nonReentrant {
        // 只允许NFT合约调用
        require(msg.sender == address(creatorNFT), "Only NFT contract can call this function");
        // 确保互动池有足够的代币
        require(interactPoolUsed + amount <= INTERACT_POOL, "Interaction pool exhausted");
        
        interactPoolUsed += amount;
        // 执行转账
        _transfer(address(this), address(creatorNFT), amount);
        
        emit TokenTransfer(address(this), address(creatorNFT), amount);
        emit InteractPoolUpdated(amount, interactPoolUsed);
    }

    // ========== 辅助查询功能 ==========
    /**
     * @dev 获取创作者池当前的代币数量
     */
    function getCreatorPoolCurrent() public view returns (uint256) {
        return creatorPoolUsed;
    }
    
    /**
     * @dev 获取互动池当前的代币数量
     */
    function getInteractPoolCurrent() public view returns (uint256) {
        return interactPoolUsed;
    }
    
    /**
     * @dev 获取NFT池当前的代币数量
     */
    function getNftPoolCurrent() public view returns (uint256) {
        return nftPoolUsed;
    }
}