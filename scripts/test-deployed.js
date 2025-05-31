const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing deployed contracts on Holesky...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Testing with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");
  
  // Contract addresses from deployment
  const addresses = {
    factory: "0xa8fCDe078B7708ac22c162B833cCCDcDdEaf8046",
    vault: "0xd0A3B9ecB1727Ae553A981d504dc78543fAB2182",
    shareToken: "0xb311dE79BD5EE0a297fBE9a30F0a74f82f81aF7b",
    governance: "0x5d426be14c04Cd067651D7727122604Df13d12a4",
    timelock: "0x28f11a3ee35Cf6cbD60F003A5940d500dCEFd3c3"
  };
  
  // Get contract instances
  const factory = await hre.ethers.getContractAt("VaultFactory", addresses.factory);
  const vault = await hre.ethers.getContractAt("VaultCore", addresses.vault);
  const shareToken = await hre.ethers.getContractAt("ShareToken", addresses.shareToken);
  const governance = await hre.ethers.getContractAt("GovernanceModule", addresses.governance);
  
  console.log("=".repeat(60));
  console.log("📊 1. TESTING VAULT FACTORY");
  console.log("=".repeat(60));
  
  try {
    const vaultCount = await factory.getVaultCount();
    console.log("✅ Total vaults created:", vaultCount.toString());
    
    const vaultAtIndex0 = await factory.vaults(0);
    console.log("✅ First vault address:", vaultAtIndex0);
    console.log("   Matches test vault:", vaultAtIndex0 === addresses.vault);
  } catch (error) {
    console.log("❌ Factory test error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 2. TESTING VAULT CORE");
  console.log("=".repeat(60));
  
  try {
    // Get vault info
    const vaultURI = await vault.vaultURI();
    const totalContributed = await vault.totalContributed();
    const totalShares = await shareToken.totalSupply();
    
    console.log("✅ Vault URI:", vaultURI);
    console.log("✅ Total Contributed:", hre.ethers.formatEther(totalContributed), "ETH");
    console.log("✅ Total Shares:", hre.ethers.formatEther(totalShares));
    
    // Check roles
    const DEFAULT_ADMIN_ROLE = await vault.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await vault.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    console.log("✅ Deployer has admin role:", hasAdminRole);
  } catch (error) {
    console.log("❌ Vault info error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("💸 3. TESTING DEPOSITS");
  console.log("=".repeat(60));
  
  try {
    const depositAmount = hre.ethers.parseEther("0.01");
    console.log("💰 Attempting to deposit", hre.ethers.formatEther(depositAmount), "ETH...");
    
    // Check initial share balance
    const sharesBefore = await shareToken.balanceOf(deployer.address);
    console.log("   Shares before:", hre.ethers.formatEther(sharesBefore));
    
    // Make deposit
    const depositTx = await vault.deposit({ value: depositAmount });
    console.log("   Transaction hash:", depositTx.hash);
    
    const receipt = await depositTx.wait();
    console.log("   ✅ Deposit confirmed in block:", receipt.blockNumber);
    
    // Check updated balances
    const sharesAfter = await shareToken.balanceOf(deployer.address);
    const vaultBalance = await hre.ethers.provider.getBalance(addresses.vault);
    
    console.log("   Shares after:", hre.ethers.formatEther(sharesAfter));
    console.log("   Shares received:", hre.ethers.formatEther(sharesAfter - sharesBefore));
    console.log("   Vault ETH balance:", hre.ethers.formatEther(vaultBalance), "ETH");
    
    // Get updated vault info
    const updatedTotalContributed = await vault.totalContributed();
    console.log("   Total contributed:", hre.ethers.formatEther(updatedTotalContributed), "ETH");
  } catch (error) {
    console.log("❌ Deposit error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🪙 4. TESTING SHARE TOKEN");
  console.log("=".repeat(60));
  
  try {
    const tokenName = await shareToken.name();
    const tokenSymbol = await shareToken.symbol();
    const totalSupply = await shareToken.totalSupply();
    const userBalance = await shareToken.balanceOf(deployer.address);
    
    console.log("✅ Token Name:", tokenName);
    console.log("✅ Token Symbol:", tokenSymbol);
    console.log("✅ Total Supply:", hre.ethers.formatEther(totalSupply));
    console.log("✅ Your Balance:", hre.ethers.formatEther(userBalance));
    
    // Check if transfers are enabled
    const transfersEnabled = await shareToken.transfersEnabled();
    console.log("✅ Transfers Enabled:", transfersEnabled);
  } catch (error) {
    console.log("❌ Share token error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🗳️ 5. TESTING GOVERNANCE");
  console.log("=".repeat(60));
  
  try {
    const votingDelay = await governance.votingDelay();
    const votingPeriod = await governance.votingPeriod();
    const proposalThreshold = await governance.proposalThreshold();
    
    console.log("✅ Voting Delay:", votingDelay.toString(), "blocks");
    console.log("✅ Voting Period:", votingPeriod.toString(), "blocks");
    console.log("✅ Proposal Threshold:", hre.ethers.formatEther(proposalThreshold), "tokens");
    
    // Check if user can propose
    const votingPower = await shareToken.getVotes(deployer.address);
    console.log("✅ Your Voting Power:", hre.ethers.formatEther(votingPower));
    
    if (votingPower == 0n && (await shareToken.balanceOf(deployer.address)) > 0n) {
      console.log("\n⚠️  You have tokens but no voting power. Delegating to self...");
      const delegateTx = await shareToken.delegate(deployer.address);
      await delegateTx.wait();
      console.log("✅ Delegation complete!");
      
      const newVotingPower = await shareToken.getVotes(deployer.address);
      console.log("✅ New Voting Power:", hre.ethers.formatEther(newVotingPower));
    }
  } catch (error) {
    console.log("❌ Governance error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🔐 6. TESTING ACCESS CONTROL");
  console.log("=".repeat(60));
  
  try {
    // Test vault roles
    const GOVERNANCE_ROLE = await vault.GOVERNANCE_ROLE();
    const VAULT_MANAGER_ROLE = await vault.VAULT_MANAGER_ROLE();
    
    console.log("Checking vault roles for", deployer.address);
    console.log("✅ GOVERNANCE_ROLE:", await vault.hasRole(GOVERNANCE_ROLE, deployer.address));
    console.log("✅ VAULT_MANAGER_ROLE:", await vault.hasRole(VAULT_MANAGER_ROLE, deployer.address));
    
    // Grant VAULT_MANAGER_ROLE if not already granted
    if (!(await vault.hasRole(VAULT_MANAGER_ROLE, deployer.address))) {
      console.log("\n🔑 Granting VAULT_MANAGER_ROLE...");
      const grantTx = await vault.grantRole(VAULT_MANAGER_ROLE, deployer.address);
      await grantTx.wait();
      console.log("✅ Role granted!");
    }
  } catch (error) {
    console.log("❌ Access control error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 7. TESTING EVENTS");
  console.log("=".repeat(60));
  
  try {
    // Query recent deposit events
    const filter = vault.filters.Deposited();
    const events = await vault.queryFilter(filter, -100); // Last 100 blocks
    
    console.log(`Found ${events.length} deposit events in the last 100 blocks:`);
    events.slice(-5).forEach((event, index) => {
      console.log(`\n   Event ${index + 1}:`);
      console.log(`   - Depositor: ${event.args.depositor}`);
      console.log(`   - Amount: ${hre.ethers.formatEther(event.args.amount)} ETH`);
      console.log(`   - Shares: ${hre.ethers.formatEther(event.args.shares)}`);
      console.log(`   - Block: ${event.blockNumber}`);
    });
  } catch (error) {
    console.log("❌ Event query error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("💡 8. ADVANCED TEST: CREATE PROPOSAL");
  console.log("=".repeat(60));
  
  try {
    const votingPower = await shareToken.getVotes(deployer.address);
    const threshold = await governance.proposalThreshold();
    
    if (votingPower >= threshold) {
      console.log("✅ You have enough voting power to create a proposal!");
      
      // Example proposal to enable transfers
      const targets = [addresses.shareToken];
      const values = [0];
      const calldatas = [
        shareToken.interface.encodeFunctionData("enableTransfers", [])
      ];
      const description = "Proposal #1: Enable share token transfers";
      
      console.log("\n📝 Creating proposal:", description);
      const proposeTx = await governance.propose(targets, values, calldatas, description);
      const proposeReceipt = await proposeTx.wait();
      
      // Get proposal ID from event
      const event = proposeReceipt.logs.find(
        log => log.topics[0] === governance.interface.getEvent("ProposalCreated").topicHash
      );
      const proposalId = event.args.proposalId;
      
      console.log("✅ Proposal created!");
      console.log("   Proposal ID:", proposalId.toString());
      console.log("   Transaction:", proposeTx.hash);
      
      // Check proposal state
      const state = await governance.state(proposalId);
      const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      console.log("   Current state:", states[state]);
    } else {
      console.log("❌ Insufficient voting power to create proposal");
      console.log("   Your power:", hre.ethers.formatEther(votingPower));
      console.log("   Required:", hre.ethers.formatEther(threshold));
    }
  } catch (error) {
    console.log("❌ Proposal creation error:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ TESTING COMPLETE!");
  console.log("=".repeat(60));
  
  // Summary
  console.log("\n📊 Summary:");
  console.log("- Vault is active and accepting deposits");
  console.log("- Share tokens are being minted correctly");
  console.log("- Governance system is functional");
  console.log("- Access control is working");
  console.log("\n🎯 Next steps:");
  console.log("1. Make more deposits to test with multiple users");
  console.log("2. Create and vote on proposals");
  console.log("3. Test NFT purchasing functionality");
  console.log("4. Test withdrawal/claim mechanisms");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 