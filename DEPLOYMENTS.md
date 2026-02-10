# MegaNames Deployments

## Testnet (Chain ID: 6343)

| Contract | Address |
|----------|---------|
| **MegaNames** | `0xc1e0d3C5Cc68F8b7F95252668C5ed1cBDBF82aE9` |
| **MockUSDM** | `0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833` |
| Fee Recipient | `0xd4aE3973244592ef06dfdf82470329aCfA62C187` (Warren Safe) |

**RPC:** `https://carrot.megaeth.com/rpc`
**Explorer:** `https://megaeth-testnet-v2.blockscout.com`

### Features
- `registerWithPermit(label, owner, deadline, v, r, s)` - Single-tx registration with EIP-2612 permit
- `registerDirect(label, owner)` - Direct registration (requires prior approval)
- USDM payments (18 decimals)
- Warren contenthash support

### Pricing
| Length | Fee/year |
|--------|----------|
| 1 char | $1,000 |
| 2 char | $500 |
| 3 char | $100 |
| 4 char | $10 |
| 5+ char | $1 |

---

## Mainnet (Chain ID: 4326)

*Not deployed yet*

---

*Last updated: 2026-02-10*
