# MegaNames — On-Chain Naming for MegaETH

> Native `.mega` names + Warren integration + ERC-7828 interop

## Status: Spec Phase

## Vision
The naming layer for MegaETH that:
- Provides human-readable `.mega` names as NFTs
- Integrates with Warren for fully on-chain websites
- Supports ERC-7828 for cross-chain interoperability
- Funds Warren protocol via registration fees

---

## 1. Identity & Branding

| Property | Value |
|----------|-------|
| **TLD** | `.mega` |
| **Project Name** | MegaNames |
| **Gateway** | `meganame.market` |
| **Ownership** | Bread → potentially gifted to ecosystem |
| **Fee Recipient** | `0xd4aE3973244592ef06dfdf82470329aCfA62C187` (Warren Safe) |

---

## 2. Technical Architecture

### 2.1 Contract Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  ERC-7828 Interop Layer                                         │
│  "mysite.mega@megaeth" cross-chain resolution                   │
├─────────────────────────────────────────────────────────────────┤
│  MegaNames (NameNFT.sol fork)                                   │
│  - ERC-721 name ownership                                       │
│  - Resolver (addr, contenthash, text)                           │
│  - Subdomains (free, parent-controlled)                         │
├─────────────────────────────────────────────────────────────────┤
│  Warren Protocol                                                │
│  - SSTORE2 website storage                                      │
│  - On-chain contenthash format                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Base Contract
- Fork: `z0r0z/wei-names` (NameNFT.sol)
- Chain: MegaETH mainnet (4326)
- Changes from WNS:
  - [ ] TLD: `wei` → `mega`
  - [ ] WEI_NODE → MEGA_NODE (new namehash)
  - [ ] Fee recipient → Warren address
  - [ ] Gas optimizations for MegaETH (RedBlackTreeLib?)
  - [ ] On-chain contenthash format for Warren

### 2.3 ERC-7828 Compatibility
- [x] MegaETH registered in ethereum-lists/chains (PR #8064)
- [ ] Register `mega` in on-chain registry (`on.eth`) when live
- [ ] Implement standard resolver interface (WNS already has this)

### 2.4 Warren Integration

#### Contenthash Format (7 bytes)
```
[codec 2B] [type 1B] [tokenId 4B]
```

| Field | Bytes | Value | Description |
|-------|-------|-------|-------------|
| **Codec** | 2 | `0xe9` | Warren namespace (pending multicodec registration) |
| **Type** | 1 | `0x01` or `0x02` | `0x01` = Master NFT, `0x02` = Container NFT |
| **TokenId** | 4 | uint32 | Up to ~4.2B sites |

**Fallback:** If multicodec registration doesn't get approved, use private-use range `0x300000` (8 bytes total).

#### Example
```
bread.mega → contenthash: 0xe9 01 00000001
                          ^^^^ ^^ ^^^^^^^^
                          codec type tokenId
```

- Deployment flow: TBD
- SDK/CLI: TBD

### 2.5 Gateway
- Domain: TBD
- Resolves: IPFS + on-chain content
- Operator: TBD

---

## 3. Economics

### 3.1 Pricing Model (USDM)
All fees paid in USDM stablecoin (18 decimals):

| Length | Fee (per year) |
|--------|----------------|
| 1 char | $1,000 |
| 2 char | $500 |
| 3 char | $100 |
| 4 char | $10 |
| 5+ char | $1 |

### 3.2 Fee Flow
```
User approves USDM
        ↓
User calls register()
        ↓
USDM transferred to Warren Safe
        ↓
Name NFT minted to user
```

### 3.3 Token Addresses
- **USDM Mainnet:** `0x078D782b760474a361dDA0AF3839290b0EF57AD6`
- **Warren Safe:** `0xd4aE3973244592ef06dfdf82470329aCfA62C187`

---

## 4. Features (from WNS)

### 4.1 Core (v1)
- [x] Name registration (commit-reveal)
- [x] ERC-721 ownership
- [x] Address resolution
- [x] Contenthash (IPFS + on-chain)
- [x] Text records
- [x] Reverse resolution
- [x] Subdomains (free, parent-controlled)
- [x] Renewal system (1 year + 90 day grace)
- [ ] Warren integration
- [ ] On-chain contenthash format

---

## 5. Dependencies

- [x] Warren protocol fee recipient address: `0xd4aE3973244592ef06dfdf82470329aCfA62C187`
- [x] Warren contenthash format spec (7-byte format with 0xe9 codec)
- [x] Gateway domain: `meganame.market`

---

*Last updated: 2026-02-10*
