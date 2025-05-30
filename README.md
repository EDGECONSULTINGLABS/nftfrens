# Social NFT Vault Protocol

A decentralized protocol enabling groups to collectively fund, purchase, and manage NFTs through secure, modular smart contracts.

## Overview

The Social NFT Vault Protocol allows users to pool their resources to acquire and manage NFTs as a group. Each vault is an independent instance managing one pool of funds and NFTs, with its own governance and share token.

## Key Features

- **Collective Ownership**: Pool funds with others to purchase high-value NFTs
- **Flexible Governance**: On-chain and off-chain voting options
- **Multi-Marketplace Support**: Buy NFTs from various marketplaces and aggregators
- **Plugin System**: Extend vault functionality with custom plugins
- **Security First**: Role-based access control, reentrancy protection, and emergency stops
- **Cross-Chain Ready**: Architecture designed for future cross-chain operations

## Architecture

### Core Components

1. **Vault Factory**
   - Deploys new vault instances
   - Assigns unique vault IDs
   - Manages vault metadata

2. **Vault Core**
   - Manages deposits and withdrawals
   - Handles NFT storage and transfers
   - Coordinates with other modules
   - Implements plugin system

3. **Share Token (ERC-20)**
   - Represents ownership in the vault
   - Supports voting and delegation
   - Optional transfer restrictions

4. **Governance Module**
   - Proposal creation and voting
   - On-chain and off-chain voting options
   - Timelock for proposal execution

### Additional Modules

- **Acquisition Module**: NFT marketplace integration
- **Liquidity Module**: NFT lending and borrowing
- **Revenue Distribution**: Share NFT-generated income
- **Plugin System**: Extend vault functionality

## Getting Started

### Prerequisites

- Node.js v14+
- npm or yarn
- Hardhat

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/social-nft-vault.git
cd social-nft-vault
```

2. Install dependencies:
```bash
npm install
```

3. Compile contracts:
```bash
npm run compile
```

### Usage

1. Deploy the Vault Factory:
```javascript
const VaultFactory = await ethers.getContractFactory("VaultFactory");
const factory = await VaultFactory.deploy();
await factory.deployed();
```

2. Create a new vault:
```javascript
const tx = await factory.createVault(
  "ipfs://your-metadata-uri",
  ethers.utils.parseEther("1.0")
);
```

3. Initialize the vault:
```javascript
const vault = await ethers.getContractAt("VaultCore", vaultAddress);
await vault.initialize(shareTokenAddress, governanceAddress);
```

## Security

The protocol implements several security measures:

- Reentrancy protection on all external functions
- Role-based access control
- Emergency pause functionality
- Proposal timelock
- Bond requirements for proposals

## Development

### Testing

Run the test suite:
```bash
npm test
```

### Deployment

Deploy to mainnet:
```bash
npm run deploy
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenZeppelin for secure contract libraries
- Compound for governance inspiration
- Moloch DAO for ragequit mechanism 