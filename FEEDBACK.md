# Feedback — Our Experience With the TxLINE API

## What we liked most

**The Merkle proof design is genuinely well thought out.** The three-stage
structure (stat → event stat root → fixture sub-tree → daily root) maps
cleanly onto an on-chain CPI verifier — we never had to fight the proof shape
to make `validate_stat` work from a Solana program, it just matched our
`ProofNode`/`ScoreStat` types field-for-field once we got the byte layout right.

**`validate_stat_v2` is a real, useful primitive, not just a version bump.**
The geometric distance predicate (predict a vector of stat values, check if
the real outcome lands within tolerance) enables a genuinely new product type
— exact-outcome markets — that the original `TraderPredicate` (single
threshold + comparison) couldn't express at all. Shipping it mid-hackathon,
with a working example, was a meaningful capability upgrade we were able to
build on the same week it landed.

**Responsiveness in Discord/Telegram was excellent.** Real questions got real,
specific answers quickly, including a direct exchange about an
`InvalidMainTreeProof` edge case that helped us design the anti-sniping check
correctly. The announcement about the mainnet parity update
(`game_finalised` → `statusId`/`period` = 100, backward-compatible proof
format changes) was clear and gave concrete before/after detail.

## Where we hit friction

**Field naming is inconsistent across endpoints.** `/api/scores/updates/...`
returns PascalCase fields (`FixtureId`, `Seq`), while
`/api/scores/stat-validation`'s response body uses camelCase
(`fixtureId`, `updateStats`). We lost real debugging time to this — a script
silently found zero matches for a fixture that was demonstrably live and
producing data, because it was checking `fixtureId` on a payload that only had
`FixtureId`. A single documented casing convention (or a note flagging where
it differs) would have caught this immediately instead of by trial and error.

**Live discovery vs. historical replay wasn't obvious from the docs alone.**
We initially used `/api/scores/updates/{epochDay}/{hour}/{interval}` and
`/api/scores/historical/{fixtureId}` assuming they'd surface live data, and
only learned via Telegram support that the SSE stream
(`/api/scores/stream`) is the correct way to detect a genuinely live fixture.
A short line in the quickstart distinguishing "live discovery" from
"replay/historical browsing" endpoints would save every team this same
round-trip.

**Batch-sealing latency is wider in practice than the "5-minute batches"
framing suggests.** In our live end-to-end run, it took ~9.5 minutes from
`closes_at` to a batch sealing with a `min_timestamp` genuinely past that
point — not a single 5-minute cycle. This is a real constraint on any
anti-sniping design (ours: reject any batch whose `min_timestamp` predates
`closes_at`), and teams building similar defenses would benefit from an
explicit statement of the *worst-case* observed sealing lag, not just the
nominal batch interval.

**V2 documentation lived on a GitHub branch, not the main docs site.**
`examples/devnet/scripts/subscription_scores_v2a.ts` on
`txodds/tx-on-chain@nojira-re-adding-examples` was the only place we found a
worked example of `validate_stat_v2`'s `NDimensionalStrategy` payload shape
(discrete predicates vs. the geometric distance predicate). It's genuinely
good, complete example code — it just wasn't linked from
`txline.txodds.com/documentation`, so we found it via a Discord announcement
rather than by searching the docs.

## Summary

The core primitives (proof structure, CPI shape, the new V2 strategy system)
are solid and well-designed — our friction was almost entirely about
*discoverability* (which endpoint does what, where the newest examples live)
rather than the API's actual design. A single "field casing" note and a
clearer live-vs-replay distinction in the quickstart would remove most of the
trial-and-error we went through.
