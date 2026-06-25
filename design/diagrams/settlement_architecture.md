# Strata — Settlement Architecture

Structured parametric payoffs settled on-chain via TxLINE Merkle proofs. No AMM, no pricing curve, no oracle trust — settlement is a permissionless proof-verification pipeline over discrete proven outcomes.

```mermaid
flowchart TB
    subgraph SRC["Data source — owned by TxODDS"]
        A1["Live match events"] --> A2["TxODDS feed\nbatched every 5 min"]
        A2 --> A3["Merkle tree built\nstat → event_stat_root → fixture/batch root"]
        A3 --> A4["txoracle::insert_scores_root\nroot published on-chain"]
    end

    subgraph DEF["Product definition — off-chain, creator"]
        B1["fixture_id, N legs\n(stat_key, comparison, threshold)\npayout_tiers, closes_at"] --> B2["create_product"]
        B2 --> B3[("Product PDA\nlegs + tier table")]
        B2 --> B4[("Vault PDA\nescrow")]
    end

    subgraph INTAKE["Deposit — on-chain, user-facing"]
        C1["deposit(product, amount)"] --> C2[("Position PDA\nstake")]
        C1 --> B4
    end

    subgraph PROOF["Proof assembly — off-chain, permissionless keeper"]
        D1["fetch ScoresBatchSummary\n+ fixture_proof + main_tree_proof\n+ stat_proof per leg"] --> D2["package StatTerm\nper leg"]
    end

    subgraph SETTLE["Per-leg settlement — on-chain trust boundary"]
        E1["settle_leg(leg_index, proof material)"] --> E2{"program builds\nTraderPredicate\nfrom Product.legs"}
        E2 --> E3["CPI → txoracle::validate_stat"]
        E3 --> E4["bool via return-data"]
        E4 --> E5[("LegResult[leg_index]")]
    end

    subgraph FIN["Finalization — on-chain"]
        F1["finalize_product"] --> F2["legs_true = count(LegResult == true)"]
        F2 --> F3["payout_bps = lookup_tier(payout_tiers, legs_true)"]
        F3 --> F4["Product.status = Settled"]
    end

    subgraph CLAIM["Claim — on-chain, pull-based"]
        G1["claim(product, position)"] --> G2["payout = stake × payout_bps / 10_000"]
        G2 --> G3["Vault → user"]
    end

    subgraph RECEIPT["Verification receipt — off-chain UI"]
        H1["re-fetch LegResult[] + roots + tx sigs"] --> H2["render per-leg proof\nanyone re-derives payout independently"]
    end

    A4 --> D1
    B3 --> E2
    B4 --> G3
    C2 --> G1
    D2 --> E1
    E5 --> F2
    F4 --> G1
    F4 --> H1
```

## Component cheat sheet

| Component | Why |
|---|---|
| `Product` PDA | Immutable leg definitions + payout tier table. Source of truth for what gets settled. |
| `Vault` PDA | Escrow only — holds stakes, never holds logic. |
| `Position` PDA | Per-user stake, one claim flag. Pull-based payout, not push. |
| `settle_leg` (permissionless) | Anyone can call it — trust comes from the CPI-verified Merkle proof, not the caller's identity. |
| `txoracle::validate_stat` CPI | Read-only proof verifier against TxLINE's on-chain roots. We never read live state — TxLINE doesn't expose any. |
| Payout tier table | Deterministic, monotonic, validated at `create_product` time on-chain — no off-chain pricing, no AMM curve. |
| Settlement deadline | Legs unproven by deadline default to `false`, so the system always resolves to a payout. |
| Verification receipt UI | Re-derives the payout from on-chain data alone — zero backend trust required to audit a settlement. |

## Account map

| Account | Seeds | Holds |
|---|---|---|
| `Product` | `["product", fixture_id, nonce]` | fixture_id, legs[] (stat_key, comparison, threshold, op), payout_tiers[], status, closes_at, leg_results bitmap |
| `Vault` | `["vault", product]` | escrow lamports/tokens only |
| `Position` | `["pos", product, user]` | user, stake, claimed |

## Core instructions

1. `create_product` — define legs + tier table, init Vault
2. `deposit` — stake into a position
3. `settle_leg` — permissionless, one CPI per leg into `validate_stat`
4. `finalize_product` — tally legs_true → payout_bps from tier table
5. `claim` — pull-based payout

## Why this, not an AMM/pricing-curve design

TxLINE's `validate_stat` is a read-only Merkle-proof verifier against roots published every 5 minutes — not a continuous live price feed. A bonding-curve/dynamic-pricing design assumes state TxLINE doesn't expose. Strata instead treats TxLINE purely as a settlement/verification rail and expresses the product logic as a deterministic tiered payout table — financial engineering over discrete proven outcomes, not pricing mechanics.
