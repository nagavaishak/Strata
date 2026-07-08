"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { HowItWorksDialog } from "./how-it-works-dialog";

// wallet-adapter-react-ui's button reads browser wallet state, must not SSR.
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const NAV_ITEM_CLASS =
  "group relative flex min-h-10 items-center overflow-hidden rounded-full px-3.5 py-2 text-sm font-semibold tracking-tight transition-colors hover:text-foreground";

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
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="text-3xl leading-none text-status-true">S</span>
            <span className="text-xl font-bold text-status-true">Strata</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink href="/markets" label="Markets" active={pathname === "/markets"} />
            <NavLink href="/" label="Home" active={pathname === "/"} />
            <Suspense fallback={<NavLink href="/markets?filter=live" label="Live" active={false} />}>
              <LiveNavLink />
            </Suspense>
            <NavLink href="/positions" label="Portfolio" active={pathname.startsWith("/positions")} />
            <NavLink href="/about" label="Research" active={pathname.startsWith("/about")} />
            <HowItWorksDialog
              trigger={
                <button type="button" className={`${NAV_ITEM_CLASS} text-muted-foreground`}>
                  How it works
                </button>
              }
            />
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden max-w-[460px] flex-1 items-center gap-3 rounded-full border border-border/80 bg-card/80 px-4 py-3 xl:flex">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              aria-label="Search markets"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search fixture, market type, or status"
            />
          </div>
          <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
            <Link href="/create" className="rounded-full px-2 py-1 hover:text-foreground">
              Create Market
            </Link>
          </div>
          <StatusBadge />
          <WalletMultiButton />
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 overflow-x-auto px-4 py-2 text-sm [&::-webkit-scrollbar]:hidden">
          {["Trending", "Sports", "Live Now", "World Cup", "Structured", "Exact Outcome", "Props"].map((tab) => (
            <span
              key={tab}
              className={`shrink-0 rounded-full px-3 py-1.5 ${
                tab === "Trending"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
