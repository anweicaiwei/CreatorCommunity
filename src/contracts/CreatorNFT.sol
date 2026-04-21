// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

enum NFTRank { BRONZE, SILVER, GOLD }

import "@openzeppelin/contracts@5.0.2/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@5.0.2/access/Ownable.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts@5.0.2/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";

interface ICreatorToken {
    function receiveFromNFTToCreatorPool(uint256 amount) external;
    function receiveFromNFTToInteractPool(uint256 amount) external;
    function transferFromCreatorPoolToNFT(uint256 amount) external;
    function transferFromInteractPoolToNFT(uint256 amount) external;
    function transferFromUserForNFT(address from, uint256 amount) external;
}

contract CreatorNFT is ERC721, ERC721Enumerable, ERC721Burnable, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;                          // NFT ID自增计数器
    IERC20 public immutable ctkToken;                    // CTK代币合约（ERC20接口）
    ICreatorToken public immutable creatorToken;         // CreatorToken合约（互操作接口）
    uint256 public withdrawalThreshold;                  // 动态提取阈值（所有NFT价值×80%）
    uint256 public constant MIN_BALANCE_THRESHOLD = 10000 * 10 ** 18;  // 合约最低CTK余额阈值10000
    uint256 public constant NFT_POOL_INITIAL = 2000000 * 10 ** 18;     // NFT池初始注入金额200万CTK

    // 溢出分配比例：70%创作者池+30%互动池
    uint256 public constant CREATOR_POOL_RATIO = 70;
    uint256 public constant INTERACT_POOL_RATIO = 30;

    // ========== NFT等级 ==========
    mapping(uint256 => NFTRank) public nftRank;                       // tokenId→等级映射
    mapping(NFTRank => uint256) public nftRankCount;                  // 各等级NFT总量
    mapping(address => mapping(NFTRank => uint256)) public userNFTRankCount;  // 用户持有各等级NFT数量

    uint256 public bronzePrice = 1000 * 10 ** 18;     // 青铜勋章价格1000 CTK
    uint256 public silverPrice = 5000 * 10 ** 18;     // 白银勋章价格5000 CTK
    uint256 public goldPrice = 10000 * 10 ** 18;      // 黄金勋章价格10000 CTK

    // ========== 事件 ==========
    event NFTMinted(address indexed minter, uint256 indexed tokenId, NFTRank rank);
    event NFTBurned(address indexed burner, uint256 indexed tokenId, NFTRank rank);
    event NFTTransferred(address indexed from, address indexed to, uint256 indexed tokenId, NFTRank rank);
    event CTKWithdrawn(address indexed owner, uint256 amount);
    event CTKReceived(address indexed from, uint256 amount);
    event NFTPriceUpdated(NFTRank indexed rank, uint256 oldPrice, uint256 newPrice);
    event OverflowHandled(uint256 overflowAmount, uint256 creatorPoolAmount, uint256 interactPoolAmount);

    constructor(address _creatorTokenAddress)
        ERC721("Creator Medal NFT", "CMN")
        Ownable(msg.sender)
    {
        require(_creatorTokenAddress != address(0), "Invalid address");
        creatorToken = ICreatorToken(_creatorTokenAddress);
        ctkToken = IERC20(_creatorTokenAddress);
        _nextTokenId = 1;
    }

    // ========== 溢出处理 ==========

    function checkAndHandleOverflow() internal {
        uint256 balance = ctkToken.balanceOf(address(this));
        if (balance > NFT_POOL_INITIAL) {
            uint256 overflow = balance - NFT_POOL_INITIAL;
            uint256 cpAmt = (overflow * CREATOR_POOL_RATIO) / 100;
            uint256 ipAmt = overflow - cpAmt;
            bool ok = ctkToken.transfer(address(creatorToken), overflow);
            require(ok, "Transfer failed");
            creatorToken.receiveFromNFTToCreatorPool(cpAmt);
            creatorToken.receiveFromNFTToInteractPool(ipAmt);
            emit OverflowHandled(overflow, cpAmt, ipAmt);
        }
    }

    // ========== NFT铸造 ==========

    function mintBronzeNFT() external whenNotPaused { _mintNFT(NFTRank.BRONZE, bronzePrice); }
    function mintSilverNFT() external whenNotPaused { _mintNFT(NFTRank.SILVER, silverPrice); }
    function mintGoldNFT() external whenNotPaused { _mintNFT(NFTRank.GOLD, goldPrice); }

    function _mintNFT(NFTRank rank, uint256 price) internal nonReentrant {
        require(ctkToken.balanceOf(msg.sender) >= price, "Insufficient CTK");
        creatorToken.transferFromUserForNFT(msg.sender, price);
        emit CTKReceived(msg.sender, price);
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        nftRank[tokenId] = rank;
        nftRankCount[rank]++;
        userNFTRankCount[msg.sender][rank]++;
        withdrawalThreshold += (price * 80) / 100;
        emit NFTMinted(msg.sender, tokenId, rank);
        checkAndHandleOverflow();
    }

    // ========== NFT销毁返还80% ==========

    function burnNFTForRefund(uint256 tokenId) external whenNotPaused nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        NFTRank rank = nftRank[tokenId];
        uint256 price = rank == NFTRank.BRONZE ? bronzePrice : rank == NFTRank.SILVER ? silverPrice : goldPrice;
        uint256 refund = (price * 80) / 100;
        uint256 balance = ctkToken.balanceOf(address(this));
        if (balance < refund) {
            uint256 need = refund > MIN_BALANCE_THRESHOLD ? refund : MIN_BALANCE_THRESHOLD;
            uint256 sup = need - balance;
            uint256 cpSup = (sup * CREATOR_POOL_RATIO) / (CREATOR_POOL_RATIO + INTERACT_POOL_RATIO);
            creatorToken.transferFromCreatorPoolToNFT(cpSup);
            creatorToken.transferFromInteractPoolToNFT(sup - cpSup);
        }
        _burn(tokenId);
        nftRankCount[rank]--;
        userNFTRankCount[msg.sender][rank]--;
        withdrawalThreshold = refund >= withdrawalThreshold ? 0 : withdrawalThreshold - refund;
        delete nftRank[tokenId];
        emit NFTBurned(msg.sender, tokenId, rank);
        bool ok = ctkToken.transfer(msg.sender, refund);
        require(ok, "Refund failed");
    }

    // ========== CTK提取（管理员） ==========

    function withdrawCTK() external onlyOwner nonReentrant {
        uint256 balance = ctkToken.balanceOf(address(this));
        require(balance > 0, "No CTK");
        uint256 threshold = withdrawalThreshold > MIN_BALANCE_THRESHOLD ? withdrawalThreshold : MIN_BALANCE_THRESHOLD;
        require(balance > threshold, "Below threshold");
        uint256 withdrawable = balance - threshold;
        uint256 cpAmt = (withdrawable * CREATOR_POOL_RATIO) / 100;
        bool ok = ctkToken.transfer(address(creatorToken), withdrawable);
        require(ok, "Transfer failed");
        creatorToken.receiveFromNFTToCreatorPool(cpAmt);
        creatorToken.receiveFromNFTToInteractPool(withdrawable - cpAmt);
        emit CTKWithdrawn(owner(), withdrawable);
    }

    // ========== NFT转移 ==========

    function transferFrom(address from, address to, uint256 tokenId) public virtual override(ERC721, IERC721) {
        NFTRank rank = nftRank[tokenId];
        userNFTRankCount[from][rank]--;
        userNFTRankCount[to][rank]++;
        super.transferFrom(from, to, tokenId);
        emit NFTTransferred(from, to, tokenId, rank);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public virtual override(ERC721, IERC721) {
        NFTRank rank = nftRank[tokenId];
        userNFTRankCount[from][rank]--;
        userNFTRankCount[to][rank]++;
        super.safeTransferFrom(from, to, tokenId, data);
        emit NFTTransferred(from, to, tokenId, rank);
    }

    // ========== NFT价格管理 ==========

    uint256 public constant INITIAL_BRONZE_PRICE = 1000 * 10 ** 18;    // 青铜初始价格（调价基准）
    uint256 public constant INITIAL_SILVER_PRICE = 5000 * 10 ** 18;   // 白银初始价格（调价基准）
    uint256 public constant INITIAL_GOLD_PRICE = 10000 * 10 ** 18;    // 黄金初始价格（调价基准）

    // 随机调价±10%，受50%-150%初始值和等级约束限制
    function randomlyAdjustNFTPrice() external onlyOwner {
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, blockhash(block.number - 1), msg.sender)));
        uint256 ob = bronzePrice; bronzePrice = _adjust(seed % 21, ob);
        uint256 os = silverPrice; silverPrice = _adjust((seed >> 8) % 21, os);
        uint256 og = goldPrice;   goldPrice   = _adjust((seed >> 16) % 21, og);
        _applyPriceConstraints();
        _adjustWithdrawalThreshold();
        emit NFTPriceUpdated(NFTRank.BRONZE, ob, bronzePrice);
        emit NFTPriceUpdated(NFTRank.SILVER, os, silverPrice);
        emit NFTPriceUpdated(NFTRank.GOLD, og, goldPrice);
    }

    function _adjust(uint256 r, uint256 old) internal pure returns (uint256) {
        return r >= 10 ? old + (old * (r - 10)) / 100 : old - (old * (10 - r)) / 100;
    }

    function _applyPriceConstraints() internal {
        bronzePrice = _clamp(bronzePrice, INITIAL_BRONZE_PRICE / 2, INITIAL_BRONZE_PRICE * 3 / 2);
        silverPrice = _clamp(silverPrice, INITIAL_SILVER_PRICE / 2, INITIAL_SILVER_PRICE * 3 / 2);
        goldPrice = _clamp(goldPrice, INITIAL_GOLD_PRICE / 2, INITIAL_GOLD_PRICE * 3 / 2);
        if (bronzePrice > silverPrice * 70 / 100) bronzePrice = silverPrice * 70 / 100;
        if (silverPrice > goldPrice * 70 / 100) silverPrice = goldPrice * 70 / 100;
    }

    function _clamp(uint256 v, uint256 lo, uint256 hi) internal pure returns (uint256) {
        return v < lo ? lo : v > hi ? hi : v;
    }

    function resetNFTPrice() external onlyOwner {
        uint256 ob = bronzePrice; bronzePrice = INITIAL_BRONZE_PRICE;
        uint256 os = silverPrice; silverPrice = INITIAL_SILVER_PRICE;
        uint256 og = goldPrice;   goldPrice   = INITIAL_GOLD_PRICE;
        _adjustWithdrawalThreshold();
        emit NFTPriceUpdated(NFTRank.BRONZE, ob, bronzePrice);
        emit NFTPriceUpdated(NFTRank.SILVER, os, silverPrice);
        emit NFTPriceUpdated(NFTRank.GOLD, og, goldPrice);
    }

    function _adjustWithdrawalThreshold() internal {
        withdrawalThreshold = (nftRankCount[NFTRank.BRONZE] * bronzePrice
            + nftRankCount[NFTRank.SILVER] * silverPrice
            + nftRankCount[NFTRank.GOLD] * goldPrice) * 80 / 100;
    }

    // ========== 查询 ==========

    function getWithdrawableAmount() external view returns (uint256) {
        uint256 b = ctkToken.balanceOf(address(this));
        uint256 t = withdrawalThreshold > MIN_BALANCE_THRESHOLD ? withdrawalThreshold : MIN_BALANCE_THRESHOLD;
        return b <= t ? 0 : b - t;
    }

    function getNFTsByOwner(address _owner) external view returns (uint256[] memory) {
        uint256 b = balanceOf(_owner);
        uint256[] memory ids = new uint256[](b);
        for (uint256 i = 0; i < b; i++) ids[i] = tokenOfOwnerByIndex(_owner, i);
        return ids;
    }

    function getNFTRankCounts() external view returns (uint256 bc, uint256 sc, uint256 gc) {
        bc = nftRankCount[NFTRank.BRONZE];
        sc = nftRankCount[NFTRank.SILVER];
        gc = nftRankCount[NFTRank.GOLD];
    }

    function getNFTRankCountsByOwner(address _owner) external view returns (uint256 bc, uint256 sc, uint256 gc) {
        bc = userNFTRankCount[_owner][NFTRank.BRONZE];
        sc = userNFTRankCount[_owner][NFTRank.SILVER];
        gc = userNFTRankCount[_owner][NFTRank.GOLD];
    }

    function getUserNFTRankCount(address user, uint8 rank) external view returns (uint256) {
        if (rank == 0) return userNFTRankCount[user][NFTRank.BRONZE];
        if (rank == 1) return userNFTRankCount[user][NFTRank.SILVER];
        if (rank == 2) return userNFTRankCount[user][NFTRank.GOLD];
        return 0;
    }

    // ========== ERC721Enumerable必要重写 ==========

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    // ========== 合约停用 ==========

    bool public isPaused;  // 合约暂停状态

    modifier whenNotPaused() {
        require(!isPaused, "Paused");
        _;
    }

    // 回收CTK到CreatorToken并永久暂停
    function recoverCTK() external onlyOwner {
        uint256 b = ctkToken.balanceOf(address(this));
        if (b > 0) {
            bool ok = ctkToken.transfer(address(creatorToken), b);
            require(ok, "Transfer failed");
        }
        isPaused = true;
    }
}