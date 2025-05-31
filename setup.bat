@echo off
echo 🚀 Setting up Social NFT Vault MVP
echo ==================================

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ npm is not installed. Please install Node.js first.
    exit /b 1
)

REM Initialize npm project if package.json doesn't exist
if not exist package.json (
    echo 📦 Initializing npm project...
    call npm init -y
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install --save-dev @nomicfoundation/hardhat-toolbox@^4.0.0
call npm install --save-dev @nomicfoundation/hardhat-ethers@^3.0.5
call npm install --save-dev @nomicfoundation/hardhat-chai-matchers@^2.0.3
call npm install --save-dev @nomicfoundation/hardhat-network-helpers@^1.0.10
call npm install --save-dev @nomicfoundation/hardhat-verify@^2.0.3
call npm install --save-dev @typechain/ethers-v6@^0.5.1
call npm install --save-dev @typechain/hardhat@^9.1.0
call npm install --save-dev hardhat@^2.19.2
call npm install --save-dev ethers@^6.9.0
call npm install --save-dev chai@^4.3.10
call npm install --save-dev hardhat-gas-reporter@^1.0.9
call npm install --save-dev solidity-coverage@^0.8.5
call npm install --save-dev dotenv@^16.3.1
call npm install --save-dev typescript@^5.3.3
call npm install --save-dev ts-node@^10.9.2
call npm install --save-dev @types/node@^20.10.5
call npm install --save-dev @types/mocha@^10.0.6
call npm install --save-dev @types/chai@^4.3.11

REM Install OpenZeppelin contracts
echo 📦 Installing OpenZeppelin contracts...
call npm install @openzeppelin/contracts@^5.0.1
call npm install @openzeppelin/contracts-upgradeable@^5.0.1

REM Create directories
echo 📁 Creating project structure...
if not exist contracts\interfaces mkdir contracts\interfaces
if not exist contracts\libraries mkdir contracts\libraries
if not exist scripts mkdir scripts
if not exist test mkdir test
if not exist deployments mkdir deployments

REM Create .env file if it doesn't exist
echo Creating .env file...

if not exist .env (
    echo # Network RPC URLs > .env
    echo MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY >> .env
    echo SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY >> .env
    echo HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_KEY >> .env
    echo. >> .env
    echo # Private key for deployment (DO NOT COMMIT!) >> .env
    echo PRIVATE_KEY=your_private_key_here >> .env
    echo. >> .env
    echo # Etherscan API key for contract verification >> .env
    echo ETHERSCAN_API_KEY=your_etherscan_api_key_here >> .env
    echo. >> .env
    echo # Optional: For gas reporting >> .env
    echo REPORT_GAS=true >> .env
    echo COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here >> .env

    echo ⚠️  Please update .env with your actual keys!
)

REM Compile contracts
echo 🔨 Compiling contracts...
call npx hardhat compile

REM Run tests
echo 🧪 Running tests...
call npx hardhat test

REM Check coverage
echo 📊 Checking coverage...
call npx hardhat coverage

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update .env with your private key and RPC URLs
echo 2. Run tests: npx hardhat test
echo 3. Deploy to testnet: npx hardhat run scripts/deploy.js --network holesky
echo.
echo 🎉 Happy building! 