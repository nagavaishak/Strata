/**
 * Real match identities for TxLINE fixtureIds — verified only, same discipline
 * as stat-labels.ts's statLabel(). TxLINE itself exposes no team/league/kickoff
 * metadata anywhere in its API; every entry here was confirmed by this repo's
 * own devnet testing, not guessed:
 *
 * - 18187298: DEVNET.md's "Live buyer-deposit flow" run — Brazil vs Norway,
 *   World Cup Round of 16, kicked off 2026-07-05 20:00 UTC. Real product
 *   6UNaWnAMpjHHxzC8KD78wYekjVwNNHKVMnm1rf5TiG9s, real create/deposit/settle/
 *   finalize/claim tx signatures all logged in that file.
 *
 * An unverified fixtureId honestly falls back to "Fixture {id}" rather than a
 * guessed team name. Extend this file directly as more real matches get
 * confirmed against devnet runs — no component needs to change, they all read
 * through getFixturePresentation() in market-presentation.ts.
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
    competition: "World Cup — Round of 16",
  },
};

export function getVerifiedFixture(fixtureId: bigint | number | string): VerifiedFixture | null {
  return VERIFIED_FIXTURES[fixtureId.toString()] ?? null;
}
