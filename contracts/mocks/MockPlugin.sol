// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockPlugin is Ownable {
    bool public isEnabled;
    uint256 public lastExecuted;
    
    event PluginExecuted(uint256 timestamp);
    
    function execute() external onlyOwner {
        isEnabled = true;
        lastExecuted = block.timestamp;
        emit PluginExecuted(block.timestamp);
    }
    
    function disable() external onlyOwner {
        isEnabled = false;
    }
} 