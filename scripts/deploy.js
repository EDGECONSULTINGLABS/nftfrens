const { ethers, network } = require("hardhat");

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with:", deployer.address);
    console.log("Network:", network.name);

    // 1. Deploy ShareToken
    console.log("\nDeploying ShareToken...");
    const ShareToken = await ethers.getContractFactory("ShareToken");
    const shareToken = await ShareToken.deploy(
      "Vault Share",
      "VS",
      ethers.ZeroAddress // No initial holder
    );
    await shareToken.waitForDeployment();
    console.log("ShareToken deployed to:", shareToken.target);

    // 2. Deploy TimelockController
    console.log("\nDeploying TimelockController...");
    const TimelockController = await ethers.getContractFactory("TimelockController");
    const timelock = await TimelockController.deploy(
      0, // No delay for tests
      [], // No proposers
      [], // No executors
      deployer.address // Admin
    );
    await timelock.waitForDeployment();
    console.log("TimelockController deployed to:", timelock.target);

    // 3. Deploy GovernanceModule
    console.log("\nDeploying GovernanceModule...");
    const GovernanceModule = await ethers.getContractFactory("GovernanceModule");
    const governance = await GovernanceModule.deploy(
      shareToken.target,
      timelock.target,
      0, // No voting delay
      5, // 5 blocks voting period
      4 // 4% quorum
    );
    await governance.waitForDeployment();
    console.log("GovernanceModule deployed to:", governance.target);

    // 4. Deploy VaultFactory
    console.log("\nDeploying VaultFactory...");
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const factory = await VaultFactory.deploy();
    await factory.waitForDeployment();
    console.log("VaultFactory deployed to:", factory.target);

    // 5. Create a test vault through the factory
    console.log("\nCreating test vault...");
    const tx = await factory.createVault(
      "ipfs://test-metadata",
      ethers.parseEther("1.0"),
      { value: ethers.parseEther("1.0") }
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(e => e.fragment?.name === "VaultCreated");
    const vaultAddress = event.args.vaultAddress;
    console.log("Test vault created at:", vaultAddress);

    // 6. Get vault instance and initialize it
    console.log("\nInitializing vault...");
    const VaultCore = await ethers.getContractFactory("VaultCore");
    const vault = await VaultCore.attach(vaultAddress);
    await vault.initialize(shareToken.target, governance.target);
    console.log("Vault initialized");

    // 7. Set up governance permissions
    console.log("\nSetting up governance permissions...");
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), governance.target);
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), governance.target);
    await timelock.revokeRole(await timelock.TIMELOCK_ADMIN_ROLE(), deployer.address);
    await vault.grantRole(await vault.GOVERNANCE_ROLE(), timelock.target);
    console.log("Governance permissions set up");

    // 8. Set up share token permissions
    console.log("\nSetting up share token permissions...");
    await shareToken.grantRole(await shareToken.MINTER_ROLE(), vault.target);
    await shareToken.grantRole(await shareToken.BURNER_ROLE(), vault.target);
    console.log("Share token permissions set up");

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        shareToken: shareToken.target,
        timelock: timelock.target,
        governance: governance.target,
        factory: factory.target,
        vault: vaultAddress
      }
    };

    // Save to file
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(__dirname, "../deployment-info.json");
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to:", filePath);

    // Print deployment summary
    console.log("\nDeployment Summary:");
    console.log("-------------------");
    console.log("ShareToken:", shareToken.target);
    console.log("TimelockController:", timelock.target);
    console.log("GovernanceModule:", governance.target);
    console.log("VaultFactory:", factory.target);
    console.log("Test Vault:", vaultAddress);

  } catch (error) {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 