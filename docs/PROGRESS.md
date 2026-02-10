# MegaNames Progress

## Project Overview
- **Domain:** meganame.market (Cloudflare)
- **TLD:** `.mega`
- **Payment:** USDM stablecoin (18 decimals)
- **Fee Recipient:** Warren Safe (`0xd4aE3973244592ef06dfdf82470329aCfA62C187`)

---

## Phase 1: Smart Contracts ✅

### Completed (2026-02-09)

**MegaNames.sol** - ENS-style naming for MegaETH
- Fork of z0r0z/wei-names
- USDM payments (not ETH)
- Commit-reveal registration
- Forward + reverse resolution
- Contenthash (IPFS/Warren)
- Text records
- Free subdomains
- 14 tests passing

**Pricing (per year):**
| Length | Fee |
|--------|-----|
| 1 char | $1,000 |
| 2 char | $500 |
| 3 char | $100 |
| 4 char | $10 |
| 5+ char | $1 |

### Testnet Deployment
| Contract | Address |
|----------|---------|
| MegaNames | `0xaa63b6535c7e8aa887764da86295e72116dfe52f` |
| MockUSDM | `0x36c9b178b7d34c1a3582369e5bca42c4dc5e95ff` |

**Test:** `bread.mega` registered successfully

---

## Phase 2: Infrastructure 🔄

### Domain: meganame.market
- [x] Purchased from Cloudflare
- [ ] Cloudflare Pages project created
- [ ] API token for crumb
- [ ] Custom domain configured

---

## Phase 3: Website 📋

### Stack (Planned)
- Next.js 14 (App Router)
- wagmi/viem
- Tailwind CSS
- Cloudflare Pages

---

*Last updated: 2026-02-09*
