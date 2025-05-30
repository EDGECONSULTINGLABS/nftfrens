// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockMarketplace is Ownable {
    mapping(address => mapping(uint256 => uint256)) public listings;
    
    event NFTListed(address indexed nftContract, uint256 indexed tokenId, uint256 price);
    event NFTSold(address indexed nftContract, uint256 indexed tokenId, address indexed buyer, uint256 price);
    
    function listNFT(address nftContract, uint256 tokenId, uint256 price) external {
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        listings[nftContract][tokenId] = price;
        emit NFTListed(nftContract, tokenId, price);
    }
    
    function buyNFT(address nftContract, uint256 tokenId) external payable {
        uint256 price = listings[nftContract][tokenId];
        require(msg.value >= price, "Insufficient payment");
        
        delete listings[nftContract][tokenId];
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        
        emit NFTSold(nftContract, tokenId, msg.sender, price);
    }
    
    function executeOrder(address nftContract, uint256 tokenId, address buyer) external {
        uint256 price = listings[nftContract][tokenId];
        require(price > 0, "NFT not listed");
        
        delete listings[nftContract][tokenId];
        IERC721(nftContract).transferFrom(address(this), buyer, tokenId);
        
        emit NFTSold(nftContract, tokenId, buyer, price);
    }
} 