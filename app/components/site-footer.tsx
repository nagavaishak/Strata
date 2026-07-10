import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Markets", href: "/markets" },
  { label: "Live", href: "/markets?filter=live" },
  { label: "Portfolio", href: "/positions" },
  { label: "Create", href: "/create" },
  { label: "How it works", href: "/about" },
  { label: "Docs", href: "https://github.com/nagavaishak/Strata" },
];

/** Deliberately quiet — the homepage story should end with trust + featured
 * markets, not a heavy footer block. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-4">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
        <span>Strata · devnet</span>
      </div>
    </footer>
  );
}
