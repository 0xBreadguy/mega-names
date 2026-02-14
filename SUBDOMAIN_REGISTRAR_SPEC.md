# SubdomainRegistrar Spec — v1 (Final)

*Updated 2026-02-14 — Ready to build*

## Architecture

```
MegaNames.sol (deployed, immutable)
    ↑ setApprovalForAll / transferFrom / registerSubdomain
SubdomainRouter.sol (permanent)
    ↑ validate(parentId, label, buyer) → (bool, uint256)
SubdomainLogic.sol v1 (swappable)
```

## Design Decisions

1. **Flash-only** — no escrow. Parent NFT stays in wallet.
2. **2.5% protocol fee** → feeRecipient
3. **$0.01 USDM min price**
4. **Direct USDM transfers** — nothing pools
5. **Token gate** — 1 contract per parent (configurable max for future)
6. **No address allowlists in v1** — merkle proofs in v2
7. **Transient storage** for flash state + reentrancy guard
8. **MAX_BATCH_SIZE = 50**
9. **Counters on router** — permanent, survives logic upgrades
10. **Referral fee wired** — starts at 0%

## MegaETH Considerations Applied

- No unbounded mappings (max 4 slots per parent)
- Transient storage for flash (zero storage gas)
- Batch cap for volatile data 20M ceiling
- Remote gas estimation only
- No via_ir, optimizer_runs=200
- 60K intrinsic gas awareness
