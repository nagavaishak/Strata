import { MARKET_STATUS_COLOR, MARKET_STATUS_LABEL, type MarketStatus } from "@/lib/market-status";

type BadgeVariant = MarketStatus | "featured" | "high-payout";

const EXTRA_VARIANTS: Record<"featured" | "high-payout", { label: string; className: string }> = {
  featured: { label: "Featured", className: "text-status-true" },
  "high-payout": { label: "High payout", className: "text-status-true" },
};

const DOT_COLOR: Record<BadgeVariant, string> = {
  open: "bg-muted-foreground",
  "closing-soon": "bg-status-pending",
  live: "bg-status-true",
  settling: "bg-status-pending",
  settled: "bg-foreground",
  featured: "bg-status-true",
  "high-payout": "bg-status-true",
};

export function MarketBadge({ variant, className = "" }: { variant: BadgeVariant; className?: string }) {
  const { label, colorClass } =
    variant === "featured" || variant === "high-payout"
      ? { label: EXTRA_VARIANTS[variant].label, colorClass: EXTRA_VARIANTS[variant].className }
      : { label: MARKET_STATUS_LABEL[variant], colorClass: MARKET_STATUS_COLOR[variant] };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${colorClass} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${DOT_COLOR[variant]} ${variant === "live" || variant === "closing-soon" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
