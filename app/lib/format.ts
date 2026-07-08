/**
 * One shared formatting module — replaces the ~6 copy-pasted
 * (Number(x)/1e9).toFixed(4) call sites across the app with consistent precision.
 * Every value that can change over time should render with tabular-nums (apply the
 * `.tabular-nums` Tailwind utility at the call site) so digits don't jitter width
 * when a live number updates.
 */

const LAMPORTS_PER_SOL = 1_000_000_000;

export function formatSol(lamports: bigint | number, decimals = 4): string {
  const n = typeof lamports === "bigint" ? Number(lamports) : lamports;
  return (n / LAMPORTS_PER_SOL).toFixed(decimals);
}

export function bpsToMultiplier(bps: number, decimals = 2): string {
  return `${(bps / 10_000).toFixed(decimals)}x`;
}

export function formatPercent(fraction: number, decimals = 0): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

export function capacityFillFraction(totalStake: bigint, maxCapacity: bigint): number {
  if (maxCapacity === 0n) return 0;
  const fraction = Number(totalStake) / Number(maxCapacity);
  return Math.min(1, Math.max(0, fraction));
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return "closed";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
