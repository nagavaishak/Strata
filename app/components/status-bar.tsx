"use client";

import { RPC_URL } from "@/lib/constants";

/**
 * Persistent bottom bar — "this is a running system, not a mockup." Extended per
 * screen with real live state (leg statuses, fixture id) via the children slot.
 */
export function StatusBar({ children }: { children?: React.ReactNode }) {
  const network = RPC_URL.includes("devnet") ? "devnet" : RPC_URL.includes("mainnet") ? "mainnet" : "custom";

  return (
    <div className="mt-auto flex items-center justify-between border-t border-border bg-card/50 px-4 py-2 text-xs font-mono text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>strata /engine</span>
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
