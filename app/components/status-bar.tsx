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
    <div className="mt-auto border-t border-border/80 bg-background/92 px-4 py-2 text-xs text-muted-foreground backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-3">
          <span>strata / live market rail</span>
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
    </div>
  );
}
