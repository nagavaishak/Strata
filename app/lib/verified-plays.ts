/**
 * Product accounts confirmed as real, intentional devnet plays — not routine
 * dev-testing noise left over from repeated script runs. Every address here
 * is documented with its real outcome in DEVNET.md:
 *
 * - 6UNaWnAMpjHHxzC8KD78wYekjVwNNHKVMnm1rf5TiG9s — "Live buyer-deposit flow"
 *   (Brazil vs Norway, fixture 18187298): real deposit-before-data-existed,
 *   settled via real CPI, lost (final_payout_bps: 0).
 * - GGUUiVL1uKVgEuoHiQnVHnwUre59jXrhNu6nuUjo3ojv — "Shared writer pool" proof,
 *   Product A: settled via real settle_leg CPI.
 * - 9DNhGwCBf2EmtM12ugZMdsAvjr3nLAShfqTNLcvhxJ1Q — "Shared writer pool" proof,
 *   Product B: left open at time of writing to prove reserved-vs-owed
 *   accounting across two simultaneous products.
 *
 * /markets only surfaces markets from this list plus anything still open —
 * settled/closed accounts not on this list are routine test-script noise,
 * not a real play, and are filtered out. Extend this list directly as more
 * real runs get documented in DEVNET.md.
 */
const VERIFIED_PLAY_ADDRESSES = new Set<string>([
  "6UNaWnAMpjHHxzC8KD78wYekjVwNNHKVMnm1rf5TiG9s",
  "GGUUiVL1uKVgEuoHiQnVHnwUre59jXrhNu6nuUjo3ojv",
  "9DNhGwCBf2EmtM12ugZMdsAvjr3nLAShfqTNLcvhxJ1Q",
]);

export function isVerifiedPlay(address: string): boolean {
  return VERIFIED_PLAY_ADDRESSES.has(address);
}
