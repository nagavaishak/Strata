"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FLOW_STEPS } from "@/lib/flow-steps-data";
import { TradeFlowStepCard } from "@/components/trade-flow-step-card";
import { TradeFlowPagination } from "@/components/trade-flow-pagination";

/** Manual navigation only — no auto-advance. The point of this module is the
 * user driving the story themselves, one deliberate click at a time. */
export function TradeFlowSection() {
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
    <section id="strata-flow" className="scroll-mt-20">
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

      <div className="mt-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <TradeFlowStepCard step={step} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4">
        <TradeFlowPagination total={FLOW_STEPS.length} current={current} onChange={setCurrent} />
      </div>
    </section>
  );
}
