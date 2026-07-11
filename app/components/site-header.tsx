"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { HeaderSearch } from "@/components/header-search";
import { HowItWorksModal } from "@/components/how-it-works-modal";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const NAV_LINKS = [
  { label: "Markets", href: "/markets" },
  { label: "Live", href: "/markets?filter=live" },
  { label: "Portfolio", href: "/positions" },
  { label: "Create", href: "/create" },
] as const;

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative py-1 text-[15px] font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`absolute inset-x-0 -bottom-1 h-px rounded-full transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))" }}
      />
    </Link>
  );
}

function LiveNavLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === "/markets" && searchParams.get("filter") === "live";
  return <NavLink href="/markets?filter=live" label="Live" active={active} />;
}

export function SiteHeader() {
  return (
    <Suspense fallback={<SiteHeaderFallback />}>
      <SiteHeaderInner />
    </Suspense>
  );
}

function SiteHeaderFallback() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-status-true/25 bg-status-true/10 text-status-true">
            <span className="text-base font-bold">S</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">strata</span>
        </Link>
      </div>
    </header>
  );
}

function SiteHeaderInner() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const scrollToFlow = () => {
    document.getElementById("strata-flow")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1480px] grid-cols-[auto_1fr_auto] items-center gap-6 px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-status-true/25 bg-status-true/10 text-status-true">
            <span className="text-base font-bold">S</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">strata</span>
        </Link>

        <nav className="hidden items-center justify-center gap-9 md:flex">
          {NAV_LINKS.map((link) =>
            link.label === "Live" ? (
              <Suspense key="Live" fallback={<NavLink href="/markets?filter=live" label="Live" active={false} />}>
                <LiveNavLink />
              </Suspense>
            ) : (
              <NavLink
                key={link.label}
                href={link.href}
                label={link.label}
                active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
              />
            )
          )}
        </nav>

        <div className="flex items-center justify-end gap-3">
          <HeaderSearch />
          {isHome ? (
            <button
              type="button"
              onClick={scrollToFlow}
              className="hidden items-center rounded-full border border-status-true/30 px-4 py-2 text-sm font-medium text-status-true transition-colors hover:bg-status-true/10 sm:inline-flex"
            >
              How it works
            </button>
          ) : (
            <HowItWorksModal
              trigger={
                <button
                  type="button"
                  className="hidden items-center rounded-full border border-status-true/30 px-4 py-2 text-sm font-medium text-status-true transition-colors hover:bg-status-true/10 sm:inline-flex"
                >
                  How it works
                </button>
              }
            />
          )}
          <div className="hidden sm:block">
            <WalletMultiButton />
          </div>
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "bg-card/60 text-foreground"
                    : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-3 sm:hidden">
            <WalletMultiButton />
          </div>
        </div>
      )}
    </header>
  );
}
