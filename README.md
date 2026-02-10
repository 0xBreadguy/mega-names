# MegaNames

> `.mega` naming service for MegaETH — ENS-style names with Warren protocol integration

## Overview

MegaNames is a fork of [wei-names](https://github.com/z0r0z/wei-names) adapted for MegaETH's `.mega` TLD. It provides:

- **ERC-721 Name Ownership** — Names are NFTs you own and can transfer
- **Commit-Reveal Registration** — Front-running protection
- **Forward Resolution** — `bread.mega` → `0x...`
- **Reverse Resolution** — `0x...` → `bread.mega`
- **Contenthash** — IPFS/Warren on-chain website hosting
- **Text Records** — Social profiles, metadata
- **Free Subdomains** — Parent-controlled, infinite depth
- **ERC-7828 Ready** — Cross-chain name resolution

## Fee Structure

100% of registration fees go to the [Warren Protocol](https://github.com/megaeth-labs/warren) for on-chain website infrastructure:

| Length | Annual Fee |
|--------|-----------|
| 1 char | 0.5 ETH |
| 2 char | 0.1 ETH |
| 3 char | 0.05 ETH |
| 4 char | 0.01 ETH |
| 5+ char | 0.0005 ETH |

## Usage

### Register a Name

```solidity
// 1. Create commitment (off-chain: normalize with ens-normalize first)
bytes32 secret = keccak256("your-secret");
bytes32 commitment = names.makeCommitment("yourname", yourAddress, secret);

// 2. Commit (wait 60 seconds)
names.commit(commitment);

// 3. Register (within 24 hours of commit)
uint256 tokenId = names.register{value: fee}("yourname", yourAddress, secret);
```

### Set Records

```solidity
// Address resolution
names.setAddr(tokenId, 0x...);

// Contenthash (IPFS)
names.setContenthash(tokenId, ipfsContenthash);

// Text records
names.setText(tokenId, "com.twitter", "@yourhandle");

// Reverse resolution (set as your primary name)
names.setPrimaryName(tokenId);
```

### Create Subdomain

```solidity
// Free! Parent owner can create unlimited subdomains
uint256 subId = names.registerSubdomain(parentTokenId, "blog");
// Creates: blog.yourname.mega
```

## Development

```bash
# Build
forge build

# Test
forge test

# Deploy (testnet)
forge script script/Deploy.s.sol --rpc-url megaeth_testnet --broadcast

# Deploy (mainnet)
forge script script/Deploy.s.sol --rpc-url megaeth --broadcast
```

## Contracts

| Contract | Description |
|----------|-------------|
| `MegaNames.sol` | Main registry + resolver |

## Security

This is a fork of [wei-names](https://github.com/z0r0z/wei-names) with minimal changes:
- TLD: `wei` → `mega`
- Fee recipient: hardcoded to Warren Safe
- Pricing: adjusted for MegaETH

## License

MIT

## Deployments

| Network | Address | Explorer |
|---------|---------|----------|
| MegaETH Testnet | `0xE71b35a3af52A02CE62EfAEA43B9a1eCad680902` | [View](https://megaeth-testnet.explorer.caldera.xyz/address/0xE71b35a3af52A02CE62EfAEA43B9a1eCad680902) |
