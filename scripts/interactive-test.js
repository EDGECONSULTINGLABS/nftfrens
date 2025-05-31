const hre = require("hardhat");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log("🎮 Interactive Contract Testing on Holesky\n");
  console.log("💡 Get test ETH from: https://holesky-faucet.pk910.de/\n");
  
  // Contract addresses for Holesky
  const addresses = {
    factory: "0xa8fCDe078B7708ac22c162B833cCCDcDdEaf8046",
    vault: "0xd0A3B9ecB1727Ae553A981d504dc78543fAB2182",
    shareToken: "0xb311dE79BD5EE0a297fBE9a30F0a74f82f81aF7b",
    governance: "0x5d426be14c04Cd067651D7727122604Df13d12a4",
    timelock: "0x28f11a3ee35Cf6cbD60F003A5940d500dCEFd3c3"
  };

  // Get the signer from MetaMask
  const [signer] = await hre.ethers.getSigners();
  console.log("\n📍 Using MetaMask wallet:", signer.address);
  
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH\n");
  
  if (balance === 0n) {
    console.log("⚠️  Your wallet has 0 ETH!");
    console.log("Please get test ETH from: https://holesky-faucet.pk910.de/");
    console.log("Then run this script again.\n");
    return;
  }
  
  // Get contract instances with MetaMask signer
  const vault = await hre.ethers.getContractAt("VaultCore", addresses.vault, signer);
  const shareToken = await hre.ethers.getContractAt("ShareToken", addresses.shareToken, signer);
  const governance = await hre.ethers.getContractAt("GovernanceModule", addresses.governance, signer);
  
  while (true) {
    console.log("\n" + "=".repeat(50));
    console.log("Choose an action:");
    console.log("1. View vault status");
    console.log("2. Make a deposit");
    console.log("3. Check your shares");
    console.log("4. Delegate voting power");
    console.log("5. Create a proposal");
    console.log("6. Vote on a proposal");
    console.log("7. Check proposal status");
    console.log("8. List active proposals");
    console.log("9. Exit");
    console.log("=".repeat(50));
    
    const choice = await question("\nEnter your choice (1-9): ");
    
    switch(choice) {
      case '1':
        await viewVaultStatus(vault, shareToken);
        break;
      case '2':
        await makeDeposit(vault);
        break;
      case '3':
        await checkShares(shareToken, signer.address);
        break;
      case '4':
        await delegateVotingPower(shareToken, signer.address);
        break;
      case '5':
        await createProposal(governance, shareToken, addresses);
        break;
      case '6':
        await voteOnProposal(governance);
        break;
      case '7':
        await checkProposalStatus(governance);
        break;
      case '8':
        await listActiveProposals(governance);
        break;
      case '9':
        console.log("\n👋 Goodbye!");
        rl.close();
        return;
      default:
        console.log("\n❌ Invalid choice. Please try again.");
    }
  }
}

async function viewVaultStatus(vault, shareToken) {
  console.log("\n📊 VAULT STATUS");
  console.log("-".repeat(30));
  
  try {
    const vaultURI = await vault.vaultURI();
    const totalContributed = await vault.totalContributed();
    const vaultBalance = await hre.ethers.provider.getBalance(vault.target);
    const totalSupply = await shareToken.totalSupply();
    
    console.log("Vault URI:", vaultURI);
    console.log("Total Contributed:", hre.ethers.formatEther(totalContributed), "ETH");
    console.log("Vault Balance:", hre.ethers.formatEther(vaultBalance), "ETH");
    console.log("Share Token Supply:", hre.ethers.formatEther(totalSupply));
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function makeDeposit(vault) {
  console.log("\n💰 MAKE DEPOSIT");
  console.log("-".repeat(30));
  
  const amount = await question("Enter amount to deposit (in ETH): ");
  
  try {
    const depositAmount = hre.ethers.parseEther(amount);
    console.log("\nDepositing", amount, "ETH...");
    
    const tx = await vault.deposit({ value: depositAmount });
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Deposit confirmed in block:", receipt.blockNumber);
    
    // Show the Deposited event
    const event = receipt.logs.find(
      log => log.topics[0] === vault.interface.getEvent("Deposited").topicHash
    );
    
    if (event) {
      const decoded = vault.interface.parseLog(event);
      console.log("\nDeposit Details:");
      console.log("- Amount:", hre.ethers.formatEther(decoded.args.amount), "ETH");
      console.log("- Shares received:", hre.ethers.formatEther(decoded.args.shares));
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function checkShares(shareToken, address) {
  console.log("\n🪙 YOUR SHARES");
  console.log("-".repeat(30));
  
  try {
    const balance = await shareToken.balanceOf(address);
    const votes = await shareToken.getVotes(address);
    const delegates = await shareToken.delegates(address);
    
    console.log("Share Balance:", hre.ethers.formatEther(balance));
    console.log("Voting Power:", hre.ethers.formatEther(votes));
    console.log("Delegated to:", delegates === address ? "Self" : delegates);
    
    if (balance > 0n && votes === 0n) {
      console.log("\n⚠️  You have shares but no voting power!");
      console.log("You need to delegate to yourself to activate voting.");
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function delegateVotingPower(shareToken, address) {
  console.log("\n🗳️ DELEGATE VOTING POWER");
  console.log("-".repeat(30));
  
  const currentDelegate = await shareToken.delegates(address);
  console.log("Currently delegated to:", currentDelegate === address ? "Self" : currentDelegate);
  
  const target = await question("\nDelegate to (enter address or 'self'): ");
  const delegateTo = target.toLowerCase() === 'self' ? address : target;
  
  try {
    console.log("\nDelegating to:", delegateTo);
    const tx = await shareToken.delegate(delegateTo);
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    console.log("✅ Delegation complete!");
    
    const newVotes = await shareToken.getVotes(delegateTo);
    console.log("New voting power for delegate:", hre.ethers.formatEther(newVotes));
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function voteOnProposal(governance) {
  console.log("\n🗳️ VOTE ON PROPOSAL");
  console.log("-".repeat(30));
  
  const proposalId = await question("Enter proposal ID: ");
  
  if (!proposalId || proposalId.trim() === '') {
    console.log("❌ Please enter a valid proposal ID");
    return;
  }
  
  try {
    const state = await governance.state(proposalId);
    const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    
    console.log("\nProposal state:", states[state]);
    
    if (state !== 1) { // Not Active
      console.log("❌ Proposal is not active for voting");
      if (state === 0) {
        console.log("The proposal is still pending. Please wait for the voting period to start.");
      } else {
        console.log("This proposal has ended. You'll need to create a new proposal.");
      }
      return;
    }
    
    console.log("\nVote options:");
    console.log("0 = Against");
    console.log("1 = For");
    console.log("2 = Abstain");
    
    const support = await question("\nYour vote (0-2): ");
    
    if (!['0', '1', '2'].includes(support)) {
      console.log("❌ Invalid vote option. Please choose 0, 1, or 2.");
      return;
    }
    
    console.log("\nCasting vote...");
    const tx = await governance.castVote(proposalId, support);
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    console.log("✅ Vote cast successfully!");
    
    // Show updated vote counts
    const votes = await governance.proposalVotes(proposalId);
    console.log("\nUpdated Vote Counts:");
    console.log("- For:", hre.ethers.formatEther(votes.forVotes));
    console.log("- Against:", hre.ethers.formatEther(votes.againstVotes));
    console.log("- Abstain:", hre.ethers.formatEther(votes.abstainVotes));
  } catch (error) {
    if (error.message.includes("unknown proposal id")) {
      console.log("❌ Proposal not found. Please check the ID and try again.");
    } else if (error.message.includes("already voted")) {
      console.log("❌ You have already voted on this proposal.");
    } else {
      console.log("❌ Error:", error.message);
    }
  }
}

async function checkProposalStatus(governance) {
  console.log("\n📋 CHECK PROPOSAL STATUS");
  console.log("-".repeat(30));
  
  const proposalId = await question("Enter proposal ID: ");
  
  if (!proposalId || proposalId.trim() === '') {
    console.log("❌ Please enter a valid proposal ID");
    return;
  }
  
  try {
    // Get proposal state
    const state = await governance.state(proposalId);
    const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
    
    // Get current block
    const currentBlock = await governance.runner.provider.getBlockNumber();
    const CHUNK_SIZE = 1000; // Query 1k blocks at a time
    let proposalEvent = null;
    
    // Start from a recent block and work backwards
    let fromBlock = currentBlock;
    let toBlock = Math.max(0, fromBlock - CHUNK_SIZE);
    
    console.log("Searching for proposal...");
    while (fromBlock > 0 && !proposalEvent) {
      console.log(`Checking blocks ${toBlock} to ${fromBlock}...`);
      
      try {
        const filter = governance.filters.ProposalCreated();
        const events = await governance.queryFilter(filter, toBlock, fromBlock);
        proposalEvent = events.find(e => e.args.proposalId.toString() === proposalId);
        
        if (proposalEvent) {
          console.log("Found proposal!");
          break;
        }
      } catch (error) {
        console.log("Reducing block range...");
      }
      
      fromBlock = toBlock;
      toBlock = Math.max(0, fromBlock - CHUNK_SIZE);
    }
    
    if (!proposalEvent) {
      console.log("❌ Proposal not found");
      return;
    }
    
    console.log("\nProposal Details:");
    console.log("ID:", proposalId);
    console.log("State:", states[state]);
    console.log("Description:", proposalEvent.args.description);
    
    // Get voting period info
    const votingDelay = await governance.votingDelay();
    const votingPeriod = await governance.votingPeriod();
    
    // Calculate blocks from the event
    const startBlock = proposalEvent.args.startBlock;
    const endBlock = proposalEvent.args.endBlock;
    
    console.log("\nVoting Period Info:");
    console.log("- Start Block:", startBlock.toString());
    console.log("- End Block:", endBlock.toString());
    console.log("- Current Block:", currentBlock);
    console.log("- Voting Delay:", votingDelay.toString(), "blocks");
    console.log("- Voting Period:", votingPeriod.toString(), "blocks");
    
    if (state === 1) { // Active
      const blocksLeft = endBlock - currentBlock;
      console.log("\n⏰ Voting is active!");
      console.log(`Blocks remaining to vote: ${blocksLeft}`);
    } else if (state === 0) { // Pending
      const blocksUntilStart = startBlock - currentBlock;
      console.log("\n⏳ Proposal is pending");
      console.log(`Blocks until voting starts: ${blocksUntilStart}`);
    } else {
      console.log("\n❌ Proposal is not active for voting");
      console.log("You'll need to create a new proposal");
    }
    
    // Get vote counts
    const votes = await governance.proposalVotes(proposalId);
    console.log("\nVote Counts:");
    console.log("- For:", hre.ethers.formatEther(votes.forVotes));
    console.log("- Against:", hre.ethers.formatEther(votes.againstVotes));
    console.log("- Abstain:", hre.ethers.formatEther(votes.abstainVotes));
  } catch (error) {
    if (error.message.includes("unknown proposal id")) {
      console.log("❌ Proposal not found. Please check the ID and try again.");
    } else {
      console.log("❌ Error:", error.message);
    }
  }
}

async function listActiveProposals(governance) {
  console.log("\n📋 ACTIVE PROPOSALS");
  console.log("-".repeat(30));
  
  try {
    // Get the latest block number
    const currentBlock = await governance.runner.provider.getBlockNumber();
    const CHUNK_SIZE = 1000; // Query 1k blocks at a time
    let events = [];
    
    // Start from a recent block and work backwards
    let fromBlock = currentBlock;
    let toBlock = Math.max(0, fromBlock - CHUNK_SIZE);
    
    console.log("Searching for proposals...");
    while (fromBlock > 0 && events.length === 0) {
      console.log(`Checking blocks ${toBlock} to ${fromBlock}...`);
      
      try {
        const filter = governance.filters.ProposalCreated();
        const chunkEvents = await governance.queryFilter(filter, toBlock, fromBlock);
        if (chunkEvents.length > 0) {
          events = chunkEvents;
          console.log(`Found ${events.length} proposals!`);
          break;
        }
      } catch (error) {
        console.log("Reducing block range...");
      }
      
      fromBlock = toBlock;
      toBlock = Math.max(0, fromBlock - CHUNK_SIZE);
    }
    
    if (events.length === 0) {
      console.log("No proposals found in recent blocks");
      return;
    }
    
    console.log("\nFound proposals:");
    console.log("-".repeat(50));
    
    for (const event of events) {
      const proposalId = event.args.proposalId;
      const state = await governance.state(proposalId);
      const states = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      
      console.log(`\nProposal ID: ${proposalId}`);
      console.log(`State: ${states[state]}`);
      console.log(`Description: ${event.args.description}`);
      
      // Get vote counts
      const votes = await governance.proposalVotes(proposalId);
      console.log("Votes:");
      console.log(`- For: ${hre.ethers.formatEther(votes.forVotes)}`);
      console.log(`- Against: ${hre.ethers.formatEther(votes.againstVotes)}`);
      console.log(`- Abstain: ${hre.ethers.formatEther(votes.abstainVotes)}`);
      console.log("-".repeat(50));
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function createProposal(governance, shareToken, addresses) {
  console.log("\n📝 CREATE PROPOSAL");
  console.log("-".repeat(30));
  
  try {
    const signerAddress = await governance.runner.getAddress();
    const votingPower = await shareToken.getVotes(signerAddress);
    const threshold = await governance.proposalThreshold();
    
    console.log("Your voting power:", hre.ethers.formatEther(votingPower));
    console.log("Required threshold:", hre.ethers.formatEther(threshold));
    
    if (votingPower < threshold) {
      console.log("\n❌ Insufficient voting power to create proposal");
      console.log("You need to:");
      console.log("1. Make a deposit to get shares");
      console.log("2. Delegate voting power to yourself");
      return;
    }
    
    console.log("\nChoose proposal type:");
    console.log("1. Enable share token transfers");
    console.log("2. Change vault parameters");
    
    const type = await question("\nEnter choice (1-2): ");
    
    let targets, values, calldatas, description;
    
    // Get vault contract instance
    const vault = await hre.ethers.getContractAt("VaultCore", addresses.vault, governance.runner);
    
    // Get current block for unique description
    const currentBlock = await governance.runner.provider.getBlockNumber();
    
    switch(type) {
      case '1':
        // Check if transfers are already enabled
        const isTransfersEnabled = await shareToken.transfersEnabled();
        if (isTransfersEnabled) {
          console.log("❌ Share token transfers are already enabled");
          return;
        }
        
        targets = [addresses.shareToken];
        values = [0];
        calldatas = [
          shareToken.interface.encodeFunctionData("enableTransfers", [])
        ];
        description = `Enable share token transfers (Block ${currentBlock})`;
        break;
      
      case '2':
        const newMin = await question("Enter new minimum contribution (in ETH): ");
        targets = [addresses.vault];
        values = [0];
        calldatas = [
          vault.interface.encodeFunctionData("setMinContribution", [
            hre.ethers.parseEther(newMin)
          ])
        ];
        description = `Change minimum contribution to ${newMin} ETH (Block ${currentBlock})`;
        break;
      
      default:
        console.log("❌ Invalid choice");
        return;
    }
    
    console.log("\nCreating proposal:", description);
    console.log("Targets:", targets);
    console.log("Values:", values);
    console.log("Calldatas:", calldatas);
    
    const tx = await governance.propose(targets, values, calldatas, description);
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      log => log.topics[0] === governance.interface.getEvent("ProposalCreated").topicHash
    );
    
    if (event) {
      const decoded = governance.interface.parseLog(event);
      const proposalId = decoded.args.proposalId;
      console.log("✅ Proposal created!");
      console.log("Proposal ID:", proposalId.toString());
      
      // Get voting period info
      const votingDelay = await governance.votingDelay();
      const votingPeriod = await governance.votingPeriod();
      
      console.log("\nVoting Period Info:");
      console.log("- Voting will start in", votingDelay.toString(), "blocks");
      console.log("- Voting period will last", votingPeriod.toString(), "blocks");
      console.log("- Current block:", currentBlock);
      
      console.log("\nNext steps:");
      console.log("1. Wait for voting period to start");
      console.log("2. Vote on the proposal");
      console.log("3. Check proposal status");
    }
  } catch (error) {
    if (error.message.includes("proposal already exists")) {
      console.log("❌ A similar proposal already exists. Please check the active proposals list.");
    } else {
      console.log("❌ Error:", error.message);
    }
  }
}

main()
  .then(() => {
    rl.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    rl.close();
    process.exit(1);
  }); 