"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { HeroBackdropBoard } from "@/components/hero-backdrop-board";
import type { GeoProductListEntry, ProductListEntry } from "@/lib/hooks/useAllProducts";

export function HeroLanding({
  tiered,
  geo,
}: {
  tiered: ProductListEntry[];
  geo: GeoProductListEntry[];
}) {
  const scrollToFlow = () => {
    document.getElementById("strata-flow")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex min-h-[86vh] items-center justify-center overflow-hidden rounded-[28px] border border-border/70">
      <HeroBackdropBoard tiered={tiered} geo={geo} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center"
      >
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
          Trade football outcomes.
          <br />
          <span className="text-gradient">Not just the winner.</span>
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-zinc-300 sm:text-lg">
          Pick a match, buy a scenario, track the conditions live, and collect payout when the
          game settles.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/markets"
            className="btn-gradient inline-flex min-h-12 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Browse Markets
            <ArrowRight className="size-4" />
          </Link>
          <button
            type="button"
            onClick={scrollToFlow}
            className="inline-flex min-h-12 items-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/10"
          >
            How it works
          </button>
        </motion.div>
      </motion.div>

      <button
        type="button"
        onClick={scrollToFlow}
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
      >
        Scroll to see how it works
        <ChevronDown className="size-4 animate-bounce" />
      </button>
    </section>
  );
}
