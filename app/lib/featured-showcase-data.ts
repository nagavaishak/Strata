/**
 * Curated showcase content for the /markets featured hero slot — isolated from
 * every real-data path the same way flow-steps-data.ts and ticker-items.ts's
 * curated pool are. Real fixtures never carry team names or leagues anywhere
 * upstream (TxLINE only exposes a raw fixtureId), so this is the one place on
 * /markets allowed to show a match name — clearly labeled FEATURED, and its CTA
 * scrolls to the real grid below rather than linking into a specific (fake)
 * product page. Never import this into anything that renders real market data.
 */

export interface FeaturedScenario {
  label: string;
  odds: string;
  highlighted?: boolean;
}

export interface FeaturedShowcase {
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeInitials: string;
  awayInitials: string;
  statusLabel: string;
  minute?: string;
  title: string;
  payoutHighlight: string;
  scenarios: FeaturedScenario[];
}

export const FEATURED_SHOWCASE: FeaturedShowcase = {
  league: "Champions League",
  homeTeam: "Man City",
  awayTeam: "Real Madrid",
  homeInitials: "MC",
  awayInitials: "RM",
  statusLabel: "Live",
  minute: "63'",
  title: "Man City vs Real Madrid",
  payoutHighlight: "3.20x top payout",
  scenarios: [
    { label: "Man City to win", odds: "1.85x" },
    { label: "Over 2.5 goals", odds: "2.10x", highlighted: true },
    { label: "Both teams to score", odds: "1.65x" },
    { label: "Man City win + Over 2.5 goals", odds: "3.20x" },
  ],
};
