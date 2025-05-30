const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Get contract addresses from deployment
  const deploymentInfo = {
    network: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      shareToken: shareToken.target,
      timelock: timelock.target,
      governance: governance.target,
      factory: factory.target,
      vault: vault.target
    }
  };

  // Save to file
  const filePath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", filePath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 