const LINKS = [
  {
    label: "Technical overview",
    href: "https://github.com/nagavaishak/Strata/blob/main/TECHNICAL.md",
    body: "Core idea, technical highlights, and the specific TxLINE endpoints used.",
  },
  {
    label: "TxLINE feedback",
    href: "https://github.com/nagavaishak/Strata/blob/main/FEEDBACK.md",
    body: "Our real experience building against the TxLINE API — what worked, where we hit friction.",
  },
  {
    label: "Devnet deployment log",
    href: "https://github.com/nagavaishak/Strata/blob/main/DEVNET.md",
    body: "Every proof run, with real transaction signatures anyone can independently verify.",
  },
  {
    label: "GitHub repo",
    href: "https://github.com/nagavaishak/Strata",
    body: "Full source — on-chain program, frontend, and every devnet proof script.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-24">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">05 About</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Strata was built for Superteam Ireland&rsquo;s World Cup Hackathon —
          Track 1: Prediction Markets and Settlement. It&rsquo;s a structured
          settlement engine: multi-leg tiered payouts and exact-outcome
          products, both settled by a permissionless on-chain CPI into
          TxLINE&rsquo;s own proof verifier, proven on real devnet with real
          SOL — including a genuinely live buyer-deposit flow, not a
          historical replay.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30"
          >
            <span className="text-sm font-medium text-foreground group-hover:underline">
              {link.label} →
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">{link.body}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
