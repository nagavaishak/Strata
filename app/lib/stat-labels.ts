/**
 * Human-readable labels for TxLINE stat keys — verified only. Every key here was
 * confirmed against real proof data in this repo's own devnet scripts (see
 * scripts/real-geo-settlement.ts's comment: statsToProve[0] key=1 "home goals",
 * key=2 "away goals", confirmed 3-0 against a real settled fixture). Guessing a
 * label and being wrong is worse than showing the raw key — unverified keys fall
 * back to "Stat {key}" rather than a fabricated name.
 *
 * Extend this file directly if a fuller TxLINE stat-key catalog becomes available —
 * no component needs to change, they all read through statLabel() below.
 */
const VERIFIED_STAT_LABELS: Record<number, string> = {
  1: "Home goals",
  2: "Away goals",
};

export function statLabel(key: number): string {
  return VERIFIED_STAT_LABELS[key] ?? `Stat ${key}`;
}

export function isVerifiedStat(key: number): boolean {
  return key in VERIFIED_STAT_LABELS;
}
