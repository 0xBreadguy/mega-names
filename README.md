# MegaNames

> `.mega` naming service for MegaETH — ENS-style names with USDM payments

## Overview

MegaNames is a fork of [wei-names](https://github.com/z0r0z/wei-names) adapted for MegaETH's `.mega` TLD. It provides:

- **ERC-721 Name Ownership** — Names are NFTs you own and can transfer
- **USDM Payments** — Stable USD pricing, no ETH volatility
- **Commit-Reveal Registration** — Front-running protection
- **Forward Resolution** — `bread.mega` → `0x...`
- **Reverse Resolution** — `0x...` → `bread.mega`
- **Contenthash** — IPFS/Warren on-chain website hosting
- **Text Records** — Social profiles, metadata
- **Free Subdomains** — Parent-controlled, infinite depth
- **ERC-7828 Ready** — Cross-chain name resolution

## Fee Structure

100% of registration fees go to the [Warren Protocol](https://github.com/megaeth-labs/warren) for on-chain website infrastructure.

**All prices in USDM (18 decimals):**

| Length | Annual Fee |
|--------|-----------|
| 1 char | $1,000 |
| 2 char | $500 |
| 3 char | $100 |
| 4 char | $10 |
| 5+ char | $1 |

## Usage

### Register a Name

```solidity
// 1. Approve USDM spending
IERC20(usdm).approve(address(meganames), fee);

// 2. Create commitment (off-chain: normalize with ens-normalize first)
bytes32 secret = keccak256("your-secret");
bytes32 commitment = names.makeCommitment("yourname", yourAddress, secret);

// 3. Commit (wait 60 seconds)
names.commit(commitment);

// 4. Register (within 24 hours of commit)
uint256 tokenId = names.register("yourname", yourAddress, secret);
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

# Deploy (testnet - deploys MockUSDM)
forge script script/Deploy.s.sol --rpc-url megaeth_testnet --broadcast

# Deploy (mainnet - uses real USDM)
forge script script/Deploy.s.sol --rpc-url megaeth --broadcast
```

## Contracts

| Contract | Description |
|----------|-------------|
| `MegaNames.sol` | Main registry + resolver |
| `MockUSDM.sol` | Test token (18 decimals) |

## Addresses

### MegaETH Mainnet
| Contract | Address |
|----------|---------|
| USDM | `0x078D782b760474a361dDA0AF3839290b0EF57AD6` |
| MegaNames | TBD |

### MegaETH Testnet
No canonical USDM on testnet. Deploy script creates MockUSDM.

## Security

This is a fork of [wei-names](https://github.com/z0r0z/wei-names) with these changes:
- TLD: `wei` → `mega`
- Payment: ETH → USDM (ERC20)
- Fee recipient: hardcoded to Warren Safe
- Pricing: USD-denominated

## License

MIT
