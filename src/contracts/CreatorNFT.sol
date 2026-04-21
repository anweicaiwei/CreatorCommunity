// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// 枚举类型：定义三种NFT等级
enum NFTRank { BRONZE, SILVER, GOLD }

// 导入OpenZeppelin 5.0.2稳定版库
import "@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@5.0.2/access/Ownable.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";

// CreatorToken 合约接口（避免循环导入）
interface ICreatorToken {
    function receiveFromNFTToCreatorPool(uint256 amount) external;
    function receiveFromNFTToInteractPool(uint256 amount) external;
    function transferFromCreatorPoolToNFT(uint256 amount) external;
    function transferFromInteractPoolToNFT(uint256 amount) external;
    function transferFromUserForNFT(address from, uint256 amount) external;
}

contract CreatorNFT is ERC721, ERC721Enumerable, ERC721Burnable, Ownable, ReentrancyGuard {
    // ========== 核心配置 ==========
    // NFT代币ID计数器
    uint256 private _nextTokenId;
    // 关联ERC20 CTK合约地址
    IERC20 public immutable ctkToken;
    // 关联CreatorToken合约地址
    ICreatorToken public immutable creatorToken;
    // 代币提取阈值
    uint256 public withdrawalThreshold;
    // 合约最低余额阈值
    uint256 public constant MIN_BALANCE_THRESHOLD = 10000 * 10 ** 18;
    // NFT池初始设定值
    uint256 public constant NFT_POOL_INITIAL = 2000000 * 10 ** 18;
    
    // ========== 分配比例配置 ==========
    // 提取代币时分配给创作者池的比例
    uint256 public constant CREATOR_POOL_RATIO = 70;
    // 提取代币时分配给互动池的比例
    uint256 public constant INTERACT_POOL_RATIO = 30;
    // 比例总和（用于验证）
    uint256 public constant TOTAL_RATIO = CREATOR_POOL_RATIO + INTERACT_POOL_RATIO;

    // ========== NFT等级配置（对应不同兑换门槛） ==========
    mapping(uint256 => NFTRank) public nftRank;
    // 记录不同等级NFT的数量
    mapping(NFTRank => uint256) public nftRankCount;
    // 记录每个用户拥有的不同等级NFT数量
    mapping(address => mapping(NFTRank => uint256)) public userNFTRankCount;
    
    // 不同等级NFT的兑换价格
    uint256 public bronzePrice = 1000 * 10 ** 18;  // 青铜勋章：1000 CTK
    uint256 public silverPrice = 5000 * 10 ** 18;  // 白银勋章：5000 CTK
    uint256 public goldPrice = 10000 * 10 ** 18;   // 黄金勋章：10000 CTK

    // ========== 事件记录 ==========
    event NFTMinted(address indexed minter, uint256 indexed tokenId, NFTRank rank); // NFT铸造事件
    event NFTBurned(address indexed burner, uint256 indexed tokenId, NFTRank rank); // NFT销毁事件
    event NFTTransferred(address indexed from, address indexed to, uint256 indexed tokenId, NFTRank rank); // NFT转移事件
    event CTKWithdrawn(address indexed owner, uint256 amount); // CTK提取事件
    event CTKReceived(address indexed from, uint256 amount); // CTK接收事件
    event NFTPriceUpdated(NFTRank indexed rank, uint256 oldPrice, uint256 newPrice); // NFT价格更新事件
    event OverflowHandled(uint256 overflowAmount, uint256 creatorPoolAmount, uint256 interactPoolAmount); // 溢出处理事件

    /**
     * @dev 构造函数：合约部署时自动执行，初始化NFT信息，绑定CTK合约地址
     * @param _creatorTokenAddress CreatorToken合约地址
     */
    constructor(address _creatorTokenAddress)
        ERC721("Creator Medal NFT", "CMN") // 初始化NFT名称和符号
        Ownable(msg.sender) // 初始化合约所有者为部署者
    {
        // 安全检查：确保传入的CreatorToken合约地址不是零地址
        require(_creatorTokenAddress != address(0), "Invalid CreatorToken address");
        // 存储CreatorToken合约地址（使用接口类型避免循环导入）
        creatorToken = ICreatorToken(_creatorTokenAddress);
        // 从CreatorToken合约获取CTK代币地址（IERC20接口与ERC20兼容）
        ctkToken = IERC20(_creatorTokenAddress);
        // 初始化NFT ID从1开始
        _nextTokenId = 1;
        // 初始化提取阈值为0
        withdrawalThreshold = 0;
    }

    // ========== 管理员功能 ==========
    // ---------- CTK提取功能 ----------
    /**
     * @dev 检查并处理NFT合约代币溢出
     * 当合约余额超过NFT池初始设定值时，自动将多余代币按比例提取到其他池子
     */
    function checkAndHandleOverflow() internal {
        // 检查合约余额
        uint256 balance = ctkToken.balanceOf(address(this));

        // 检查是否超过初始设定值
        if (balance > NFT_POOL_INITIAL) {
            // 计算溢出金额
            uint256 overflowAmount = balance - NFT_POOL_INITIAL;

            // 使用减法确保总和精确等于 overflowAmount，避免整数除法精度损失
            uint256 creatorPoolAmount = (overflowAmount * CREATOR_POOL_RATIO) / 100;
            uint256 interactPoolAmount = overflowAmount - creatorPoolAmount;
            
            // 执行CTK转账到CreatorToken合约
            bool success = ctkToken.transfer(address(creatorToken), overflowAmount);
            require(success, "CTK transfer to CreatorToken failed");
            
            // 调用CreatorToken合约的分配函数，将代币分配到各个池
            creatorToken.receiveFromNFTToCreatorPool(creatorPoolAmount);
            creatorToken.receiveFromNFTToInteractPool(interactPoolAmount);
            
            // 触发溢出处理事件
            emit OverflowHandled(overflowAmount, creatorPoolAmount, interactPoolAmount);
        }
    }

    // ========== 核心用户功能 ==========
    // ---------- NFT兑换功能 ----------
    /**
     * @dev 兑换青铜勋章NFT
     */
    function mintBronzeNFT() external {
        _mintNFT(NFTRank.BRONZE, bronzePrice);
    }

    /**
     * @dev 兑换白银勋章NFT
     */
    function mintSilverNFT() external {
        _mintNFT(NFTRank.SILVER, silverPrice);
    }

    /**
     * @dev 兑换黄金勋章NFT
     */
    function mintGoldNFT() external {
        _mintNFT(NFTRank.GOLD, goldPrice);
    }

    /**
     * @dev 内部通用mint函数
     * @param rank NFT等级
     * @param price 兑换所需的CTK数量
     */
    function _mintNFT(NFTRank rank, uint256 price) internal nonReentrant {
        // 安全检查：用户账户必须有足够的CTK余额
        require(ctkToken.balanceOf(msg.sender) >= price, "Insufficient CTK balance");
        
        // 执行CTK转账：从用户账户扣减CTK，转入本NFT合约地址
        // 使用token合约的特殊函数，不需要用户授权
        creatorToken.transferFromUserForNFT(msg.sender, price);
        
        // 触发CTK接收事件
        emit CTKReceived(msg.sender, price);
        
        // 执行NFT铸造：给用户mint一个新的NFT
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        // 记录该NFT的等级
        nftRank[tokenId] = rank;
        // 更新对应等级NFT的数量
        nftRankCount[rank]++;
        // 更新用户拥有的对应等级NFT数量
        userNFTRankCount[msg.sender][rank]++;
        
        // 更新提取阈值：加上NFT价值的80%，确保有足够的CTK用于销毁返还
        withdrawalThreshold += (price * 80) / 100;
        
        // 触发铸造事件，链上可查
        emit NFTMinted(msg.sender, tokenId, rank);
        
        // 检查并处理代币溢出
        checkAndHandleOverflow();
    }

    // ---------- NFT销毁功能 ----------
    /**
     * @dev 用户销毁自己的NFT，可获得80%的CTK返还
     * @param tokenId 要销毁的NFT ID
     */
    function burnNFTForRefund(uint256 tokenId) external nonReentrant {
        // 安全检查：调用者必须是该NFT的所有者
        require(ownerOf(tokenId) == msg.sender, "You are not the owner of this NFT");

        // 获取该NFT的等级和对应兑换价格
        NFTRank rank = nftRank[tokenId];
        uint256 price;
        if (rank == NFTRank.BRONZE) price = bronzePrice;
        else if (rank == NFTRank.SILVER) price = silverPrice;
        else price = goldPrice;

        // 计算返还金额：80%的当前NFT价值
        uint256 refundAmount = (price * 80) / 100;

        // 检查合约余额是否足够，不足时补充
        uint256 balance = ctkToken.balanceOf(address(this));
        if (balance < refundAmount) {
            // 计算需要补充的金额，至少为10000 CTK
            uint256 neededAmount = refundAmount > MIN_BALANCE_THRESHOLD ? refundAmount : MIN_BALANCE_THRESHOLD;
            uint256 supplementAmount = neededAmount - balance;

            // 按照50:30的比例从创作者池和互动池抽取代币
            uint256 creatorPoolAmount = (supplementAmount * CREATOR_POOL_RATIO) / (CREATOR_POOL_RATIO + INTERACT_POOL_RATIO);
            uint256 interactPoolAmount = supplementAmount - creatorPoolAmount;

            // 从创作者池转移代币
            creatorToken.transferFromCreatorPoolToNFT(creatorPoolAmount);
            // 从互动池转移代币
            creatorToken.transferFromInteractPoolToNFT(interactPoolAmount);
        }

        // 更新所有状态（Effects）
        _burn(tokenId);
        nftRankCount[rank]--;
        userNFTRankCount[msg.sender][rank]--;

        // 更新提取阈值
        if (refundAmount >= withdrawalThreshold) {
            withdrawalThreshold = 0;
        } else {
            withdrawalThreshold -= refundAmount;
        }

        delete nftRank[tokenId];

        // 最后执行外部调用（Interaction）
        emit NFTBurned(msg.sender, tokenId, rank);

        bool success = ctkToken.transfer(msg.sender, refundAmount);
        require(success, "CTK refund failed");
    }

    // ---------- CTK提取功能 ----------
    /**
     * @dev 仅合约所有者（你的主管理员账号）可调用
     * 将合约中积累的CTK回流到CreatorToken合约的各个激励池
     */
    function withdrawCTK() external onlyOwner nonReentrant {
        // 安全检查：合约中必须有可提取的CTK
        uint256 balance = ctkToken.balanceOf(address(this));
        require(balance > 0, "No CTK to withdraw");
        
        // 安全检查：提取后余额不能低于最低余额阈值，确保有足够的CTK用于用户销毁NFT时的返还
        require(balance >= MIN_BALANCE_THRESHOLD, "Insufficient CTK to maintain minimum balance");
        
        // 安全检查：提取后余额不能低于动态计算的阈值，确保有足够的CTK用于用户销毁NFT时的返还
        require(balance >= withdrawalThreshold, "Insufficient CTK to maintain withdrawal threshold");
        
        // 计算可提取的CTK金额：总余额减去较大的阈值
        uint256 threshold = withdrawalThreshold > MIN_BALANCE_THRESHOLD ? withdrawalThreshold : MIN_BALANCE_THRESHOLD;
        uint256 withdrawableAmount = balance - threshold;
        require(withdrawableAmount > 0, "No CTK available for withdrawal after maintaining threshold");
        
        // 计算分配给各个池的金额（使用减法确保总和正确）
        uint256 creatorPoolAmount = (withdrawableAmount * CREATOR_POOL_RATIO) / 100;
        uint256 interactPoolAmount = withdrawableAmount - creatorPoolAmount;
        
        // 执行CTK转账到CreatorToken合约
        bool success = ctkToken.transfer(address(creatorToken), withdrawableAmount);
        require(success, "CTK transfer to CreatorToken failed");
        
        // 调用CreatorToken合约的分配函数，将代币分配到各个池
        creatorToken.receiveFromNFTToCreatorPool(creatorPoolAmount);
        creatorToken.receiveFromNFTToInteractPool(interactPoolAmount);
        
        // 触发提取事件，链上可查
        emit CTKWithdrawn(owner(), withdrawableAmount);
    }

    // ---------- NFT转移功能 ----------
    /**
     * @dev 重写transferFrom函数，添加NFT转移事件
     */
    function transferFrom(address from, address to, uint256 tokenId) public virtual override(ERC721, IERC721) {
        NFTRank rank = nftRank[tokenId];
        // 先更新用户NFT等级计数
        userNFTRankCount[from][rank]--;
        userNFTRankCount[to][rank]++;
        // 再调用父函数执行实际转移
        super.transferFrom(from, to, tokenId);
        emit NFTTransferred(from, to, tokenId, rank);
    }

    /**
     * @dev 重写safeTransferFrom函数（带数据版本），添加NFT转移事件
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual override(ERC721, IERC721) {
        NFTRank rank = nftRank[tokenId];
        // 先更新用户NFT等级计数
        userNFTRankCount[from][rank]--;
        userNFTRankCount[to][rank]++;
        // 再调用父函数执行实际转移
        super.safeTransferFrom(from, to, tokenId, data);
        emit NFTTransferred(from, to, tokenId, rank);
    }

    // ---------- NFT价格管理功能 ----------
    // NFT初始价格常量
    uint256 public constant INITIAL_BRONZE_PRICE = 1000 * 10 ** 18;  // 青铜勋章初始价格：1000 CTK
    uint256 public constant INITIAL_SILVER_PRICE = 5000 * 10 ** 18;  // 白银勋章初始价格：5000 CTK
    uint256 public constant INITIAL_GOLD_PRICE = 10000 * 10 ** 18;   // 黄金勋章初始价格：10000 CTK

    /**
     * @dev 随机调整NFT价格（只能由合约创建者调用）
     * 每次调用时，根据当前价格进行正负10%以内的随机调整
     * 同时确保：
     * 1. 低1等级NFT价值不能超过高1等级NFT价值的70%
     * 2. 每个NFT价值最低不能低于初始值的50%
     * 3. 每个NFT价值最高不能超过初始值的150%
     */
    function randomlyAdjustNFTPrice() external onlyOwner {
        // 生成随机种子（基于区块时间和区块哈希）
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, blockhash(block.number - 1), msg.sender)));
        
        // 调整青铜勋章价格
        uint256 oldBronzePrice = bronzePrice;
        uint256 bronzeRandom = seed % 21;
        if (bronzeRandom >= 10) {
            // 涨价 0% 到 +10%
            uint256 upPercent = bronzeRandom - 10;
            bronzePrice = oldBronzePrice + (oldBronzePrice * upPercent) / 100;
        } else {
            // 降价 -10% 到 -1%
            uint256 downPercent = 10 - bronzeRandom;
            bronzePrice = oldBronzePrice - (oldBronzePrice * downPercent) / 100;
        }
        
        // 调整白银勋章价格
        uint256 oldSilverPrice = silverPrice;
        uint256 silverRandom = (seed >> 8) % 21;
        if (silverRandom >= 10) {
            // 涨价 0% 到 +10%
            uint256 upPercent = silverRandom - 10;
            silverPrice = oldSilverPrice + (oldSilverPrice * upPercent) / 100;
        } else {
            // 降价 -10% 到 -1%
            uint256 downPercent = 10 - silverRandom;
            silverPrice = oldSilverPrice - (oldSilverPrice * downPercent) / 100;
        }
        
        // 调整黄金勋章价格
        uint256 oldGoldPrice = goldPrice;
        uint256 goldRandom = (seed >> 16) % 21;
        if (goldRandom >= 10) {
            // 涨价 0% 到 +10%
            uint256 upPercent = goldRandom - 10;
            goldPrice = oldGoldPrice + (oldGoldPrice * upPercent) / 100;
        } else {
            // 降价 -10% 到 -1%
            uint256 downPercent = 10 - goldRandom;
            goldPrice = oldGoldPrice - (oldGoldPrice * downPercent) / 100;
        }
        
        // 应用价格限制
        _applyPriceConstraints();
        
        // 调整提取阈值：根据当前NFT数量和新价格重新计算
        _adjustWithdrawalThreshold();
        
        // 触发价格更新事件
        emit NFTPriceUpdated(NFTRank.BRONZE, oldBronzePrice, bronzePrice);
        emit NFTPriceUpdated(NFTRank.SILVER, oldSilverPrice, silverPrice);
        emit NFTPriceUpdated(NFTRank.GOLD, oldGoldPrice, goldPrice);
    }

    /**
     * @dev 应用NFT价格限制
     */
    function _applyPriceConstraints() internal {
        // 1. 应用每个NFT的价格上下限（初始值的50%-150%）
        bronzePrice = _clamp(bronzePrice, INITIAL_BRONZE_PRICE * 50 / 100, INITIAL_BRONZE_PRICE * 150 / 100);
        silverPrice = _clamp(silverPrice, INITIAL_SILVER_PRICE * 50 / 100, INITIAL_SILVER_PRICE * 150 / 100);
        goldPrice = _clamp(goldPrice, INITIAL_GOLD_PRICE * 50 / 100, INITIAL_GOLD_PRICE * 150 / 100);
        
        // 2. 确保低等级NFT价格不超过高等级NFT价格的70%
        if (bronzePrice > silverPrice * 70 / 100) {
            bronzePrice = silverPrice * 70 / 100;
        }
        if (silverPrice > goldPrice * 70 / 100) {
            silverPrice = goldPrice * 70 / 100;
        }
    }

    /**
     * @dev 将值限制在指定范围内
     */
    function _clamp(uint256 value, uint256 min, uint256 max) internal pure returns (uint256) {
        if (value < min) {
            return min;
        }
        if (value > max) {
            return max;
        }
        return value;
    }

    /**
     * @dev 重置NFT价格到初始值（只能由合约创建者调用）
     * 青铜勋章：1000 CTK
     * 白银勋章：5000 CTK
     * 黄金勋章：10000 CTK
     */
    function resetNFTPrice() external onlyOwner {
        // 重置青铜勋章价格
        uint256 oldBronzePrice = bronzePrice;
        bronzePrice = INITIAL_BRONZE_PRICE;
        emit NFTPriceUpdated(NFTRank.BRONZE, oldBronzePrice, bronzePrice);
        
        // 重置白银勋章价格
        uint256 oldSilverPrice = silverPrice;
        silverPrice = INITIAL_SILVER_PRICE;
        emit NFTPriceUpdated(NFTRank.SILVER, oldSilverPrice, silverPrice);
        
        // 重置黄金勋章价格
        uint256 oldGoldPrice = goldPrice;
        goldPrice = INITIAL_GOLD_PRICE;
        emit NFTPriceUpdated(NFTRank.GOLD, oldGoldPrice, goldPrice);
        
        // 调整提取阈值：根据当前NFT数量和新价格重新计算
        _adjustWithdrawalThreshold();
    }

    /**
     * @dev 根据当前NFT数量和价格调整提取阈值
     */
    function _adjustWithdrawalThreshold() internal {
        // 计算当前所有NFT的总价值的80%作为新的提取阈值
        uint256 totalValue = nftRankCount[NFTRank.BRONZE] * bronzePrice + 
                             nftRankCount[NFTRank.SILVER] * silverPrice + 
                             nftRankCount[NFTRank.GOLD] * goldPrice;
        withdrawalThreshold = (totalValue * 80) / 100;
    }

    // ========== 辅助查询功能 ==========
    /**
     * @dev 查询下一个即将铸造的NFT ID
     */
    function getNextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev 查询当前动态提取阈值
     */
    function getCurrentWithdrawalThreshold() external view returns (uint256) {
        return withdrawalThreshold;
    }

    /**
     * @dev 查询当前可提取的代币数量
     */
    function getWithdrawableAmount() external view returns (uint256) {
        uint256 balance = ctkToken.balanceOf(address(this));
        uint256 threshold = withdrawalThreshold > MIN_BALANCE_THRESHOLD ? withdrawalThreshold : MIN_BALANCE_THRESHOLD;
        if (balance <= threshold) {
            return 0;
        }
        return balance - threshold;
    }

    /**
     * @dev 查询指定地址拥有的所有NFT ID列表
     * @param owner 要查询的钱包地址
     */
    function getNFTsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);

        // 使用 ERC721Enumerable 的 tokenOfOwnerByIndex 函数
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @dev 查询不同等级NFT的数量
     * @return bronzeCount 青铜勋章数量
     * @return silverCount 白银勋章数量
     * @return goldCount 黄金勋章数量
     */
    function getNFTRankCounts() external view returns (uint256 bronzeCount, uint256 silverCount, uint256 goldCount) {
        bronzeCount = nftRankCount[NFTRank.BRONZE];
        silverCount = nftRankCount[NFTRank.SILVER];
        goldCount = nftRankCount[NFTRank.GOLD];
    }

    /**
     * @dev 查询指定地址拥有的NFT数量
     * @param owner 要查询的钱包地址
     */
    function getNFTCountByOwner(address owner) external view returns (uint256) {
        return balanceOf(owner);
    }

    /**
     * @dev 查询指定地址拥有的不同等级NFT数量
     * @param owner 要查询的钱包地址
     * @return bronzeCount 青铜勋章数量
     * @return silverCount 白银勋章数量
     * @return goldCount 黄金勋章数量
     */
    function getNFTRankCountsByOwner(address owner) external view returns (uint256 bronzeCount, uint256 silverCount, uint256 goldCount) {
        bronzeCount = userNFTRankCount[owner][NFTRank.BRONZE];
        silverCount = userNFTRankCount[owner][NFTRank.SILVER];
        goldCount = userNFTRankCount[owner][NFTRank.GOLD];
    }
    
    /**
     * @dev 查看用户拥有的不同等级NFT数量（用于外部合约调用）
     * @param user 用户地址
     * @param rank NFT等级（0: BRONZE, 1: SILVER, 2: GOLD）
     * @return 该等级NFT的数量
     */
    function getUserNFTRankCount(address user, uint8 rank) external view returns (uint256) {
        if (rank == 0) {
            return userNFTRankCount[user][NFTRank.BRONZE];
        } else if (rank == 1) {
            return userNFTRankCount[user][NFTRank.SILVER];
        } else if (rank == 2) {
            return userNFTRankCount[user][NFTRank.GOLD];
        } else {
            return 0;
        }
    }

    // ========== 必需的函数重写 ==========
    /**
     * @dev 重写supportsInterface函数以支持ERC721Enumerable
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev 重写_update函数以支持ERC721Enumerable
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev 重写_increaseBalance函数以支持ERC721Enumerable
     */
    function _increaseBalance(address account, uint128 value) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

}