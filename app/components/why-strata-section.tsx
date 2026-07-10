const CARDS = [
  {
    title: "Structured payouts",
    body: "Buy outcomes with visible payout ladders instead of flat generic positions.",
  },
  {
    title: "Match-first design",
    body: "Browse by fixture, scenario, and match logic rather than protocol primitives.",
  },
  {
    title: "Verified settlement",
    body: "See exactly how your market resolved and how the payout was calculated.",
  },
];

export function WhyStrataSection() {
  return (
    <section>
      <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">
        Why Strata feels different
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {CARDS.map((card) => (
          <div key={card.title} className="market-shell rounded-2xl border border-border/70 p-5">
            <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
