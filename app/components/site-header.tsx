"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { StatusBadge } from "./status-badge";
import { HowItWorksDialog } from "./how-it-works-dialog";

// wallet-adapter-react-ui's button reads browser wallet state, must not SSR.
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const NAV_ITEM_CLASS =
  "group relative flex items-center overflow-hidden rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors hover:text-foreground";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`${NAV_ITEM_CLASS} ${active ? "text-foreground" : "text-muted-foreground"}`}
    >
      <span
        aria-hidden
        className="bg-hero-glow pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-60"
        style={active ? { opacity: 0.5 } : undefined}
      />
      <span>{label}</span>
      <span
        className={`absolute inset-x-2.5 -bottom-px h-[2px] rounded-full transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))" }}
      />
    </Link>
  );
}

/** Isolated in its own Suspense boundary — useSearchParams() requires one for
 * statically-rendered pages, and we don't want that constraint leaking into
 * every page that renders the global SiteHeader. */
function LiveNavLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === "/markets" && searchParams.get("filter") === "live";
  return <NavLink href="/markets?filter=live" label="Live" active={active} />;
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Strata
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/" label="Home" active={pathname === "/"} />
          <NavLink href="/markets" label="Explore" active={pathname === "/markets"} />
          <Suspense fallback={<NavLink href="/markets?filter=live" label="Live" active={false} />}>
            <LiveNavLink />
          </Suspense>
          <NavLink href="/positions" label="Portfolio" active={pathname.startsWith("/positions")} />
          <HowItWorksDialog
            trigger={
              <button type="button" className={`${NAV_ITEM_CLASS} text-muted-foreground`}>
                How It Works
              </button>
            }
          />
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
          <Link href="/create" className="hover:text-foreground">
            Create Market
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
        </div>
        <StatusBadge />
        <WalletMultiButton />
      </div>
    </header>
  );
}
