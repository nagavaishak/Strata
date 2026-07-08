"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STEPS = [
  {
    index: "01",
    title: "A writer funds a pool",
    body: "Collateral goes into one shared pool per writer, not a separate vault per product — it backs every product they create at once.",
  },
  {
    index: "02",
    title: "The writer creates a product",
    body: "Up to 5 stat conditions with a tiered payout table, or one exact-outcome prediction. The pool reserves the worst-case payout immediately.",
  },
  {
    index: "03",
    title: "A buyer deposits",
    body: "Stake goes into the same shared vault. Deposits close at a fixed time — before anyone can know the outcome.",
  },
  {
    index: "04",
    title: "TxLINE seals a batch",
    body: "Real match data gets sealed into a Merkle-proven batch on TxLINE's own chain, published on a real cadence — not something either side controls.",
  },
  {
    index: "05",
    title: "Anyone settles, anyone can verify",
    body: "settle_leg is permissionless: it CPIs into TxLINE's validate_stat, checks the real proof, and only accepts batches that postdate the close time. No feeder, no trust — the payout is recomputable by anyone from on-chain data alone.",
  },
];

export function HowItWorksDialog({ trigger }: { trigger?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            How it works
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How Strata settles a product</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 pt-2">
          {STEPS.map((step) => (
            <div key={step.index} className="flex gap-4">
              <span className="font-mono text-xs text-border">{step.index}</span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
