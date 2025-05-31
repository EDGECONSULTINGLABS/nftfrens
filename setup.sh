#!/bin/bash

echo "🚀 Setting up Social NFT Vault MVP"
echo "=================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Initialize npm project if package.json doesn't exist
if [ ! -f "package.json" ]; then
    echo "📦 Initializing npm project..."
    npm init -y
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --save-dev @nomicfoundation/hardhat-toolbox@^4.0.0
npm install --save-dev @nomicfoundation/hardhat-ethers@^3.0.5
npm install --save-dev @nomicfoundation/hardhat-chai-matchers@^2.0.3
npm install --save-dev @nomicfoundation/hardhat-network-helpers@^1.0.10
npm install --save-dev @nomicfoundation/hardhat-verify@^2.0.3
npm install --save-dev @typechain/ethers-v6@^0.5.1
npm install --save-dev @typechain/hardhat@^9.1.0
npm install --save-dev hardhat@^2.19.2
npm install --save-dev ethers@^6.9.0
npm install --save-dev chai@^4.3.10
npm install --save-dev hardhat-gas-reporter@^1.0.9
npm install --save-dev solidity-coverage@^0.8.5
npm install --save-dev dotenv@^16.3.1
npm install --save-dev typescript@^5.3.3
npm install --save-dev ts-node@^10.9.2
npm install --save-dev @types/node@^20.10.5
npm install --save-dev @types/mocha@^10.0.6
npm install --save-dev @types/chai@^4.3.11

# Install OpenZeppelin contracts
echo "📦 Installing OpenZeppelin contracts..."
npm install @openzeppelin/contracts@^5.0.1
npm install @openzeppelin/contracts-upgradeable@^5.0.1

# Create directories
echo "📁 Creating project structure..."
mkdir -p contracts/interfaces
mkdir -p contracts/libraries
mkdir -p scripts
mkdir -p test
mkdir -p deployments

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
# Network RPC URLs
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_KEY

# Private key for deployment (DO NOT COMMIT!)
PRIVATE_KEY=your_private_key_here

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Optional: For gas reporting
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
EOL

    echo "⚠️  Please update .env with your actual keys!"
fi

# Compile contracts
echo "🔨 Compiling contracts..."
npx hardhat compile

# Run tests
echo "🧪 Running tests..."
npx hardhat test

# Check coverage
echo "📊 Checking coverage..."
npx hardhat coverage

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your private key and RPC URLs"
echo "2. Run tests: npx hardhat test"
echo "3. Deploy to testnet: npx hardhat run scripts/deploy.js --network holesky"
echo ""
echo " Happy building!" 