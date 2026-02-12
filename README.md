# MegaNames

> `.mega` naming service for MegaETH — human-readable addresses on the real-time blockchain

**Live:** [meganame.market](https://meganame.market) · **Docs:** [AGENTS.md](./AGENTS.md)

## Overview

MegaNames provides ENS-style naming for MegaETH's `.mega` TLD with stable USDM pricing and [ERC-7828](https://interopaddress.com/) cross-chain interop support.

- **ERC-721 Name Ownership** — Names are NFTs you own and transfer
- **USDM Payments** — Stable USD pricing, no ETH volatility
- **Direct Registration** — Simple approve + register flow
- **Forward + Reverse Resolution** — `bread.mega` ↔ `0x...`
- **Cross-Chain Interop** — `bread.mega@megaeth` via [ERC-7828](https://interopaddress.com/)
- **On-Chain Websites** — IPFS/Warren contenthash hosting
- **Text Records** — Social profiles, avatar, metadata
- **Free Subdomains** — Parent-controlled, unlimited depth
- **Multi-Year Discounts** — Up to 25% off for 10-year registrations
- **Premium Decay** — Dutch auction pricing for expired name re-registration

## Fee Structure

100% of fees go to on-chain infrastructure.

| Length | Annual Fee | | Multi-Year | Discount |
|--------|-----------|---|------------|----------|
| 1 char | $1,000 | | 2 years | 5% |
| 2 char | $500 | | 3 years | 10% |
| 3 char | $100 | | 5 years | 15% |
| 4 char | $10 | | 10 years | 25% |
| 5+ char | $1 | | | |

## Contracts

### MegaETH Mainnet (Chain ID: 4326)

| Contract | Address |
|----------|---------|
| MegaNames | [`0x5B424C6CCba77b32b9625a6fd5A30D409d20d997`](https://megaeth.blockscout.com/address/0x5B424C6CCba77b32b9625a6fd5A30D409d20d997) |
| USDM | [`0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7`](https://megaeth.blockscout.com/address/0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7) |

**Fee Recipient:** `0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38`

**Etherscan:** [mega.etherscan.io/address/0x5B424C6CCba77b32b9625a6fd5A30D409d20d997](https://mega.etherscan.io/address/0x5B424C6CCba77b32b9625a6fd5A30D409d20d997)

## Quick Start

### Register a Name

```solidity
// 1. Approve USDM spending
IERC20(usdm).approve(address(megaNames), fee);

// 2. Register
uint256 tokenId = megaNames.register("yourname", yourAddress, 1); // 1 year
```

### Resolve Names

```solidity
// Forward: name → address
address resolved = megaNames.addr(tokenId);

// Reverse: address → name
string memory name = megaNames.getName(yourAddress);
```

### Set Records

```solidity
megaNames.setAddr(tokenId, targetAddress);
megaNames.setText(tokenId, "com.twitter", "@yourhandle");
megaNames.setContenthash(tokenId, ipfsHash);
megaNames.setWarrenContenthash(tokenId, warrenTokenId, isMaster);
megaNames.setPrimaryName(tokenId);
```

### Subdomains

```solidity
// Free — parent owner creates unlimited subdomains
uint256 subId = megaNames.registerSubdomain(parentTokenId, "blog");
// Result: blog.yourname.mega
```

## Development

```bash
forge build      # Compile
forge test       # Run tests (60 passing)
```

### Token ID Computation

```solidity
bytes32 MEGA_NODE = keccak256(abi.encodePacked(bytes32(0), keccak256("mega")));
uint256 tokenId = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(bytes(label)))));
```

## Tech Stack

- **Contracts:** Solidity 0.8.30, [Solady](https://github.com/Vectorized/solady) (ERC721, EnumerableSetLib, SafeTransferLib), [Soledge](https://github.com/0xsequence/soledge) (ReentrancyGuard)
- **Frontend:** Next.js 16, Tailwind CSS, wagmi v2, viem
- **Deployment:** Cloudflare Pages (frontend), Foundry (contracts)

## Security

Fork of [wei-names](https://github.com/z0r0z/wei-names) by z0r0z. Key changes:
- TLD: `wei` → `mega`
- Payment: ETH → USDM (ERC-20, 18 decimals)
- Added: multi-year discounts, ERC721 enumeration, Warren contenthash, counters, premium decay, launch mode, subdomain revocation
- Security audited: strict label validation (`[a-z0-9-]`), zero-address guards, stale token burn

## License

MIT
