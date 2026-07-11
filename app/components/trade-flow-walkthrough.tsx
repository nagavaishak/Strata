"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FLOW_STEPS } from "@/lib/flow-steps-data";
import { TradeFlowStepCard } from "@/components/trade-flow-step-card";
import { TradeFlowPagination } from "@/components/trade-flow-pagination";

/**
 * Core guided-walkthrough UI: header, animated step stage, and pagination.
 * Shared by the homepage section (`TradeFlowSection`) and the standalone
 * modal (`HowItWorksModal`) so both surfaces teach the exact same 5 steps
 * with the exact same interaction. Manual navigation only — no auto-advance.
 */
export function TradeFlowWalkthrough() {
  const [current, setCurrent] = useState(0);
  const step = FLOW_STEPS[current];

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setCurrent((i) => (i + 1) % FLOW_STEPS.length);
      if (event.key === "ArrowLeft") setCurrent((i) => (i - 1 + FLOW_STEPS.length) % FLOW_STEPS.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div>
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-status-true">The Strata Flow</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            {step.id}/{FLOW_STEPS.length}
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{step.title}</h2>
        </div>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{step.description}</p>
      </div>

      {/*
       * The step stage intentionally does NOT use `AnimatePresence`/`mode="wait"`.
       * With `mode="wait"`, mounting the new step's card is gated on the outgoing
       * card's `exit` animation firing its completion callback -- and Framer's
       * exit animation is driven by `requestAnimationFrame`, which Chromium pauses
       * for backgrounded/hidden tabs (`document.hidden === true`). If a user clicks
       * "next" and then immediately alt-tabs (or the OS throttles the tab) before
       * the ~320ms transition finishes, the exit callback never fires, the new card
       * never mounts, and the stage stays frozen on the OLD step's content while the
       * header/counter above already show the NEW step -- a permanent content/header
       * desync until (and only if) the tab is refocused.
       *
       * Instead we re-key a single `motion.div` on `step.id`. React swaps to the new
       * step's card synchronously on click, so the stage can never show stale content
       * and can never desync from the header -- both read the same `step`. Framer still
       * runs the intended fade + slight upward slide as an enter animation on the fresh
       * mount; its resting state (opacity 1, y 0) does not depend on any prior
       * transition completing, so throttled animation frames can never strand the UI.
       */}
      <div className="mt-8 overflow-hidden">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          <TradeFlowStepCard step={step} />
        </motion.div>
      </div>

      <div className="mt-4">
        <TradeFlowPagination total={FLOW_STEPS.length} current={current} onChange={setCurrent} />
      </div>
    </div>
  );
}
