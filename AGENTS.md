# AGENTS.md — MegaNames Integration Guide

> Complete reference for AI agents and LLMs integrating with MegaNames (.mega naming service on MegaETH)

## Architecture

MegaNames is a single-contract ENS-style naming system. One Solidity contract (`MegaNames.sol`) handles registration, resolution, records, subdomains, and ERC-721 ownership. Payments are in USDM stablecoin (18 decimals). 100% of fees go to the Warren Protocol safe.

## Contract Addresses

```
# Testnet (Chain ID: 6342, RPC: https://carrot.megaeth.com/rpc)
MegaNames: 0x84443E5aC049636561f1A70FCAa8C8d776aA26f0
MockUSDM:  0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833

# Mainnet (Chain ID: 4326, RPC: https://mainnet.megaeth.com/rpc)
MegaNames: 0x3B4f7D6a5453f7161Eb5F7830726c12D3157c9Ad
USDM:      0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7

# Fee recipient (both networks)
Warren Safe: 0xd4aE3973244592ef06dfdf82470329aCfA62C187
```

## Token ID Computation

Names map to ERC-721 token IDs via namehash (same as ENS):

```
MEGA_NODE = keccak256(abi.encodePacked(bytes32(0), keccak256("mega")))
tokenId   = uint256(keccak256(abi.encodePacked(MEGA_NODE, keccak256(bytes(label)))))
```

In JavaScript (viem):
```javascript
import { keccak256, toBytes, encodePacked } from 'viem'

const MEGA_NODE = keccak256(encodePacked(
  ['bytes32', 'bytes32'],
  ['0x' + '00'.repeat(32), keccak256(toBytes('mega'))]
))

function getTokenId(label) {
  return BigInt(keccak256(encodePacked(
    ['bytes32', 'bytes32'],
    [MEGA_NODE, keccak256(toBytes(label.toLowerCase()))]
  )))
}
```

Subdomain token IDs use the parent's tokenId as the node:
```
subTokenId = uint256(keccak256(abi.encodePacked(parentTokenId, keccak256(bytes(subLabel)))))
```

## Fee Schedule

All fees are in USDM (18 decimals). `1 USDM = 1e18 wei`.

| Label Length | Annual Fee (USDM) | Raw Wei |
|---|---|---|
| 1 character | $1,000 | 1000e18 |
| 2 characters | $500 | 500e18 |
| 3 characters | $100 | 100e18 |
| 4 characters | $10 | 10e18 |
| 5+ characters | $1 | 1e18 |

### Multi-Year Discounts

| Duration | Discount (BPS) | Effective |
|---|---|---|
| 2 years | 500 | 5% off |
| 3 years | 1000 | 10% off |
| 5 years | 1500 | 15% off |
| 10 years | 2500 | 25% off |

Formula: `totalFee = (yearlyFee * numYears) - (yearlyFee * numYears * discountBPS / 10000)`

Use `calculateFee(labelLength, numYears)` on-contract or replicate locally.

## ABI — Complete Function Reference

### Read Functions

```solidity
// Name resolution
function addr(uint256 tokenId) → address          // Forward: tokenId → address
function getName(address addr_) → string           // Reverse: address → primary name
function primaryName(address) → uint256            // Address → primary tokenId

// Record queries
function records(uint256 tokenId) → (string label, uint256 parent, uint64 expiresAt, uint64 epoch, uint64 parentEpoch)
function text(uint256 tokenId, string key) → string
function contenthash(uint256 tokenId) → bytes
function warren(uint256 tokenId) → (uint32 warrenTokenId, bool isMaster, bool isWarren)

// Pricing
function registrationFee(uint256 labelLength) → uint256    // Annual fee for label length
function calculateFee(uint256 labelLength, uint256 numYears) → uint256  // Total with discount

// Enumeration
function balanceOf(address owner) → uint256
function ownerOf(uint256 id) → address
function tokensOfOwner(address owner) → uint256[]          // All tokenIds owned
function tokensOfOwnerCount(address owner) → uint256

// Counters
function totalRegistrations() → uint256
function totalRenewals() → uint256
function totalSubdomains() → uint256
function totalVolume() → uint256                           // Cumulative USDM collected

// Registration helpers
function makeCommitment(string label, address owner, bytes32 secret) → bytes32
function commitments(bytes32) → uint256                    // Timestamp of commitment
```

### Write Functions

```solidity
// Registration (commit-reveal)
function commit(bytes32 commitment)                        // Step 1: commit hash
function register(string label, address owner, bytes32 secret, uint256 numYears) → uint256  // Step 2: reveal + register
function registerDirect(string label, address owner, uint256 numYears) → uint256  // Owner-only: skip commit-reveal
function registerWithPermit(string label, address owner, uint256 numYears, uint256 deadline, uint8 v, bytes32 r, bytes32 s) → uint256

// Management
function renew(uint256 tokenId, uint256 numYears)
function setAddr(uint256 tokenId, address addr_)
function setText(uint256 tokenId, string key, string value)
function setContenthash(uint256 tokenId, bytes hash)
function setWarrenContenthash(uint256 tokenId, uint32 warrenTokenId, bool isMaster)
function setPrimaryName(uint256 tokenId)

// Subdomains (free, parent-owner only)
function registerSubdomain(uint256 parentId, string label) → uint256

// ERC-721 transfers
function transferFrom(address from, address to, uint256 id)
function safeTransferFrom(address from, address to, uint256 id)
```

### Events

```solidity
event NameRegistered(uint256 indexed tokenId, string label, address indexed owner, uint256 expiresAt)
event SubdomainRegistered(uint256 indexed tokenId, uint256 indexed parentId, string label)
event Transfer(address indexed from, address indexed to, uint256 indexed id)
```

## Integration Patterns

### Pattern 1: Check Name Availability

```javascript
const tokenId = getTokenId("desiredname")
const record = await publicClient.readContract({
  address: MEGANAMES,
  abi, functionName: 'records', args: [tokenId]
})
const isAvailable = record[0] === '' // empty label = unregistered
```

### Pattern 2: Register a Name (Full Flow)

```javascript
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

// 3. Commit
const secret = '0x' + crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')
const commitment = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'makeCommitment',
  args: [label, ownerAddress, secret]
})
await walletClient.writeContract({
  address: MEGANAMES, abi, functionName: 'commit', args: [commitment]
})

// 4. Wait 60 seconds (MIN_COMMITMENT_AGE)

// 5. Register (within 24 hours)
const tokenId = await walletClient.writeContract({
  address: MEGANAMES, abi, functionName: 'register',
  args: [label, ownerAddress, secret, BigInt(numYears)]
})
```

### Pattern 3: Resolve Name to Address

```javascript
const tokenId = getTokenId("bread")
const address = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'addr', args: [tokenId]
})
```

### Pattern 4: Reverse Resolve (Address → Name)

```javascript
const name = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'getName', args: [userAddress]
})
// Returns "bread" if that's their primary name, "" if none set
```

### Pattern 5: Get All Names for an Address

```javascript
const tokenIds = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'tokensOfOwner', args: [userAddress]
})
// Then fetch records for each:
const names = await Promise.all(tokenIds.map(id =>
  publicClient.readContract({ address: MEGANAMES, abi, functionName: 'records', args: [id] })
))
```

### Pattern 6: Warren Contenthash (On-Chain Website)

```javascript
// Link a Warren NFT to your .mega name
await walletClient.writeContract({
  address: MEGANAMES, abi, functionName: 'setWarrenContenthash',
  args: [tokenId, warrenTokenId, true] // true = master copy
})

// Contenthash format: 0xe9 + 01(master)/02(copy) + 4-byte warrenTokenId
// Read back:
const { warrenTokenId, isMaster, isWarren } = await publicClient.readContract({
  address: MEGANAMES, abi, functionName: 'warren', args: [tokenId]
})
```

## Cross-Chain Interop (ERC-7828)

MegaNames supports the [Interop Address Standard](https://interopaddress.com/) for cross-chain resolution:

```
bread.mega@megaeth     → resolves on MegaETH
bread.mega@ethereum    → resolves on Ethereum (future)
```

The `@chain` suffix identifies which network to resolve on. This is handled at the application/wallet layer, not in the contract itself.

## Text Record Keys

Standard keys (compatible with ENS):

| Key | Description | Example |
|-----|-------------|---------|
| `avatar` | Profile image URL | `https://...` or `ipfs://...` |
| `url` | Website | `https://bread.mega` |
| `com.twitter` | Twitter/X handle | `bread_` |
| `com.github` | GitHub username | `0xBreadguy` |
| `com.discord` | Discord handle | `0xBreadguy` |
| `org.telegram` | Telegram handle | `OxBreadguy` |
| `description` | Bio/description | `Building on MegaETH` |

## Important Constants

```
MIN_COMMITMENT_AGE = 60 seconds      // Wait after commit before register
MAX_COMMITMENT_AGE = 86400 seconds   // 24 hours — commit expires after this
REGISTRATION_DURATION = 365 days     // Per year
MAX_DEPTH = 3                        // Subdomain nesting limit
TLD = "mega"
```

## MegaETH-Specific Notes

- **Gas estimation:** Use `eth_estimateGas` RPC — local forge estimation may fail with "intrinsic gas too low" on MegaETH
- **Instant receipts:** Use `realtime_sendRawTransaction` for immediate transaction confirmation
- **USDM decimals:** 18 (same as ETH wei)
- **Block times:** ~10ms (real-time blockchain) — the 60-second commit wait is enforced by block timestamps

## Frontend

Live at [meganame.market](https://meganame.market). Source in `web/` directory.

Stack: Next.js 16 + Tailwind CSS + wagmi v2 + viem

## Source Files

```
src/MegaNames.sol          # Main contract (registry + resolver + ERC-721)
src/WarrenLib.sol           # Warren contenthash encoding helpers
src/MockUSDM.sol            # Test token for testnet
test/MegaNames.t.sol        # 14 tests covering all functionality
script/Deploy.s.sol         # Testnet deployment (creates MockUSDM)
script/DeployMainnet.s.sol  # Mainnet deployment (uses real USDM)
web/                        # Next.js frontend
```
