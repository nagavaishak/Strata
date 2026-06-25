# Strata

Structured parametric payoffs on Solana, settled by [TxLINE](https://txline.txodds.com) Merkle proofs — no AMM, no pricing curve, no oracle trust.

Instead of a binary win/lose market, a Strata product bundles N stat conditions ("legs") into one instrument with a tiered payout table (e.g. 3/3 legs true → 100%, 2/3 → 50%, 1/3 → 10%). Settlement is fully permissionless: anyone can submit the on-chain Merkle proof for each leg, and the program — not the caller — constructs the predicate and verifies it via CPI into TxLINE's `validate_stat`.

See [design/diagrams/settlement_architecture.md](design/diagrams/settlement_architecture.md) for the full pipeline, account map, and instruction set.

Built for Superteam Ireland's World Cup Hackathon — Track 1: Prediction Markets and Settlement.
