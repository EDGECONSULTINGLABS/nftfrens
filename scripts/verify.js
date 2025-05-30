const { run } = require("hardhat");

async function main() {
  // Get contract addresses from deployment
  const deploymentInfo = require("../deployment-info.json");
  const {
    shareToken,
    timelock,
    governance,
    factory,
    vault
  } = deploymentInfo.contracts;

  console.log("Verifying contracts on Etherscan...");

  // Verify ShareToken
  console.log("\nVerifying ShareToken...");
  await run("verify:verify", {
    address: shareToken,
    constructorArguments: [
      "Vault Share",
      "VS",
      "0x0000000000000000000000000000000000000000" // ZeroAddress
    ]
  });

  // Verify TimelockController
  console.log("\nVerifying TimelockController...");
  await run("verify:verify", {
    address: timelock,
    constructorArguments: [
      0, // No delay
      [], // No proposers
      [], // No executors
      deploymentInfo.deployer // Admin
    ]
  });

  // Verify GovernanceModule
  console.log("\nVerifying GovernanceModule...");
  await run("verify:verify", {
    address: governance,
    constructorArguments: [
      shareToken,
      timelock,
      0, // No voting delay
      5, // 5 blocks voting period
      4 // 4% quorum
    ]
  });

  // Verify VaultFactory
  console.log("\nVerifying VaultFactory...");
  await run("verify:verify", {
    address: factory,
    constructorArguments: []
  });

  // Verify VaultCore
  console.log("\nVerifying VaultCore...");
  await run("verify:verify", {
    address: vault,
    constructorArguments: [
      1, // vaultId
      deploymentInfo.deployer, // creator
      "ipfs://test-metadata" // vaultURI
    ]
  });

  console.log("\nAll contracts verified successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 