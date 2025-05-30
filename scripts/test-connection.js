const { ethers, network } = require("hardhat");

async function main() {
  try {
    console.log("Testing connection to Holesky...");
    console.log("Network:", network.name);
    
    // Check if private key is loaded
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not found in .env file");
    }
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
      throw new Error("No deployer account found. Check your private key.");
    }
    
    console.log("Deployer address:", deployer.address);
    
    // Get the balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    
    // Get the network details
    const networkDetails = await ethers.provider.getNetwork();
    console.log("Chain ID:", networkDetails.chainId);
    
    // Get the latest block
    const latestBlock = await ethers.provider.getBlock("latest");
    console.log("Latest block number:", latestBlock.number);
    
    console.log("\nConnection test successful! ✅");
  } catch (error) {
    console.error("\nConnection test failed ❌");
    console.error("Error details:", error.message);
    if (error.message.includes("PRIVATE_KEY")) {
      console.error("\nPlease check your .env file and make sure it contains:");
      console.error("PRIVATE_KEY=your_private_key_here");
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 