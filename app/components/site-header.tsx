"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusBadge } from "./status-badge";

// wallet-adapter-react-ui's button reads browser wallet state, must not SSR.
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const NAV = [
  { index: "00", label: "Home", href: "/", match: (p: string) => p === "/" },
  { index: "01", label: "Why", href: "/#why", match: () => false },
  { index: "02", label: "Build", href: "/build", match: (p: string) => p.startsWith("/build") },
  { index: "03", label: "Watch", href: "/watch", match: (p: string) => p.startsWith("/watch") },
  { index: "04", label: "Verify", href: "/verify", match: (p: string) => p.startsWith("/verify") },
  { index: "05", label: "About", href: "/about", match: (p: string) => p.startsWith("/about") },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
          strata
        </Link>
        <nav className="hidden items-center gap-1 text-xs font-mono text-muted-foreground sm:flex">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-1.5 overflow-hidden rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground ${
                  active ? "text-foreground" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="bg-hero-glow pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-60"
                  style={active ? { opacity: 0.5 } : undefined}
                />
                <span className="text-border">{item.index}</span>
                <span>{item.label}</span>
                <span
                  className={`absolute inset-x-2.5 -bottom-px h-[2px] rounded-full transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))" }}
                />
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge />
        <WalletMultiButton />
      </div>
    </header>
  );
}
