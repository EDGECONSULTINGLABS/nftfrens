const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Social NFT Vault", function () {
  let factory;
  let vault;
  let shareToken;
  let governance;
  let owner;
  let user1;
  let user2;
  let mockNFT;
  let mockMarketplace;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock NFT
    const MockNFT = await ethers.getContractFactory("MockERC721");
    mockNFT = await MockNFT.deploy("Mock NFT", "MNFT");

    // Deploy mock marketplace
    const MockMarketplace = await ethers.getContractFactory("MockMarketplace");
    mockMarketplace = await MockMarketplace.deploy();

    // Deploy factory
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    factory = await VaultFactory.deploy();

    // Create vault
    const tx = await factory.createVault(
      "ipfs://test-metadata",
      ethers.parseEther("1.0"),
      { value: ethers.parseEther("1.0") }
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(e => e.fragment?.name === "VaultCreated");
    const vaultAddress = event.args.vaultAddress;

    // Get vault instance
    const VaultCore = await ethers.getContractFactory("VaultCore");
    vault = await VaultCore.attach(vaultAddress);

    // Deploy share token
    const ShareToken = await ethers.getContractFactory("ShareToken");
    shareToken = await ShareToken.deploy(
      "Vault Share",
      "VS",
      ethers.ZeroAddress // No initial holder
    );

    // Deploy timelock
    const TimelockController = await ethers.getContractFactory("TimelockController");
    const timelock = await TimelockController.deploy(
      0, // No delay for tests
      [], // No proposers
      [], // No executors
      owner.address // Admin
    );

    // Deploy governance
    const GovernanceModule = await ethers.getContractFactory("GovernanceModule");
    governance = await GovernanceModule.deploy(
      shareToken.target,
      timelock.target,
      0, // No voting delay
      5, // 5 blocks voting period
      4 // 4% quorum
    );

    // Grant governance role to governance contract
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governance.target);
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), governance.target);
    await timelock.revokeRole(await timelock.TIMELOCK_ADMIN_ROLE(), owner.address);

    // Grant timelock the necessary permissions
    await vault.grantRole(await vault.GOVERNANCE_ROLE(), timelock.target);

    // Initialize vault
    await vault.initialize(shareToken.target, governance.target);

    // Grant MINTER_ROLE to vault for share token
    await shareToken.grantRole(await shareToken.MINTER_ROLE(), vault.target);
    await shareToken.grantRole(await shareToken.BURNER_ROLE(), vault.target);
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await vault.vaultURI()).to.equal("ipfs://test-metadata");
      expect(await vault.hasRole(await vault.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await shareToken.totalSupply()).to.equal(0);
    });
  });

  describe("Deposits and Withdrawals", function () {
    it("Should allow users to deposit ETH", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(vault.connect(user1).deposit({ value: depositAmount }))
        .to.emit(vault, "Deposited")
        .withArgs(user1.address, depositAmount, depositAmount);
      
      expect(await shareToken.balanceOf(user1.address)).to.equal(depositAmount);
    });

    it("Should not allow zero deposits", async function () {
      await expect(vault.connect(user1).deposit({ value: 0 }))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("Should allow users to withdraw proportional ETH", async function () {
      // Both users deposit
      const deposit1 = ethers.parseEther("1.0");
      const deposit2 = ethers.parseEther("2.0");
      
      await vault.connect(user1).deposit({ value: deposit1 });
      await vault.connect(user2).deposit({ value: deposit2 });
      
      // User1 withdraws half their shares
      const withdrawShares = ethers.parseEther("0.5");
      const totalShares = await shareToken.totalSupply();
      const vaultBalance = await ethers.provider.getBalance(vault.target);
      const expectedAmount = (vaultBalance * withdrawShares) / totalShares;
      
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await vault.connect(user1).withdraw(withdrawShares);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);
      
      // Calculate actual withdrawal amount
      const actualAmount = balanceAfter + gasUsed - balanceBefore;
      expect(actualAmount).to.be.closeTo(
        expectedAmount,
        ethers.parseEther("0.001") // Allow small rounding error
      );
      
      expect(await shareToken.balanceOf(user1.address)).to.equal(withdrawShares);
    });

    it("Should not allow withdrawing more shares than owned", async function () {
      await vault.connect(user1).deposit({ value: ethers.parseEther("1.0") });
      
      await expect(vault.connect(user1).withdraw(ethers.parseEther("2.0")))
        .to.be.revertedWithCustomError(vault, "InsufficientShares");
    });
  });

  describe("NFT Management", function () {
    it("Should allow buying NFTs through marketplace", async function () {
      // Setup mock NFT in marketplace
      const tokenId = 1;
      const price = ethers.parseEther("0.5");
      
      // Mint NFT to owner first
      await mockNFT.mint(owner.address, tokenId);
      
      // Approve marketplace to transfer NFT
      await mockNFT.connect(owner).setApprovalForAll(mockMarketplace.target, true);
      
      // List NFT
      await mockMarketplace.connect(owner).listNFT(mockNFT.target, tokenId, price);

      // Buy NFT - encode correct function selector
      const iface = new ethers.Interface([
        "function buyNFT(address nftContract, uint256 tokenId)"
      ]);
      const orderData = iface.encodeFunctionData("buyNFT", [mockNFT.target, tokenId]);
      
      // Fund the vault first
      await vault.connect(owner).deposit({ value: price });
      
      await vault.connect(owner).buyNFT(
        mockMarketplace.target,
        orderData,
        price
      );

      expect(await mockNFT.ownerOf(tokenId)).to.equal(vault.target);
    });

    it("Should allow selling NFTs through marketplace", async function () {
      // Setup mock NFT in vault
      const tokenId = 1;
      await mockNFT.mint(vault.target, tokenId);
      
      // Approve marketplace to transfer NFT
      await mockNFT.connect(owner).setApprovalForAll(mockMarketplace.target, true);
      
      // Sell NFT - encode correct function selector
      const iface = new ethers.Interface([
        "function executeOrder(address nftContract, uint256 tokenId, address buyer)"
      ]);
      const orderData = iface.encodeFunctionData("executeOrder", [mockNFT.target, tokenId, mockMarketplace.target]);
      
      const price = ethers.parseEther("0.5");
      
      await vault.connect(owner).sellNFT(
        mockNFT.target,
        tokenId,
        mockMarketplace.target,
        orderData,
        price
      );

      expect(await mockNFT.ownerOf(tokenId)).to.equal(mockMarketplace.target);
    });
  });

  describe("Governance", function () {
    it("Should allow creating and executing proposals", async function () {
      // Give user1 enough shares to propose and meet quorum
      await shareToken.mint(user1.address, ethers.parseEther("100"));
      
      // Delegate voting power to user1
      await shareToken.connect(user1).delegate(user1.address);
      
      // Create proposal
      const targets = [vault.target];
      const values = [0];
      const calldatas = [vault.interface.encodeFunctionData("updateVaultURI", ["ipfs://new-uri"])];
      
      const tx = await governance.connect(user1).propose(
        targets,
        values,
        calldatas,
        "Update vault URI"
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(e => e.fragment?.name === "ProposalCreated");
      const proposalId = event.args.proposalId;
      
      // Vote
      await governance.connect(user1).castVote(proposalId, 1); // For
      
      // Debug: log total supply and quorum
      const proposalSnapshot = await governance.proposalSnapshot(proposalId);
      const totalSupply = await shareToken.totalSupply();
      const quorum = await governance.quorum(proposalSnapshot);
      console.log("Proposal snapshot block:", proposalSnapshot.toString());
      console.log("Total supply:", totalSupply.toString());
      console.log("Quorum:", quorum.toString());
      
      // Wait for voting period to end
      const votingPeriod = await governance.votingPeriod();
      for (let i = 0; i < votingPeriod; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      // Queue the proposal
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("Update vault URI"));
      await governance.connect(user1).queue(targets, values, calldatas, descriptionHash);
      
      // Wait for timelock delay to pass
      await ethers.provider.send("evm_increaseTime", [1]); // Increase time by 1 second
      await ethers.provider.send("evm_mine"); // Mine a new block
      
      // Execute
      await governance.connect(user1).execute(
        targets,
        values,
        calldatas,
        descriptionHash
      );
      
      expect(await vault.vaultURI()).to.equal("ipfs://new-uri");
    });
  });

  describe("Plugin System", function () {
    it("Should allow adding and removing plugins", async function () {
      // Create a mock plugin vault using the factory
      const tx = await factory.createVault(
        "ipfs://mock-plugin",
        ethers.parseEther("0.1"),
        { value: ethers.parseEther("0.1") }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(e => e.fragment?.name === "VaultCreated");
      const pluginAddress = event.args.vaultAddress;
      
      // Add plugin
      await expect(vault.addPlugin(pluginAddress))
        .to.emit(vault, "PluginAdded")
        .withArgs(pluginAddress);
      
      expect(await vault.isPlugin(pluginAddress)).to.be.true;
      
      // Remove plugin
      await expect(vault.removePlugin(pluginAddress))
        .to.emit(vault, "PluginRemoved")
        .withArgs(pluginAddress);
      
      expect(await vault.isPlugin(pluginAddress)).to.be.false;
    });

    it("Should not allow adding zero address as plugin", async function () {
      await expect(vault.addPlugin(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "InvalidAddress");
    });

    it("Should not allow adding same plugin twice", async function () {
      // Create a mock plugin vault using the factory
      const tx = await factory.createVault(
        "ipfs://mock-plugin",
        ethers.parseEther("0.1"),
        { value: ethers.parseEther("0.1") }
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(e => e.fragment?.name === "VaultCreated");
      const pluginAddress = event.args.vaultAddress;
      
      await vault.addPlugin(pluginAddress);
      
      await expect(vault.addPlugin(pluginAddress))
        .to.be.revertedWithCustomError(vault, "PluginAlreadyAdded");
    });
  });

  describe("Access Control", function () {
    it("Should enforce role-based access", async function () {
      // User1 should not be able to pause
      await expect(vault.connect(user1).pause())
        .to.be.revertedWith(/AccessControl/);
      
      // User1 should not be able to add plugins
      await expect(vault.connect(user1).addPlugin(user1.address))
        .to.be.revertedWith(/AccessControl/);
    });

    it("Should allow guardian to pause/unpause", async function () {
      await expect(vault.pause())
        .to.emit(vault, "VaultPaused")
        .withArgs(owner.address);
      
      expect(await vault.paused()).to.be.true;
      
      await expect(vault.unpause())
        .to.emit(vault, "VaultUnpaused")
        .withArgs(owner.address);
      
      expect(await vault.paused()).to.be.false;
    });
  });

  describe("Pausable", function () {
    it("Should not allow deposits when paused", async function () {
      await vault.pause();
      
      await expect(vault.connect(user1).deposit({ value: ethers.parseEther("1.0") }))
        .to.be.revertedWith("Pausable: paused");
    });

    it("Should not allow withdrawals when paused", async function () {
      await vault.connect(user1).deposit({ value: ethers.parseEther("1.0") });
      await vault.pause();
      
      await expect(vault.connect(user1).withdraw(ethers.parseEther("1.0")))
        .to.be.revertedWith("Pausable: paused");
    });
  });
}); 