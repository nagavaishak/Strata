/**
 * Real match identities for TxLINE fixtureIds. TxLINE's live API exposes no
 * team/league/kickoff metadata to our app today (only fixtureId + stat
 * values) — but TxLINE's own public docs at
 * https://txline.txodds.com/documentation/scores/schedule publish the full
 * fixtureId → team-name table for every World Cup 2026 fixture, so entries
 * confirmed against that page are real, not guessed:
 *
 * - 18187298: Brazil vs Norway, World Cup 8th Finals, kicked off
 *   2026-07-05 20:00 UTC. Also documented in DEVNET.md's "Live buyer-deposit
 *   flow" run — real product 6UNaWnAMpjHHxzC8KD78wYekjVwNNHKVMnm1rf5TiG9s,
 *   real create/deposit/settle/finalize/claim tx signatures.
 * - 18175981: France vs Sweden, World Cup Round of 32, kicked off
 *   2026-06-30 21:00 UTC. Also the fixture proven in
 *   scripts/real-geo-settlement.ts (home=3, away=0 at the proven snapshot —
 *   matches the schedule page's final score for this fixture).
 *
 * An unverified fixtureId honestly falls back to "Fixture {id}" rather than a
 * guessed team name. Extend this file directly as more fixtures are confirmed
 * against that schedule page (or once a live fixtures-metadata API call is
 * wired up) — no component needs to change, they all read through
 * getFixturePresentation() in market-presentation.ts.
 */
export interface VerifiedFixture {
  homeTeam: string;
  awayTeam: string;
  competition: string;
}

const VERIFIED_FIXTURES: Record<string, VerifiedFixture> = {
  "18187298": {
    homeTeam: "Brazil",
    awayTeam: "Norway",
    competition: "World Cup — 8th Finals",
  },
  "18175981": {
    homeTeam: "France",
    awayTeam: "Sweden",
    competition: "World Cup — Round of 32",
  },
};

export function getVerifiedFixture(fixtureId: bigint | number | string): VerifiedFixture | null {
  return VERIFIED_FIXTURES[fixtureId.toString()] ?? null;
}
