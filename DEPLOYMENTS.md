# MegaNames Deployments

## Mainnet (Chain ID: 4326)

| Contract | Address |
|----------|---------|
| **MegaNames** | `0x5B424C6CCba77b32b9625a6fd5A30D409d20d997` |
| **USDM** | `0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7` |
| **Renderer** | `0x8d206c277E709c8F4f8882fc0157bE76dA0C48C4` |
| Fee Recipient | `0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38` |

**RPC:** `https://mainnet.megaeth.com/rpc`
**Explorer:** `https://mega.etherscan.io`

---

## Testnet (Chain ID: 6343)

| Contract | Address |
|----------|---------|
| **MegaNames** | `0x8F0310eEDcfB71E5095ee5ce4f3676D9cEA65101` |
| **MockUSDM** | `0xa8a7Ea151E366532ce8b0442255aE60E0ff2F833` |
| Fee Recipient | `0x25925C0191E8195aFb9dFA35Cd04071FF11D2e38` |

**RPC:** `https://carrot.megaeth.com/rpc`
**Explorer:** `https://megaeth-testnet-v2.blockscout.com`

---

### Features
- `register(label, owner, numYears)` - Direct registration
- `registerWithPermit(label, owner, numYears, deadline, v, r, s)` - Single-tx registration with EIP-2612 permit
- USDM payments (18 decimals)
- Warren contenthash support
- On-chain SVG renderer

### Pricing
| Length | Fee/year |
|--------|----------|
| 1 char | $1,000 |
| 2 char | $500 |
| 3 char | $100 |
| 4 char | $10 |
| 5+ char | $1 |

---

*Last updated: 2026-02-13*
