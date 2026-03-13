---
name: meganames
description: AI coding skill for MegaNames (.mega naming service on MegaETH). Covers name registration with USDM payments, forward/reverse resolution, text records, free subdomains, subdomain marketplace with token gating, Warren Protocol contenthash for on-chain websites, and frontend integration with wagmi/viem. Works with Claude Code, Cursor, Windsurf, and OpenClaw.
---

# MegaNames (.mega) Development Skill

## What This Skill Is For

Use this skill when the user asks for:
- Registering or renewing `.mega` names on MegaETH
- Resolving names to addresses (forward) or addresses to names (reverse)
- Setting text records (avatar, social links, bio)
- Creating or revoking subdomains
- Selling subdomains via the marketplace (SubdomainRouter)
- Token-gating subdomain purchases
- Linking Warren Protocol on-chain websites to `.mega` names
- Building frontends that integrate MegaNames resolution
- Querying name ownership, expiry, or marketplace state

## Chain Configuration

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Mainnet | 4326 | `https://mainnet.megaeth.com/rpc` | `https://mega.etherscan.io` |
| Testnet | 6343 | `https://carrot.megaeth.com/rpc` | `https://testnet-mega.etherscan.io` |

## Contract Addresses (Mainnet)

| Contract | Address |
|----------|---------|
| MegaNames | `0x5B424C6CCba77b32b9625a6fd5A30D409d20d997` |
| USDM | `0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7` |
| Renderer | `0x8d206c277E709c8F4f8882fc0157bE76dA0C48C4` |
| SubdomainRouter | `0xdB5e5Ab907e62714D7d9Ffde209A4E770a0507Fe` |
| SubdomainLogic | `0xf09fB5cB77b570A30D68b1Aa1d944256171C5172` |
| Fee Recipient | `0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38` |

**Testnet:** MegaNames `0x8F0310eEDcfB71E5095ee5ce4f3676D9cEA65101` · MockUSDM `0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833`

**Frontend:** [dotmega.domains](https://dotmega.domains)

## Default Stack Decisions (Opinionated)

### 1. Use `eth_sendRawTransactionSync` for all writes
MegaETH returns receipts in <10ms via EIP-7966. No polling needed.

### 2. Use `registerWithPermit` when possible
Single-tx registration via ERC-2612 permit — better UX than approve + register.

### 3. Use on-contract fee calculation
Call `calculateFee(labelLength, numYears)` instead of replicating discount logic locally.

### 4. Resolve via tokenId, not string lookups
Compute the tokenId client-side, then call `addr(tokenId)`. Never send raw label strings to read functions.

### 5. Labels are always lowercase
Normalize labels with `.toLowerCase()` before hashing. The contract enforces `[a-z0-9-]` with no leading/trailing hyphens. Max 255 characters.

## Token ID Computation

Names map to ERC-721 token IDs via ENS-style namehashing:

```typescript
import { keccak256, encodePacked, toBytes } from 'viem'

const MEGA_NODE = keccak256(encodePacked(['bytes32', 'bytes32'], [
  '0x0000000000000000000000000000000000000000000000000000000000000000',
  keccak256(toBytes('mega'))
]))
// = 0x892fab39f6d2ae901009febba7dbdd0fd85e8a1651be6b8901774cdef395852f

function getTokenId(label: string): bigint {
  return BigInt(keccak256(encodePacked(['bytes32', 'bytes32'], [
    MEGA_NODE, keccak256(toBytes(label.toLowerCase()))
  ])))
}

// Subdomain tokenId uses parent tokenId as the node
function getSubTokenId(parentTokenId: bigint, subLabel: string): bigint {
  const parentBytes = `0x${parentTokenId.toString(16).padStart(64, '0')}` as `0x${string}`
  return BigInt(keccak256(encodePacked(['bytes32', 'bytes32'], [
    parentBytes, keccak256(toBytes(subLabel.toLowerCase()))
  ])))
}
```

## Fee Schedule

All fees in USDM (18 decimals).

| Label Length | Annual Fee | Multi-Year Discounts |
|---|---|---|
| 1 char | $1,000 | 2yr: 5%, 3yr: 10%, 5yr: 15%, 10yr: 25% |
| 2 chars | $500 | Same discount tiers |
| 3 chars | $100 | Same discount tiers |
| 4 chars | $10 | Same discount tiers |
| 5+ chars | $1 | Same discount tiers |

## Core Operations

### Register a Name

```typescript
// 1. Calculate fee
const fee = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'calculateFee',
  args: [BigInt(label.length), BigInt(numYears)]
})

// 2. Approve USDM
await walletClient.writeContract({
  address: USDM, abi: erc20Abi, functionName: 'approve',
  args: [MEGANAMES, fee]
})

// 3. Register
await walletClient.writeContract({
  address: MEGANAMES, abi, functionName: 'register',
  args: [label, ownerAddress, BigInt(numYears)]
})
```

### Register with Permit (Single Transaction)

```solidity
megaNames.registerWithPermit(
    "yourname",
    msg.sender,
    1,         // numYears
    deadline,  // permit deadline
    v, r, s    // ERC-2612 permit signature
);
```

### Resolve Name → Address

```typescript
const tokenId = getTokenId("bread")
const address = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'addr', args: [tokenId]
})
```

### Resolve Address → Name (Reverse)

```typescript
const name = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'getName', args: [userAddress]
})
// Returns "bread" or "" if no primary name
```

### Set Text Records

```typescript
await walletClient.writeContract({
  address: MEGANAMES, abi, functionName: 'setText',
  args: [tokenId, "com.twitter", "@yourhandle"]
})
```

Standard keys: `avatar`, `url`, `com.twitter`, `com.github`, `com.discord`, `org.telegram`, `description`

### Create Subdomains (Free)

```typescript
// Parent owner creates: blog.yourname.mega
await walletClient.writeContract({
  address: MEGANAMES, abi, functionName: 'registerSubdomain',
  args: [parentTokenId, "blog"]
})

// Subdomains are full ERC-721 tokens with their own resolution + records
// Nested up to 3 levels: sub.parent.mega → child.sub.parent.mega
```

## Subdomain Marketplace

Name owners sell subdomains through the SubdomainRouter. 97.5% to owner, 2.5% protocol fee.

### Seller Setup

```typescript
const ROUTER = '0xdB5e5Ab907e62714D7d9Ffde209A4E770a0507Fe'
const LOGIC  = '0xf09fB5cB77b570A30D68b1Aa1d944256171C5172'

// 1. Approve router (one-time)
await walletClient.writeContract({
  address: MEGANAMES, abi: erc721Abi, functionName: 'setApprovalForAll',
  args: [ROUTER, true]
})

// 2. Set price (min $0.01 USDM)
await walletClient.writeContract({
  address: LOGIC, abi: logicAbi, functionName: 'setPrice',
  args: [parentTokenId, parseUnits('1', 18)] // $1 USDM
})

// 3. Enable sales (mode: 0=open, 1=token-gated)
await walletClient.writeContract({
  address: ROUTER, abi: routerAbi, functionName: 'configure',
  args: [parentTokenId, payoutAddress, true, 0]
})
```

### Buyer Flow

```typescript
// 1. Get quote
const [allowed, price, protocolFee, total] = await publicClient.readContract({
  address: ROUTER, abi: routerAbi, functionName: 'quote',
  args: [parentTokenId, "sublabel", buyerAddress]
})

// 2. Approve USDM
await walletClient.writeContract({
  address: USDM, abi: erc20Abi, functionName: 'approve',
  args: [ROUTER, total]
})

// 3. Register
await walletClient.writeContract({
  address: ROUTER, abi: routerAbi, functionName: 'register',
  args: [parentTokenId, "sublabel", '0x0000000000000000000000000000000000000000'] // referrer
})
```

### Token Gating

```typescript
// Require buyers to hold a specific NFT/token
await walletClient.writeContract({
  address: LOGIC, abi: logicAbi, functionName: 'setTokenGate',
  args: [parentTokenId, tokenContractAddress, 1n] // min balance
})
// Use mode=1 in configure() to enable the gate
```

### Batch Registration

```solidity
// Register up to 50 subdomains in one tx
string[] memory labels = new string[](3);
labels[0] = "alpha"; labels[1] = "beta"; labels[2] = "gamma";
uint256[] memory tokenIds = router.registerBatch(parentTokenId, labels, address(0));
```

## Warren Contenthash (On-Chain Websites)

Link a `.mega` name to a Warren Protocol on-chain website:

```typescript
// Link Warren NFT (isMaster: true for Master, false for Container)
await walletClient.writeContract({
  address: MEGANAMES, abi, functionName: 'setWarrenContenthash',
  args: [tokenId, warrenTokenId, true]
})

// Read: returns { warrenTokenId, isMaster, isWarren }
const warren = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'warren', args: [tokenId]
})
// Contenthash format: 0xe9 + 01(master)/02(container) + 4-byte warrenTokenId
```

## Expired Names & Premium Decay

Names expire after their registration period. After a 90-day grace period, names become available with a Dutch auction premium decaying linearly from $10,000 → $0 over 21 days.

```typescript
const premium = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'currentPremium', args: [tokenId]
})
// Premium is added on top of base registration fee
```

## Enumeration & Stats

```typescript
// All names owned by an address
const tokenIds = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'tokensOfOwner', args: [userAddress]
})

// Global stats
const registered = await publicClient.readContract({ address: MEGANAMES, abi, functionName: 'totalRegistrations' })
const volume = await publicClient.readContract({ address: MEGANAMES, abi, functionName: 'totalVolume' })
```

## MegaETH-Specific Notes

- **Gas estimation:** Always use `eth_estimateGas` via RPC — local Foundry estimation may undercount on MegaETH
- **Instant receipts:** Use `eth_sendRawTransactionSync` (EIP-7966) for immediate confirmation
- **USDM:** 18 decimals, ERC-2612 permit supported
- **No commit-reveal:** MegaETH block times (~10ms) make front-running impractical

## Full ABI Reference

See [AGENTS.md](../AGENTS.md) in the repo root for the complete function reference, events, and integration patterns.
