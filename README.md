# MegaNames

> `.mega` naming service for MegaETH — human-readable addresses on the real-time blockchain

**Live:** [meganame.market](https://meganame.market) · **Docs:** [AGENTS.md](./AGENTS.md)

## Overview

MegaNames provides ENS-style naming for MegaETH's `.mega` TLD with stable USDM pricing and [ERC-7828](https://interopaddress.com/) cross-chain interop support.

- **ERC-721 Name Ownership** — Names are NFTs you own and transfer
- **USDM Payments** — Stable USD pricing, no ETH volatility
- **Commit-Reveal Registration** — Front-running protection
- **Forward + Reverse Resolution** — `bread.mega` ↔ `0x...`
- **Cross-Chain Interop** — `bread.mega@megaeth` via [ERC-7828](https://interopaddress.com/)
- **On-Chain Websites** — IPFS/Warren contenthash hosting
- **Text Records** — Social profiles, avatar, metadata
- **Free Subdomains** — Parent-controlled, unlimited depth
- **Multi-Year Discounts** — Up to 25% off for 10-year registrations

## Fee Structure

100% of fees go to the [Warren Protocol](https://github.com/megaeth-labs/warren) safe for on-chain website infrastructure.

| Length | Annual Fee | | Multi-Year | Discount |
|--------|-----------|---|------------|----------|
| 1 char | $1,000 | | 2 years | 5% |
| 2 char | $500 | | 3 years | 10% |
| 3 char | $100 | | 5 years | 15% |
| 4 char | $10 | | 10 years | 25% |
| 5+ char | $1 | | | |

## Contracts

### MegaETH Testnet (Chain ID: 6342)

| Contract | Address |
|----------|---------|
| MegaNames | [`0x84443E5aC049636561f1A70FCAa8C8d776aA26f0`](https://megaexplorer.xyz/address/0x84443E5aC049636561f1A70FCAa8C8d776aA26f0) |
| MockUSDM | [`0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833`](https://megaexplorer.xyz/address/0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833) |

### MegaETH Mainnet (Chain ID: 4326)

| Contract | Address |
|----------|---------|
| MegaNames | [`0x3B4f7D6a5453f7161Eb5F7830726c12D3157c9Ad`](https://megaexplorer.xyz/address/0x3B4f7D6a5453f7161Eb5F7830726c12D3157c9Ad) |
| USDM | [`0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7`](https://megaexplorer.xyz/address/0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7) |

**Fee Recipient (Warren Safe):** `0xd4aE3973244592ef06dfdf82470329aCfA62C187`

## Quick Start

### Register a Name

```solidity
// 1. Approve USDM spending
IERC20(usdm).approve(address(megaNames), fee);

// 2. Commit (front-running protection)
bytes32 secret = keccak256("your-secret");
bytes32 commitment = megaNames.makeCommitment("yourname", yourAddress, secret);
megaNames.commit(commitment);

// 3. Wait 60 seconds, then register (within 24 hours)
uint256 tokenId = megaNames.register("yourname", yourAddress, secret, 1); // 1 year
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
forge test       # Run tests (14 passing)
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
- Fee recipient: hardcoded Warren Safe
- Added: multi-year discounts, ERC721 enumeration, Warren contenthash, counters

## License

MIT
