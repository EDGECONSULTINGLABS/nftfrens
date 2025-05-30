// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./ShareToken.sol";
import "./GovernanceModule.sol";

/**
 * @title VaultCore
 * @dev Main contract for each Social NFT Vault instance
 */
contract VaultCore is AccessControl, ReentrancyGuard, Pausable, ERC721Holder {
    using Address for address payable;
    
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // Custom errors for gas optimization
    error ZeroAmount();
    error InsufficientShares();
    error TransferFailed();
    error AlreadyInitialized();
    error InvalidAddress();
    error NotOwned();
    error NFTCollateralized();
    error PurchaseFailed();
    error SaleFailed();
    error PluginAlreadyAdded();
    error NotAPlugin();
    error ExcessiveETH();
    
    // Vault metadata
    uint256 public immutable vaultId;
    string public vaultURI;
    
    // Core contracts
    ShareToken public shareToken;
    GovernanceModule public governance;
    
    // Plugin registry
    address[] public plugins;
    mapping(address => bool) public isPlugin;
    
    // NFT tracking
    struct NFT {
        address contractAddress;
        uint256 tokenId;
        bool isCollateralized;
    }
    
    NFT[] public nfts;
    mapping(address => mapping(uint256 => bool)) public hasNFT;
    
    // State tracking
    bool public initialized;
    uint256 public totalContributed;
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 amount);
    event NFTPurchased(address indexed marketplace, address indexed nftContract, uint256 tokenId, uint256 price);
    event NFTSold(address indexed nftContract, uint256 tokenId, uint256 price);
    event PluginAdded(address indexed plugin);
    event PluginRemoved(address indexed plugin);
    event VaultPaused(address indexed by);
    event VaultUnpaused(address indexed by);
    
    constructor(
        uint256 _vaultId,
        address creator,
        string memory _vaultURI
    ) payable {
        vaultId = _vaultId;
        vaultURI = _vaultURI;
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, creator);
        _grantRole(GOVERNANCE_ROLE, creator);
        _grantRole(VAULT_MANAGER_ROLE, creator);
        _grantRole(TREASURER_ROLE, creator);
        _grantRole(GUARDIAN_ROLE, creator);
        
        // Accept initial deposit
        if (msg.value > 0) {
            totalContributed = msg.value;
        }
    }
    
    /**
     * @dev Initializes the vault with core contracts
     * @param _shareToken Address of the share token contract
     * @param _governance Address of the governance module
     */
    function initialize(
        address _shareToken,
        address payable _governance
    ) external {
        require(!initialized, "Already initialized");
        require(_shareToken != address(0), "Invalid share token");
        require(_governance != address(0), "Invalid governance");
        
        shareToken = ShareToken(_shareToken);
        governance = GovernanceModule(_governance);
        initialized = true;
        
        // Grant roles to share token
        _grantRole(MINTER_ROLE, _shareToken);
        _grantRole(BURNER_ROLE, _shareToken);
    }
    
    /**
     * @dev Deposits ETH into the vault
     */
    function deposit() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        
        uint256 shares = msg.value;
        totalContributed += msg.value;
        
        shareToken.mint(msg.sender, shares);
        
        emit Deposited(msg.sender, msg.value, shares);
        
        // Call plugins
        _callPlugins(abi.encodeWithSignature(
            "onDeposit(address,address,uint256,uint256)",
            address(this),
            msg.sender,
            msg.value,
            shares
        ));
    }
    
    /**
     * @dev Withdraws ETH from the vault
     * @param shares Amount of shares to burn
     */
    function withdraw(uint256 shares) external nonReentrant whenNotPaused {
        if (shares == 0) revert ZeroAmount();
        if (shareToken.balanceOf(msg.sender) < shares) revert InsufficientShares();
        
        // Calculate withdrawal amount
        uint256 totalShares = shareToken.totalSupply();
        uint256 vaultBalance = address(this).balance;
        uint256 amount = (vaultBalance * shares) / totalShares;
        
        // Burn shares first
        shareToken.burn(msg.sender, shares);
        
        // Transfer ETH
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit Withdrawn(msg.sender, shares, amount);
    }
    
    /**
     * @dev Purchases an NFT from a marketplace
     * @param marketplace Address of the marketplace contract
     * @param orderData Calldata for the marketplace purchase
     * @param price Price of the NFT
     */
    function buyNFT(
        address marketplace,
        bytes calldata orderData,
        uint256 price
    ) external nonReentrant whenNotPaused onlyRole(VAULT_MANAGER_ROLE) {
        if (price > address(this).balance) revert ExcessiveETH();
        
        // Execute the purchase
        (bool success, ) = marketplace.call{value: price}(orderData);
        require(success, "Purchase failed");
        
        // Get the NFT details from the order data
        (address nftContract, uint256 tokenId) = abi.decode(orderData[4:], (address, uint256));
        
        // Verify ownership
        require(IERC721(nftContract).ownerOf(tokenId) == address(this), "Purchase failed");
        
        // Record the NFT
        nfts.push(NFT({
            contractAddress: nftContract,
            tokenId: tokenId,
            isCollateralized: false
        }));
        hasNFT[nftContract][tokenId] = true;
        
        emit NFTPurchased(marketplace, nftContract, tokenId, price);
        
        // Call plugins
        _callPlugins(abi.encodeWithSignature(
            "onBuy(address,address,address,uint256,uint256)",
            address(this),
            marketplace,
            nftContract,
            tokenId,
            price
        ));
    }
    
    /**
     * @dev Sells an NFT through a marketplace
     * @param nftContract Address of the NFT contract
     * @param tokenId ID of the NFT
     * @param marketplace Address of the marketplace contract
     * @param orderData Calldata for the marketplace sale
     * @param minPrice Minimum price to accept
     */
    function sellNFT(
        address nftContract,
        uint256 tokenId,
        address marketplace,
        bytes calldata orderData,
        uint256 minPrice
    ) external nonReentrant whenNotPaused onlyRole(VAULT_MANAGER_ROLE) {
        if (!hasNFT[nftContract][tokenId]) revert NotOwned();
        if (nfts[_findNFTIndex(nftContract, tokenId)].isCollateralized) revert NFTCollateralized();
        
        // Approve the marketplace
        IERC721(nftContract).approve(marketplace, tokenId);
        
        // Execute the sale
        (bool success, ) = marketplace.call(orderData);
        require(success, "Sale failed");
        
        // Verify the NFT is gone
        require(IERC721(nftContract).ownerOf(tokenId) != address(this), "Sale failed");
        
        // Remove the NFT record
        _removeNFT(nftContract, tokenId);
        
        emit NFTSold(nftContract, tokenId, minPrice);
        
        // Call plugins
        _callPlugins(abi.encodeWithSignature(
            "onSell(address,address,uint256,uint256)",
            address(this),
            nftContract,
            tokenId,
            minPrice
        ));
    }
    
    /**
     * @dev Adds a plugin to the vault
     * @param plugin Address of the plugin contract
     */
    function addPlugin(address plugin) external onlyRole(GOVERNANCE_ROLE) {
        if (plugin == address(0)) revert InvalidAddress();
        if (isPlugin[plugin]) revert PluginAlreadyAdded();
        
        plugins.push(plugin);
        isPlugin[plugin] = true;
        
        emit PluginAdded(plugin);
    }
    
    /**
     * @dev Removes a plugin from the vault
     * @param plugin Address of the plugin contract
     */
    function removePlugin(address plugin) external onlyRole(GOVERNANCE_ROLE) {
        if (!isPlugin[plugin]) revert NotAPlugin();
        
        // Remove from array
        uint256 length = plugins.length;
        for (uint256 i = 0; i < length; i++) {
            if (plugins[i] == plugin) {
                plugins[i] = plugins[length - 1];
                plugins.pop();
                break;
            }
        }
        
        isPlugin[plugin] = false;
        
        emit PluginRemoved(plugin);
    }
    
    /**
     * @dev Pauses the vault
     */
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit VaultPaused(msg.sender);
    }
    
    /**
     * @dev Unpauses the vault
     */
    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
        emit VaultUnpaused(msg.sender);
    }
    
    /**
     * @dev Updates the vault metadata URI
     * @param newURI New metadata URI
     */
    function updateVaultURI(string memory newURI) external onlyRole(GOVERNANCE_ROLE) {
        vaultURI = newURI;
    }
    
    /**
     * @dev Returns the number of NFTs owned by the vault
     * @return Number of NFTs
     */
    function getNFTCount() external view returns (uint256) {
        return nfts.length;
    }
    
    /**
     * @dev Returns the total value of the vault in ETH
     * @return Total value
     */
    function getTotalValue() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Internal function to find the index of an NFT in the array
     * @param nftContract Address of the NFT contract
     * @param tokenId ID of the NFT
     * @return Index of the NFT
     */
    function _findNFTIndex(address nftContract, uint256 tokenId) internal view returns (uint256) {
        for (uint256 i = 0; i < nfts.length; i++) {
            if (nfts[i].contractAddress == nftContract && nfts[i].tokenId == tokenId) {
                return i;
            }
        }
        revert("NFT not found");
    }
    
    /**
     * @dev Internal function to remove an NFT from the array
     * @param nftContract Address of the NFT contract
     * @param tokenId ID of the NFT
     */
    function _removeNFT(address nftContract, uint256 tokenId) internal {
        uint256 index = _findNFTIndex(nftContract, tokenId);
        nfts[index] = nfts[nfts.length - 1];
        nfts.pop();
        hasNFT[nftContract][tokenId] = false;
    }
    
    /**
     * @dev Internal function to call all plugins
     * @param data Calldata to send to plugins
     */
    function _callPlugins(bytes memory data) internal {
        uint256 length = plugins.length;
        for (uint256 i = 0; i < length; i++) {
            address plugin = plugins[i];
            if (plugin.code.length > 0) {
                // Use low-level call with gas limit
                (bool success, ) = plugin.call{gas: 50000}(data);
                // Ignore failures to prevent DoS
                if (!success) {
                    // Could emit an event here for monitoring
                }
            }
        }
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Accept ETH transfers
    }
    
    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

/**
 * @title IPlugin
 * @dev Interface for vault plugins
 */
interface IPlugin {
    function onDeposit(address vault, address user, uint256 amount, uint256 shares) external;
    function onWithdraw(address vault, address user, uint256 shares, uint256 amount) external;
    function onNFTPurchased(address vault, address nftContract, uint256 tokenId, uint256 price) external;
    function onNFTSold(address vault, address nftContract, uint256 tokenId, uint256 price) external;
} 