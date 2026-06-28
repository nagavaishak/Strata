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

`settle_leg`'s CPI target is set via the on-chain `Config` account, not hardcoded —
call `initialize_config(txoracle_program_id)` once after deploying, pointing at
TxLINE's devnet `txoracle` program: `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`.
Not yet done on this deployment — still pending.
