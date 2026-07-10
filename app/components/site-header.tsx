"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HowItWorksDialog } from "@/components/how-it-works-dialog";
import { StatusBadge } from "@/components/status-badge";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function LiveLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === "/markets" && searchParams.get("filter") === "live";
  return <NavLink href="/markets?filter=live" label="Live" active={active} />;
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-status-true/25 bg-status-true/10 text-lg font-bold text-status-true">
            S
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-foreground">Strata</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Structured sports markets</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink href="/" label="Home" active={pathname === "/"} />
          <NavLink href="/markets" label="Explore" active={pathname === "/markets"} />
          <Suspense fallback={<NavLink href="/markets?filter=live" label="Live" active={false} />}>
            <LiveLink />
          </Suspense>
          <NavLink href="/positions" label="Portfolio" active={pathname.startsWith("/positions")} />
          <HowItWorksDialog
            trigger={
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                How it works
              </button>
            }
          />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/create"
            className="hidden rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
          >
            Create
          </Link>
          <StatusBadge />
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
