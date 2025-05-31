require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 Debugging Configuration...\n");
  
  // Check environment variables
  console.log("1. Environment Variables:");
  console.log("   PRIVATE_KEY exists:", !!process.env.PRIVATE_KEY);
  console.log("   PRIVATE_KEY length:", process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.length : 0);
  console.log("   HOLESKY_RPC_URL exists:", !!process.env.HOLESKY_RPC_URL);
  console.log("   HOLESKY_RPC_URL:", process.env.HOLESKY_RPC_URL ? "✅ Set" : "❌ Missing");
  
  // Check if private key format is correct
  if (process.env.PRIVATE_KEY) {
    const key = process.env.PRIVATE_KEY;
    console.log("\n2. Private Key Check:");
    console.log("   Starts with 0x:", key.startsWith("0x"));
    console.log("   Length:", key.length, "(should be 64 characters without 0x)");
    console.log("   Valid hex:", /^[0-9a-fA-F]+$/.test(key.replace("0x", "")));
  }
  
  // Try to create a wallet
  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    console.log("\n3. Wallet Creation: ✅ Success");
    console.log("   Address:", wallet.address);
  } catch (error) {
    console.log("\n3. Wallet Creation: ❌ Failed");
    console.log("   Error:", error.message);
  }
  
  // Try to get signers
  try {
    const signers = await ethers.getSigners();
    console.log("\n4. Signers:", signers.length > 0 ? "✅ Found" : "❌ Not found");
    if (signers.length > 0) {
      console.log("   Signer address:", signers[0].address);
    }
  } catch (error) {
    console.log("\n4. Signers: ❌ Error");
    console.log("   Error:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 