const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking Holesky ETH balance...");
  
  const [signer] = await hre.ethers.getSigners();
  const address = await signer.getAddress();
  const balance = await hre.ethers.provider.getBalance(address);
  
  console.log(`\n📊 Account: ${address}`);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.log("\n⚠️  Insufficient Holesky ETH balance!");
    console.log("\n🔗 Get Holesky ETH from these faucets:");
    console.log("1. https://holesky-faucet.pk910.de/");
    console.log("2. https://holesky-faucet.ethpandaops.io/");
    console.log("\n📝 Steps:");
    console.log("1. Visit one of the faucets above");
    console.log("2. Enter your address:", address);
    console.log("3. Complete any required verification");
    console.log("4. Wait for the ETH to arrive (usually within a few minutes)");
    console.log("\n🔄 Run this script again after receiving the ETH to verify your balance");
  } else {
    console.log("\n✅ Sufficient Holesky ETH balance for deployment!");
    console.log("\n🚀 You can now deploy your contracts with:");
    console.log("npx hardhat run scripts/deploy.js --network holesky");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 