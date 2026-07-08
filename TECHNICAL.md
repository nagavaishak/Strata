# Strata — Technical Overview

## Core idea

Every other prediction-market submission on this track is a single-predicate
binary bet: pick a side, wait, get paid or don't. Strata is a **structured
settlement engine** — it turns a bundle of independent stat conditions ("legs")
into one instrument with a tiered payout table, the same way a real structured
note or parametric insurance product works. "If 3 of 5 conditions hold, pay 2x;
if only 1 holds, pay 1.2x; if none hold, pay 0" is not expressible as a single
yes/no market, and no other submission we surveyed attempts it.

Alongside that, Strata also supports **exact-outcome products** (e.g. predict
the final scoreline precisely) using TxLINE's newly-shipped `validate_stat_v2`
geometric distance predicate — a capability that didn't exist anywhere in the
hackathon field until this API update landed mid-event.

Settlement for both product types is a **permissionless, on-chain CPI** into
TxLINE's own program. Strata never runs an oracle, never trusts a signer, and
never self-attests a result — the Solana program itself constructs the
predicate from the product's own definition and verifies it against TxLINE's
published Merkle roots. Anyone can call `settle_leg`; trust comes from the
proof, not from who submitted it.

## Business highlights

- **Underwriter economics, not a parimutuel pool.** Writers post collateral
  into a shared pool (one pool backs every product they create, not one vault
  per product), sized to the worst-case payout across their whole book. A
  single running invariant — `pool_vault_balance >= reserved + owed` — is
  enforced at every mutation, so capital efficiency scales with the number of
  products a writer runs, not against it.
- **Anti-sniping is a first-class on-chain check**, not a UI convention:
  `settle_leg`/`settle_geo_product` reject any TxLINE batch whose
  `min_timestamp` predates the product's `closes_at`. A user watching the live
  (unprovable) stream can't deposit on something they already saw before
  TxLINE has sealed it into a provable batch.
- **A verification receipt page** re-derives every settled payout from
  on-chain data alone, and lists the real transaction history via
  `getSignaturesForAddress` — no backend trust required to audit a result.

## Technical highlights

- **Two independent settlement primitives, both proven on real devnet with
  real SOL, not just in a local test suite:**
  - Tiered multi-leg CPI into `validate_stat` (per-leg proof, tallied into a
    monotonic payout tier table on `finalize_product`).
  - Single-shot CPI into `validate_stat_v2` for geometric exact-outcome
    products (`settle_geo_product` combines settle + finalize atomically,
    since there's no per-leg tally to wait on).
- **A genuinely live buyer-deposit-to-claim loop**, not a historical replay:
  deposit locked in before the data existed, the program then waited on a
  real TxLINE batch to seal ~9.5 minutes later with a `min_timestamp` that
  actually postdated `closes_at`, then settled via real CPI. Documented in
  full in [`DEVNET.md`](DEVNET.md).
- **Credential isolation in the frontend**: the TxLINE API session
  (subscribe → guest JWT → API-token activation) is held server-side only,
  cached once per server process. The browser never sees the credential —
  every TxLINE read goes through Strata's own `/api/txline/*` proxy routes.
- Full account/instruction map, Mermaid pipeline diagram, and the solvency
  invariant's proof sketch are in
  [`design/diagrams/settlement_architecture.md`](design/diagrams/settlement_architecture.md).

## TxLINE endpoints used

**REST (via the server-side proxy, `app/lib/txline/session.ts`):**
- `POST /auth/guest/start` — guest JWT issuance
- `POST /api/token/activate` — API token activation, signed with the writer keypair
- `GET /api/scores/updates/{epochDay}/{hour}/{interval}` — bucket scan to find a fixture's latest sequence
- `GET /api/scores/stat-validation?fixtureId=&seq=&statKey=` — V1 single-stat proof fetch
- `GET /api/scores/stat-validation?fixtureId=&seq=&statKeys=a,b` — V2 multi-stat proof fetch
- `GET /api/scores/stream` (SSE) — live match event stream, used to confirm a fixture is actually live

**On-chain (CPI into TxLINE's `txoracle` program):**
- `subscribe` — free-tier API access, called once per writer keypair
- `validate_stat` — the tiered engine's per-leg proof verification
- `validate_stat_v2` — the geometric product's exact-outcome proof verification

## Deployed program

Devnet: [`37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs`](https://explorer.solana.com/address/37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs?cluster=devnet)

See [`DEVNET.md`](DEVNET.md) for every proof run's transaction signatures and
independently-verifiable on-chain state, and `app/README.md` (frontend) for
running the UI locally against devnet.
