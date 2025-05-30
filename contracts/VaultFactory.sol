// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./VaultCore.sol";
import "./ShareToken.sol";

/**
 * @title VaultFactory
 * @dev Factory contract for deploying new Social NFT Vault instances
 */
contract VaultFactory is AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VAULT_CREATOR_ROLE = keccak256("VAULT_CREATOR_ROLE");

    Counters.Counter private _vaultIds;
    
    // Mapping of vault ID to vault address
    mapping(uint256 => address) public vaults;
    
    struct VaultMetadata {
        string name;
        string description;
        string imageURI;
    }

    mapping(uint256 => VaultMetadata) public vaultMetadata;
    
    // Events
    event VaultCreated(uint256 indexed vaultId, address indexed vaultAddress, address indexed creator, string metadataURI);
    event VaultMetadataUpdated(uint256 indexed vaultId, string name, string description, string imageURI);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VAULT_CREATOR_ROLE, msg.sender);
    }

    /**
     * @dev Creates a new vault instance
     * @param metadataURI IPFS hash or URI containing vault metadata
     * @param initialDeposit Initial ETH deposit amount
     * @return vaultId The unique ID of the created vault
     * @return vaultAddress The address of the deployed vault contract
     */
    function createVault(
        string memory metadataURI,
        uint256 initialDeposit
    ) external payable onlyRole(VAULT_CREATOR_ROLE) returns (uint256 vaultId, address vaultAddress) {
        require(msg.value == initialDeposit, "Incorrect deposit amount");
        
        // Increment vault ID counter
        _vaultIds.increment();
        vaultId = _vaultIds.current();
        
        // Deploy new vault
        VaultCore newVault = new VaultCore{value: initialDeposit}(
            vaultId,
            msg.sender,
            metadataURI
        );
        
        vaultAddress = address(newVault);
        vaults[vaultId] = vaultAddress;
        vaultMetadata[vaultId] = VaultMetadata(metadataURI, "", "");
        
        emit VaultCreated(vaultId, vaultAddress, msg.sender, metadataURI);
        
        return (vaultId, vaultAddress);
    }

    /**
     * @dev Updates the metadata for a vault
     * @param vaultId The ID of the vault to update
     * @param name The new name for the vault
     * @param description The new description for the vault
     * @param imageURI The new image URI for the vault
     */
    function updateVaultMetadata(
        uint256 vaultId,
        string memory name,
        string memory description,
        string memory imageURI
    ) external {
        address payable vaultAddress = payable(vaults[vaultId]);
        require(vaultAddress != address(0), "Vault does not exist");
        
        VaultCore vaultContract = VaultCore(vaultAddress);
        require(vaultContract.hasRole(vaultContract.GOVERNANCE_ROLE(), msg.sender), "Not authorized");
        
        vaultMetadata[vaultId] = VaultMetadata(name, description, imageURI);
        emit VaultMetadataUpdated(vaultId, name, description, imageURI);
    }

    /**
     * @dev Returns the total number of vaults created
     * @return Total number of vaults
     */
    function getVaultCount() external view returns (uint256) {
        return _vaultIds.current();
    }

    /**
     * @dev Returns the metadata URI for a vault
     * @param vaultId The ID of the vault
     * @return The metadata URI
     */
    function getVaultMetadata(uint256 vaultId) external view returns (string memory) {
        address vaultAddress = vaults[vaultId];
        require(vaultAddress != address(0), "Vault does not exist");
        return vaultMetadata[vaultId].name;
    }
} 