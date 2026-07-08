"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { StatusBadge } from "./status-badge";

// wallet-adapter-react-ui's button reads browser wallet state, must not SSR.
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const NAV = [
  { index: "00", label: "Build", href: "/build" },
  { index: "01", label: "Watch", href: "/watch" },
  { index: "02", label: "Verify", href: "/verify" },
];

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
          strata
        </Link>
        <nav className="hidden items-center gap-4 text-xs font-mono text-muted-foreground sm:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              <span className="text-border">{item.index}</span> {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge />
        <WalletMultiButton />
      </div>
    </header>
  );
}
