# NFT Funding Pool

A decentralized platform for NFT fractionalization and funding.

## Features

- NFT fractionalization
- Governance system
- Automated funding pools
- Secure vault management

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with your configuration:
```bash
cp .env.example .env
```

4. Update `.env` with your keys:
- RPC URLs (Alchemy/Infura)
- Private key for deployment
- Etherscan API key
- CoinMarketCap API key (optional)

## Development

```bash
# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deploy.js --network holesky
```

## Security

- All sensitive data is stored in GitHub Secrets
- Automated testing on every push
- Continuous deployment to testnet

## License

MIT 