"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

const EXPANDED_WIDTH = 300;

/**
 * Header-native search control. At rest it's just the icon, taking up a fixed
 * 36px footprint in the header row like any other nav action. Clicking it
 * expands a pill-shaped field as an absolutely-positioned overlay anchored to
 * that same spot — it grows leftward over the page, not into the header's
 * flex row, so it never pushes or reflows the nav links / wallet button next
 * to it (mentioned.market does the same: search never disturbs the rest of
 * the nav).
 */
export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/markets?q=${encodeURIComponent(trimmed)}` : "/markets");
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <button
        type="button"
        aria-label="Search markets"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors ${
          open ? "opacity-0" : "hover:bg-card/60 hover:text-foreground"
        }`}
      >
        <Search className="size-4" />
      </button>

      {open && (
        <motion.div
          initial={{ width: 36 }}
          animate={{ width: EXPANDED_WIDTH }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="header-search-surface absolute right-0 top-0 z-50 flex h-9 items-center overflow-hidden rounded-full border backdrop-blur-xl"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-foreground">
            <Search className="size-4" />
          </span>
          <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center pr-4">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search matches, teams, leagues, players..."
              className="w-full min-w-0 bg-transparent text-[13px] font-light tracking-wide text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </form>
        </motion.div>
      )}
    </div>
  );
}
