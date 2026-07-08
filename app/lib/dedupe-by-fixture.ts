interface FixtureEntry {
  data: { fixtureId: bigint; totalStake: bigint };
}

/** Curated grids (Home strip, Watch/Verify pickers) show one card per fixture, picking
 * whichever product has the most stake — /markets stays un-curated and shows everything. */
export function dedupeByFixture<T extends FixtureEntry>(entries: T[]): T[] {
  const byFixture = new Map<string, T>();
  for (const entry of entries) {
    const key = entry.data.fixtureId.toString();
    const existing = byFixture.get(key);
    if (!existing || entry.data.totalStake > existing.data.totalStake) {
      byFixture.set(key, entry);
    }
  }
  return [...byFixture.values()];
}
