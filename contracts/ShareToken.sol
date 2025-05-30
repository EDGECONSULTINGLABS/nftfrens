// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ShareToken
 * @dev ERC20 token representing shares in a Social NFT Vault
 */
contract ShareToken is ERC20, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // Transfer lock
    bool public transfersEnabled;
    uint256 public transferLockEnd;
    
    // Events
    event TransfersEnabled(uint256 timestamp);
    event TransferLockSet(uint256 endTimestamp);
    
    constructor(
        string memory name,
        string memory symbol,
        address initialHolder
    ) ERC20(name, symbol) ERC20Permit(name) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        
        if (initialHolder != address(0)) {
            _mint(initialHolder, 1e18); // Mint 1 token to initial holder
        }
    }
    
    /**
     * @dev Mints new tokens
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    /**
     * @dev Burns tokens
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }
    
    /**
     * @dev Enables transfers
     */
    function enableTransfers() external onlyRole(DEFAULT_ADMIN_ROLE) {
        transfersEnabled = true;
        emit TransfersEnabled(block.timestamp);
    }
    
    /**
     * @dev Sets transfer lock end time
     * @param endTimestamp End timestamp
     */
    function setTransferLock(uint256 endTimestamp) external onlyRole(DEFAULT_ADMIN_ROLE) {
        transferLockEnd = endTimestamp;
        emit TransferLockSet(endTimestamp);
    }
    
    // Required overrides for ERC20Votes
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal virtual override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(address from, uint256 amount) internal virtual override(ERC20, ERC20Votes) {
        super._burn(from, amount);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 