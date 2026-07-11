"use client";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TradeFlowWalkthrough } from "@/components/trade-flow-walkthrough";

/**
 * Premium modal version of the same guided 5-step walkthrough used on the
 * homepage. Used on non-home pages, where there's no "scroll to the flow
 * section" to fall back on — same content, same stepper, same transitions.
 */
export function HowItWorksModal({ trigger }: { trigger?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-border/60 bg-background/95 p-8 backdrop-blur-xl sm:max-w-2xl">
        <DialogTitle className="sr-only">How Strata works</DialogTitle>
        <TradeFlowWalkthrough />
      </DialogContent>
    </Dialog>
  );
}
