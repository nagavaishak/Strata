# Strata

Structured parametric payoffs on Solana, settled by [TxLINE](https://txline.txodds.com) Merkle proofs — no AMM, no pricing curve, no oracle trust.

Instead of a binary win/lose market, a Strata product bundles N stat conditions ("legs") into one instrument with a tiered payout table (e.g. 3/3 legs true → 100%, 2/3 → 50%, 1/3 → 10%). Settlement is fully permissionless: anyone can submit the on-chain Merkle proof for each leg, and the program — not the caller — constructs the predicate and verifies it via CPI into TxLINE's `validate_stat`.

See [design/diagrams/settlement_architecture.md](design/diagrams/settlement_architecture.md) for the full pipeline, account map, and instruction set.

**Demo video:** https://youtu.be/WDlSXoMslXY

**Live app:** https://stratamarkets.vercel.app (also live at https://app-wine-six-56.vercel.app) · **Devnet program:** [`37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs`](https://explorer.solana.com/address/37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs?cluster=devnet)

Proven twice against genuinely live World Cup matches, not historical data: a real deposit locked in *before* the match had any stats, settled only once TxLINE sealed a batch that postdated the close — see [DEVNET.md](DEVNET.md) for both full runs, real tx signatures included.

- [TECHNICAL.md](TECHNICAL.md) — core idea, technical highlights, TxLINE endpoints used
- [FEEDBACK.md](FEEDBACK.md) — our experience building against the TxLINE API
- [DEVNET.md](DEVNET.md) — every proof run, real transaction signatures, deployment notes

Built for Superteam Ireland's World Cup Hackathon — Track 1: Prediction Markets and Settlement.
