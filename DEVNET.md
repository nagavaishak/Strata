# Devnet deployment

**Program:** [`37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs`](https://explorer.solana.com/address/37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs?cluster=devnet)

**Live frontend:** https://app-wine-six-56.vercel.app — deployed against this same
devnet program, connect a devnet wallet to try the full build/watch/verify flow.
Server-side TxLINE proxy verified working in production (not just locally): the
`ORACLE_KEYPAIR_JSON` env var, subscribe/guest-JWT/API-token flow, and
`/api/txline/*` routes all confirmed functional post-deploy. One caveat: the
session cache in `app/lib/txline/session.ts` assumes a long-lived process: a
serverless cold start on a different instance can re-run the subscribe flow
instead of reusing the cache. Not a cost/security issue (devnet SOL, and the
keypair never leaves the server), just means occasional requests are slower
than the warm-cache path.

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

## Live buyer-deposit flow — the full loop, against a genuinely live match

`scripts/live-buyer-flow.ts` closes the one gap every script above left open: a real
`deposit` made *before* the data it bets on exists, settled only once TxLINE seals a
batch that actually postdates the deposit's `closes_at` — not a frozen historical proof.

Run against fixture 18187298 (Brazil vs Norway, World Cup Round of 16, kicked off
2026-07-05 20:00 UTC):

1. Confirmed the fixture was live via the SSE stream (`scripts/watch-stream.ts`).
2. `create_product` with `closes_at` ~15s in the future, then `deposit` immediately —
   locked in before any post-close data existed.
3. Polled TxLINE's `/scores/updates` + `/scores/stat-validation` every 30s. Took ~9.5
   minutes (19 retries) for a batch to seal with `minTimestamp` genuinely later than
   `closes_at` — this is TxLINE's real ~5-minute batch cadence, not a simulated wait.
4. `settle_leg` — real CPI into TxLINE's actual `validate_stat`, against that
   freshly-sealed batch. Leg resolved `false` (the real stat didn't clear the
   threshold in that window) → `finalize_product` → `final_payout_bps: 0` → `claim`
   paid out 0, correctly.

**Product:** `6UNaWnAMpjHHxzC8KD78wYekjVwNNHKVMnm1rf5TiG9s`
**Writer pool:** `i7u34mcv1e6T7f8Q1bxVsWCvyzbgnsNTKu1f4Ay146B`
**Tx signatures:** create `3jxaXbbiU93B6f9hqnMCYUuvkNppBxYJJ5yvmM9wam4fiZthtBYVYJ2qV5tEQxfXVBsfoyczZvF3Fx4efKwDFC2S`,
deposit `59ChHQ9WQLhWfNbCinoBCH5RTqSTAGgv6m1Rvz5BdigbT1giRpcu4z1iwD5LK7rGbrCtXtY2zMYbgLKwAgzWZJz8`,
settle `qT9VYW1NyLEt5ViGFdxhy4Me7MkSc6GxbVKXi3zfz4X5xYY1d66ZeoDPSD8phZ6DfGEiVfZ4o1aFvk42Kq3V7y8`,
finalize `51QTZAEK5uTd1FNjhvX4nmjeBxGEzFsZ9D3TSxPoCjq2wosP5RA3JifuJGWQLTSgFFhqzSpqfRtqhyZdJeJSDe9w`,
claim `gDtHhnTCKMWsVfauNChetj4V1yG1fQ1r2j7JCZGPLKZpHmXsMEBw2CGCxAJQvFRuyVrwrYPrYbvD8kUZYZ1N4CH`.

The losing outcome is itself part of the proof: nothing was rigged to guarantee a win,
the payout followed whatever the real, freshly-proven data said.

Re-run against any live fixture with:

```bash
ANCHOR_WALLET=~/.config/solana/oracle-keypair.json ./node_modules/.bin/ts-node -P tsconfig.json scripts/live-buyer-flow.ts <fixtureId>
```

### Second run — fixture 18241006 (England vs Argentina, World Cup, kicked off 2026-07-15 19:00 UTC)

Same flow, run again against a different genuinely-live match. This run also surfaced a
real external timing dependency worth documenting: `settle_leg`'s CPI into
`validate_stat` initially failed with `RootNotAvailable` (error 6007) — TxLINE's API had
already sealed a batch with a `minTimestamp` past `closes_at`, but the txoracle program's
on-chain merkle root for that time slot hadn't been posted yet by TxOdds' own oracle
poster. This is a gap between "the data exists in their API" and "the proof root is
live on-chain," not a bug in Strata.

`scripts/resume-settle.ts <fixtureId> <nonce>` was added to handle exactly this: it
resumes an already-created product + already-saved proof (from
`tests/fixtures/live-buyer-flow-proof.json`) and retries just `settle_leg -> finalize ->
claim`, without repeating the deposit or the multi-minute polling wait. Retrying a few
minutes later succeeded once the root had landed.

**Product:** `ugwTAvuwPYvqb51y8onVt5ZdSzmmwCYkUT6YzET3VJo`
**Writer pool:** `i7u34mcv1e6T7f8Q1bxVsWCvyzbgnsNTKu1f4Ay146B`
**Tx signatures:** create `JbVMiKNQqNjGjRQLZ2SzTB9eFqEoMFZC4HXytDgaaDKCyytJ8mQmk869Htn7VjR4RxJWcqyLyEZz4jt72ZM8Mae`,
deposit `4wVEoESaFEJkna1uUfXANsT4CUo5riAauo8wgErJQYa3sPwJngmrPt6gVCycew4mK1FVLSEWcEeeY51nL7dKzpJ4`,
settle (resumed) `424QuC7MoXWWKzNdJczdMAgxKPPZ397ju1F7F6iBDruBBUmTcP2NLCokQL78Er8fBKxLAWqqHfnDL7vXJzgQEWnc`,
finalize `3Ydn9Z5eb8nJoSbz57ssvU5GM3t5CRRvgKRSTFDUiFswPUuFxLG4oxVYgx9LBRvjmwkX8Abupbv1q9JvGtwqGBdY`,
claim `3ognmyNnnFAd6Xmmvn8vfiACPfMVMVh7wgjaWr9i9S6b9a5zWt9g5QpdGgM3wAtmUYka2PYUB6QxVmmfpuyNMutu`.

Leg resolved `false` again (`final_payout_bps: 0`) — another real loss, not a rigged win.

## Devnet RPC transaction-history retention

The public `api.devnet.solana.com` node prunes transaction history fast --
`getSignaturesForAddress`/`getTransaction` for the very first live-buyer-flow
proof above (fixture 18187298) already returned nothing within days, and the
second run's signature was gone within hours (Solana Explorer itself refused
to show it: "Transactions processed before block 476997761 are not available
at this time"). `/verify` already degrades honestly when this happens --
falls back to "Not retained by this RPC" instead of an endless "Loading..."
or fabricated data -- but that's a fallback, not a fix.

The real fix: production's `NEXT_PUBLIC_RPC_URL` now points at a Helius
devnet endpoint instead of the public node, which retains history for far
longer. Confirmed directly: the same transaction the public RPC and Solana
Explorer had both already dropped was still fully readable via
`getTransaction` through Helius. Local dev / `.env.example` still default to
the public endpoint, since retention doesn't matter for quick local testing
-- only the deployed app needs the longer window.
