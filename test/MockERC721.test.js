const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockERC721", function () {
  it("Should deploy MockERC721", async function () {
    const MockNFT = await ethers.getContractFactory("MockERC721");
    const mockNFT = await MockNFT.deploy("Mock NFT", "MNFT");
    console.log("MockERC721 deployed at:", mockNFT.target);
    expect(mockNFT.target).to.be.properAddress;
  });
}); 