# MegaNames Deployments

## MegaETH Testnet (Chain 6343)

| Contract | Address | Verified |
|----------|---------|----------|
| MegaNames | `0xaa63b6535c7e8aa887764da86295e72116dfe52f` | ✅ |
| MockUSDM | `0x36c9b178b7d34c1a3582369e5bca42c4dc5e95ff` | ✅ |

**RPC:** `https://carrot.megaeth.com/rpc`

**Test Registrations:**
- `bread.mega` → `0x531eFfB68DC618A41bAecf320eD5caC218e969aE`

---

## MegaETH Mainnet (Chain 4326)

| Contract | Address |
|----------|---------|
| USDM | `0x078D782b760474a361dDA0AF3839290b0EF57AD6` |
| MegaNames | TBD |

**RPC:** `https://rpc.megaeth.com`

---

## Fee Recipient

Warren Protocol Safe: `0xd4aE3973244592ef06dfdf82470329aCfA62C187`

All registration and renewal fees go to this address.

---

## Website

| Environment | URL |
|-------------|-----|
| Production | https://meganame.market |
| Preview | https://meganame-market.pages.dev |

**Hosting:** Cloudflare Pages (`meganame-market`)

---

## Contract Verification

To verify on explorer:
```bash
forge verify-contract <ADDRESS> src/MegaNames.sol:MegaNames \
  --chain-id 6343 \
  --constructor-args $(cast abi-encode "constructor(address,address)" <USDM> <WARREN_SAFE>)
```
