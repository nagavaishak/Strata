# Devnet deployment

**Program:** [`37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs`](https://explorer.solana.com/address/37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs?cluster=devnet)

Deployed via `anchor deploy --provider.cluster devnet --program-name strata`.

## If `anchor deploy` complains about `DeclaredProgramIdMismatch`

`target/deploy/strata-keypair.json` is gitignored build output and can silently
regenerate with a random keypair (e.g. after a clean rebuild) that no longer matches
the `declare_id!` in `lib.rs`. The canonical keypair lives at
`programs/strata/strata-keypair.json` (also gitignored, not lost on clean). Fix:

```bash
cp programs/strata/strata-keypair.json target/deploy/strata-keypair.json
anchor build
anchor deploy --provider.cluster devnet --program-name strata
```

## Config

`settle_leg`'s CPI target is set via the on-chain `Config` account, not hardcoded.
Run once after deploying (safe to re-run — switches to `update_config` automatically
if `Config` already exists):

```bash
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/oracle-keypair.json \
./node_modules/.bin/ts-node -P tsconfig.json scripts/init-config.ts
```

**Done on this deployment:** Config PDA `7GsKusMMgkYvkw5JhHzkBGkrxz4d7iNkEEEUycepXgkZ`,
pointing at TxLINE's devnet `txoracle` program `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`.
Verified directly on-chain: owner is the Strata program, 73 bytes (matches `Config::SPACE`).

## Shared writer pool — cross-product solvency

Strata's products don't each lock their own collateral anymore. One pool per writer
backs every product they create, with a single running invariant enforced at every
mutation:

```
pool_vault_balance >= reserved (open products' worst cases) + owed (settled, confirmed, unclaimed payouts)
```

`scripts/real-pool-settlement.ts` proves this for real on devnet, with real SOL:
`initialize_writer_pool` → `fund_pool` → `create_product` **twice**, against the same
pool, reserving both products' worst cases at once → `settle_leg` on one of them (real
CPI into TxLINE's actual program) → `finalize_product`.

**Writer pool:** [`i7u34mcv1e6T7f8Q1bxVsWCvyzbgnsNTKu1f4Ay146B`](https://explorer.solana.com/address/i7u34mcv1e6T7f8Q1bxVsWCvyzbgnsNTKu1f4Ay146B?cluster=devnet)
**Product A (settled):** [`GGUUiVL1uKVgEuoHiQnVHnwUre59jXrhNu6nuUjo3ojv`](https://explorer.solana.com/address/GGUUiVL1uKVgEuoHiQnVHnwUre59jXrhNu6nuUjo3ojv?cluster=devnet)
**Product B (still open):** [`9DNhGwCBf2EmtM12ugZMdsAvjr3nLAShfqTNLcvhxJ1Q`](https://explorer.solana.com/address/9DNhGwCBf2EmtM12ugZMdsAvjr3nLAShfqTNLcvhxJ1Q?cluster=devnet)
**settle_leg tx:** [`3XxHHo13EPHqQBPjwzfnEnKfjWSbSapCpsrTy1ZaoJsMxFxGYSHdAQLsfkydYh6qX7PLbT2PzDmkcpcyQGTkbnF2`](https://explorer.solana.com/tx/3XxHHo13EPHqQBPjwzfnEnKfjWSbSapCpsrTy1ZaoJsMxFxGYSHdAQLsfkydYh6qX7PLbT2PzDmkcpcyQGTkbnF2?cluster=devnet)

On-chain arithmetic confirmed exactly as expected, not just "didn't error":
`reserved` went `0 → 14,500,000` lamports after both `create_product` calls (matching
`capacity × top_tier_bps / 10_000` for each, summed) → `4,500,000` after finalizing only
product A (its 10M released; B's 4.5M still held since B is still open). `settle_leg`
independently verified via `solana confirm -v`: real `ValidateStat` CPI,
`Predicate evaluated to: true`.

Same scope note as before applies: no buyer deposit in this run, for the reason
documented in `scripts/real-pool-settlement.ts`'s header (no live TxLINE fixture active
right now to safely demo against the anti-sniping check). Buyer-side accounting for the
shared pool (claim, owed release) is proven rigorously in `tests/strata.ts`'s two-product
test (7/7 passing).

Re-run with:

```bash
ANCHOR_WALLET=~/.config/solana/oracle-keypair.json ./node_modules/.bin/ts-node -P tsconfig.json scripts/probe-txline.ts
ANCHOR_WALLET=~/.config/solana/oracle-keypair.json ./node_modules/.bin/ts-node -P tsconfig.json scripts/real-pool-settlement.ts
```
