"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, Search } from "lucide-react";
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
      className={`inline-flex min-h-10 items-center rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
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

const CATEGORY_LINKS = [
  ["Trending", "/markets"],
  ["Live", "/markets?filter=live"],
  ["Open", "/markets?filter=open"],
  ["Settled", "/markets?filter=settled"],
  ["Football", "/markets?category=football"],
  ["Structured", "/markets?category=structured"],
  ["Exact outcome", "/markets?category=exact"],
] as const;

export function SiteHeader() {
  return (
    <Suspense fallback={<SiteHeaderFallback />}>
      <SiteHeaderInner />
    </Suspense>
  );
}

function SiteHeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/94 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1480px] items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-status-true/20 bg-status-true/10 text-status-true">
            <span className="text-sm font-bold">S</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">strata</span>
        </Link>
      </div>
    </header>
  );
}

function SiteHeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) next.set("q", trimmed);
    router.push(next.toString() ? `/markets?${next.toString()}` : "/markets");
  };

  const currentCategory = searchParams.get("category");
  const currentFilter = searchParams.get("filter");
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/94 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1480px] items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-status-true/20 bg-status-true/10 text-status-true">
            <span className="text-sm font-bold">S</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">strata</span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          <NavLink href="/" label="Home" active={pathname === "/"} />
          <NavLink href="/markets" label="Explore" active={pathname === "/markets"} />
          <Suspense fallback={<NavLink href="/markets?filter=live" label="Live" active={false} />}>
            <LiveLink />
          </Suspense>
          <NavLink href="/positions" label="Portfolio" active={pathname.startsWith("/positions")} />
        </nav>

        <form
          onSubmit={handleSearchSubmit}
          className="hidden min-w-[280px] flex-1 items-center gap-3 rounded-full border border-border/80 bg-card/55 px-4 py-2.5 xl:flex"
        >
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Search markets, teams, players..."
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <HowItWorksDialog
            trigger={
              <button
                type="button"
                className="hidden min-h-10 items-center rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
              >
                How it works
              </button>
            }
          />
          <Link
            href="/create"
            className={`hidden min-h-10 items-center rounded-full border border-border/70 px-3.5 py-2 text-sm font-semibold transition-colors lg:inline-flex ${
              pathname.startsWith("/create") ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create
          </Link>
          <StatusBadge />
          <WalletMultiButton />
          <button
            type="button"
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/75 bg-card/50 text-muted-foreground xl:hidden"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-[1480px] items-center gap-2 overflow-x-auto px-4 py-2 text-sm [&::-webkit-scrollbar]:hidden">
          {CATEGORY_LINKS.map(([label, href], index) => (
            <Link
              key={label}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 transition-colors ${
                (index === 0 && pathname === "/markets" && !currentFilter && !currentCategory) ||
                (label === "Live" && currentFilter === "live") ||
                (label === "Open" && currentFilter === "open") ||
                (label === "Settled" && currentFilter === "settled") ||
                (label === "Football" && currentCategory === "football") ||
                (label === "Structured" && currentCategory === "structured") ||
                (label === "Exact outcome" && currentCategory === "exact")
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
