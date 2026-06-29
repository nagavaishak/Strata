# Strata — Settlement Architecture

Structured parametric payoffs settled on-chain via TxLINE Merkle proofs. No AMM, no pricing curve, no oracle trust — settlement is a permissionless proof-verification pipeline over discrete proven outcomes. Real upside is funded by a writer's collateral, pooled and shared across every product that writer creates, with a single provable solvency invariant instead of N separate dedicated vaults.

```mermaid
flowchart TB
    subgraph SRC["Data source — owned by TxODDS"]
        A1["Live match events"] --> A2["TxODDS feed\nbatched every 5 min"]
        A2 --> A3["Merkle tree built\nstat → event_stat_root → fixture/batch root"]
        A3 --> A4["txoracle::insert_scores_root\nroot published on-chain"]
    end

    subgraph POOL["Writer pool — one per underwriter, shared across all their products"]
        P1["initialize_writer_pool"] --> P2[("WriterPool PDA\nreserved, owed")]
        P3["fund_pool(amount)"] --> P4[("PoolVault PDA\nescrow")]
    end

    subgraph DEF["Product definition — off-chain, creator = writer"]
        B1["fixture_id, N legs\n(stat_key, comparison, threshold)\npayout_tiers, closes_at, max_capacity"] --> B2["create_product"]
        B2 --> B3{"collateral_required =\nmax_capacity × top_tier_bps / 10_000\n<= pool free capital?"}
        B3 --> B4[("Product PDA\nlegs + tier table")]
        B3 --> P2
    end

    subgraph INTAKE["Deposit — on-chain, user-facing"]
        C1["deposit(product, amount)"] --> C2[("Position PDA\nstake")]
        C1 --> P4
    end

    subgraph PROOF["Proof assembly — off-chain, permissionless keeper"]
        D1["fetch ScoresBatchSummary\n+ fixture_proof + main_tree_proof\n+ stat_proof per leg"] --> D2["package StatTerm\nper leg"]
    end

    subgraph SETTLE["Per-leg settlement — on-chain trust boundary"]
        E1["settle_leg(leg_index, proof material)"] --> E2{"program builds\nTraderPredicate\nfrom Product.legs\n+ rejects batches\npredating closes_at"}
        E2 --> E3["CPI → txoracle::validate_stat"]
        E3 --> E4["bool via return-data"]
        E4 --> E5[("LegResult[leg_index]")]
    end

    subgraph FIN["Finalization — on-chain"]
        F1["finalize_product"] --> F2["legs_true = count(LegResult == true)"]
        F2 --> F3["payout_bps = lookup_tier(payout_tiers, legs_true)"]
        F3 --> F4["pool.reserved -= collateral_required\npool.owed += total_stake × payout_bps / 10_000"]
        F4 --> F5["Product.status = Settled"]
    end

    subgraph CLAIM["Claim — on-chain, pull-based"]
        G1["claim(product, position)"] --> G2["payout = stake × payout_bps / 10_000"]
        G2 --> G3["PoolVault → user\npool.owed -= payout"]
    end

    subgraph WITHDRAW["Writer withdrawal — pool-wide, not per-product"]
        I1["withdraw_from_pool(amount)"] --> I2{"amount <=\nvault_balance - reserved - owed\nacross the WHOLE book?"}
        I2 --> P4
    end

    subgraph RECEIPT["Verification receipt — off-chain UI"]
        H1["re-fetch LegResult[] + roots + tx sigs"] --> H2["render per-leg proof\nanyone re-derives payout independently"]
    end

    A4 --> D1
    B4 --> E2
    D2 --> E1
    E5 --> F2
    F5 --> G1
    F5 --> H1
```

## The solvency invariant

Every instruction that touches `reserved` or `owed` preserves one inequality, never re-derives it from scratch per product:

```
pool_vault_balance >= reserved (open products' worst cases) + owed (settled, confirmed, unclaimed payouts)
```

- `fund_pool` only grows the left side.
- `create_product` checks free capital exists, then grows `reserved`.
- `finalize_product` moves an amount from `reserved` to `owed` — a pure transfer between the two counters, net effect on the invariant is zero.
- `claim` shrinks `vault_balance` and `owed` by the same amount — invariant unchanged.
- `withdraw_from_pool` only allows `vault_balance - reserved - owed` — provably safe across the writer's **entire book of products at once**, not a per-product calculation.

## Component cheat sheet

| Component | Why |
|---|---|
| `WriterPool` PDA | One per writer. Tracks `reserved` + `owed` as two running totals — no list of products needed, scales to any number of them with O(1) state. |
| `PoolVault` PDA | Shared escrow for one writer's entire book — collateral and buyer premiums both live here, not in per-product vaults. |
| `Product` PDA | Immutable leg definitions + payout tier table + a reference to the writer pool backing it. |
| `Position` PDA | Per-user stake, one claim flag. Pull-based payout, not push. |
| `settle_leg` (permissionless) | Anyone can call it — trust comes from the CPI-verified Merkle proof, not the caller's identity. Also rejects any batch that predates `closes_at`, blocking latency-sniping off TxLINE's live (unprovable) stream. |
| `txoracle::validate_stat` CPI | Read-only proof verifier against TxLINE's on-chain roots. We never read live state — TxLINE doesn't expose any. |
| Payout tier table | Deterministic, monotonic, validated at `create_product` time on-chain — no off-chain pricing, no AMM curve. Top tier sets the worst-case collateral requirement. |
| `withdraw_from_pool` | The actual cross-product feature: one call, provably safe across every open and settled-unclaimed product the writer has, not N separate per-product withdrawals. |
| Verification receipt UI | Re-derives the payout from on-chain data alone — zero backend trust required to audit a settlement. |

## Account map

| Account | Seeds | Holds |
|---|---|---|
| `WriterPool` | `["writer_pool", writer]` | writer, reserved, owed |
| `PoolVault` | `["pool_vault", writer]` | escrow lamports — collateral + buyer premiums, shared |
| `Product` | `["product", fixture_id, nonce]` | fixture_id, legs[], payout_tiers[], status, closes_at, leg_results, writer, writer_pool, max_capacity, collateral_locked |
| `Position` | `["pos", product, user]` | user, stake, claimed |

## Core instructions

1. `initialize_writer_pool` / `fund_pool` — one-time setup + capital top-ups
2. `create_product` — define legs + tier table, reserve worst-case collateral from the pool
3. `deposit` — buyer premium into the pool vault
4. `settle_leg` — permissionless, one CPI per leg into `validate_stat`, rejects stale batches
5. `finalize_product` — tally legs_true → payout_bps, move obligation reserved → owed
6. `claim` — pull-based payout, releases the matching `owed` amount
7. `withdraw_from_pool` — writer reclaims whatever isn't backing any open or owed obligation

## Why this, not an AMM/pricing-curve design

TxLINE's `validate_stat` is a read-only Merkle-proof verifier against roots published every 5 minutes — not a continuous live price feed. A bonding-curve/dynamic-pricing design assumes state TxLINE doesn't expose. Strata instead treats TxLINE purely as a settlement/verification rail and expresses the product logic as a deterministic tiered payout table, with real upside funded by underwriter collateral — financial engineering over discrete proven outcomes, not pricing mechanics.
