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
`scripts/real-settlement.ts` then runs the full lifecycle on devnet:
`create_product` → `deposit` → `settle_leg` (real CPI into the real `txoracle`
program, not the localnet mock) → `finalize_product` → `claim`.

**Product:** [`8BKXjPJATBAhubF4tDD5LR5Pj5B8PNGM7wEPrMSGcCJw`](https://explorer.solana.com/address/8BKXjPJATBAhubF4tDD5LR5Pj5B8PNGM7wEPrMSGcCJw?cluster=devnet)
**settle_leg tx:** [`2QWSwWpqSpWmTJRxkNjiBytPTiA6umEbPTRDYCBzUNANZodwDnpVVeRRAUW6sZzT8Az273GcKW2rLGooUhZu872U`](https://explorer.solana.com/tx/2QWSwWpqSpWmTJRxkNjiBytPTiA6umEbPTRDYCBzUNANZodwDnpVVeRRAUW6sZzT8Az273GcKW2rLGooUhZu872U?cluster=devnet)

Verified independently via `solana confirm -v`, not just trusting the script's own
output: real `ValidateStat` CPI, `SUCCESS: Found valid on-chain root for interval 215`,
`Predicate evaluated to: true`, program return data `0x01`. Payout resolved to 100%
(1/1 legs true) and `claim` transferred it.

The captured proof (fixture `17952170`, seq `941`, stat key `1002`) is committed as
our own golden vector at `tests/fixtures/real-devnet-proof.json`, so this exact
settlement is reproducible without needing a live match in progress.

Re-run with:

```bash
ANCHOR_WALLET=~/.config/solana/oracle-keypair.json ./node_modules/.bin/ts-node -P tsconfig.json scripts/probe-txline.ts
ANCHOR_WALLET=~/.config/solana/oracle-keypair.json ./node_modules/.bin/ts-node -P tsconfig.json scripts/real-settlement.ts
```
