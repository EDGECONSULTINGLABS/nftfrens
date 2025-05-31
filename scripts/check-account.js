const { ethers, network } = require("hardhat");

async function main() {
  try {
    console.log("Network:", network.name);
    
    // Get the signers
    const signers = await ethers.getSigners();
    if (!signers || signers.length === 0) {
      throw new Error("No signers found. Check your private key in .env");
    }
    
    const deployer = signers[0];
    console.log("Deployer address:", deployer.address);
    
    // Get the balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
    
    // Get the network details
    const networkDetails = await ethers.provider.getNetwork();
    console.log("Chain ID:", networkDetails.chainId);
  } catch (error) {
    console.error("Error:", error.message);
    if (error.message.includes("private key")) {
      console.log("\nPlease check your .env file has:");
      console.log("PRIVATE_KEY=your_private_key_here");
      console.log("HOLESKY_RPC_URL=your_rpc_url_here");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 