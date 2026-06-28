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

## Real settlement against a live TxLINE proof

Not a mock — `scripts/probe-txline.ts` subscribes (free tier), authenticates as a
guest, and fetches a real `stat-validation` Merkle proof from TxLINE's devnet API.
`scripts/real-settlement.ts` then runs `create_product` (writer posts real collateral) →
`settle_leg` (real CPI into the real `txoracle` program, not the localnet mock) →
`finalize_product` → `withdraw_writer_surplus`, all on devnet.

**Product:** [`5nVjJJrdSw9E2VYF7xLJp1SFyw3nemVxkiwftZdV4q5Y`](https://explorer.solana.com/address/5nVjJJrdSw9E2VYF7xLJp1SFyw3nemVxkiwftZdV4q5Y?cluster=devnet)
**settle_leg tx:** [`5w8drD6zKPohHZ49x9SnG787NZdfMAjCAhzR4d1bY7cj8dMkvXpcSxXDEmFiDNozcfsADfSRb7k2nWxMY7JXdCFo`](https://explorer.solana.com/tx/5w8drD6zKPohHZ49x9SnG787NZdfMAjCAhzR4d1bY7cj8dMkvXpcSxXDEmFiDNozcfsADfSRb7k2nWxMY7JXdCFo?cluster=devnet)

Verified independently via `solana confirm -v`, not just trusting the script's own
output: real `ValidateStat` CPI, `SUCCESS: Found valid on-chain root for interval 215`,
`Predicate evaluated to: true`, program return data `0x01`.

**Scope note, stated plainly:** this run has no buyer deposit. settle_leg's anti-sniping
check (the batch must postdate `closes_at`) means a buyer deposit needs `closes_at` in the
future, but the only reliably available real proof — TxLINE's static documented example
(fixture `17952170`, seq `941`, stat key `1002`) — is frozen historical data whose
timestamp never advances. A 24h scan of TxLINE's live feed found one fixture that *was*
genuinely live a few hours earlier (climbing seq numbers, real stats) but it isn't
actively updating right now, so there's no currently-live fixture to demo the full buyer
flow against either. Buyer-side economics (2.5x payout, real upside, surplus math) are
proven separately and rigorously against the mock oracle in `tests/strata.ts` (6/6
passing) — that doesn't depend on a live match existing. This script proves the other
half for real: collateral posting, the CPI itself, and surplus reclaim, all with real SOL
on devnet. `scripts/probe-txline.ts --discover` (with `--pinFixture`/`--pinStatKey` for
re-fetching the same fixture's freshest batch) is ready to run the full buyer flow for
real whenever TxLINE's simulation has an active match again.

The captured proof is committed as our own golden vector at
`tests/fixtures/real-devnet-proof.json`, so this exact settlement is reproducible.

Re-run with:

```bash
ANCHOR_WALLET=~/.config/solana/oracle-keypair.json ./node_modules/.bin/ts-node -P tsconfig.json scripts/probe-txline.ts
ANCHOR_WALLET=~/.config/solana/oracle-keypair.json ./node_modules/.bin/ts-node -P tsconfig.json scripts/real-settlement.ts
```
