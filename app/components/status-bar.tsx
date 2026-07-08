"use client";

import { RPC_URL } from "@/lib/constants";
import { useAllProducts, useAllGeoProducts } from "@/lib/hooks/useAllProducts";
import { RollingNumber } from "@/components/rolling-number";
import { formatSol } from "@/lib/format";

/**
 * Persistent bottom bar — "this is a running system, not a mockup." Extended per
 * screen with real live state (leg statuses, fixture id) via the children slot.
 */
export function StatusBar({ children }: { children?: React.ReactNode }) {
  const network = RPC_URL.includes("devnet") ? "devnet" : RPC_URL.includes("mainnet") ? "mainnet" : "custom";
  const { data: tiered } = useAllProducts();
  const { data: geo } = useAllGeoProducts();

  const openCount =
    (tiered?.filter((e) => e.data.status === "open").length ?? 0) +
    (geo?.filter((e) => e.data.status === "open").length ?? 0);
  const totalStaked =
    (tiered?.reduce((sum, e) => sum + e.data.totalStake, 0n) ?? 0n) +
    (geo?.reduce((sum, e) => sum + e.data.totalStake, 0n) ?? 0n);

  return (
    <div className="mt-auto flex items-center justify-between border-t border-border bg-card/50 px-4 py-2 text-xs font-mono text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>strata /engine</span>
        {(tiered || geo) && (
          <span className="hidden sm:inline">
            <RollingNumber value={openCount} /> open ·{" "}
            <RollingNumber value={Number(formatSol(totalStaked))} format={(n) => n.toFixed(2)} /> SOL staked
          </span>
        )}
        {children}
      </div>
      <div className="flex items-center gap-3">
        <span>
          net <span className="text-foreground">solana · {network}</span>
        </span>
        <span className="cursor-blink text-foreground">▌</span>
      </div>
    </div>
  );
}
