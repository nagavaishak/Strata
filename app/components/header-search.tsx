"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

const COLLAPSED_WIDTH = 36;
const EXPANDED_WIDTH_DESKTOP = 300;
const MIN_EXPANDED_WIDTH = 140;
const HEADER_SIDE_PADDING = 24;

/**
 * Header-native search control. At rest it is just the icon; clicking it
 * expands a pill-shaped field in place (the navbar makes room for it) —
 * typing happens right there, and only Enter/submit navigates away.
 *
 * The expanded width is measured live from the DOM (space between this
 * control and the header's right edge, minus whatever sibling controls are
 * currently visible) rather than assumed from a breakpoint, so it can never
 * overflow the header regardless of viewport size or which sibling buttons
 * happen to be visible at that width.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedWidth, setExpandedWidth] = useState(EXPANDED_WIDTH_DESKTOP);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const measureMaxWidth = () => {
    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return EXPANDED_WIDTH_DESKTOP;

    const viewportRight = document.documentElement.clientWidth - HEADER_SIDE_PADDING;
    const containerLeft = container.getBoundingClientRect().left;

    const visibleSiblings = Array.from(parent.children).filter(
      (el): el is HTMLElement =>
        el !== container && el instanceof HTMLElement && getComputedStyle(el).display !== "none"
    );
    const siblingsWidth = visibleSiblings.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);
    const gapPx = parseFloat(getComputedStyle(parent).columnGap || "12") || 12;
    const reserved = siblingsWidth + gapPx * visibleSiblings.length;

    const available = viewportRight - containerLeft - reserved;
    return Math.max(MIN_EXPANDED_WIDTH, Math.min(EXPANDED_WIDTH_DESKTOP, Math.floor(available)));
  };

  const openSearch = () => {
    setExpandedWidth(measureMaxWidth());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleResize = () => setExpandedWidth(measureMaxWidth());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    <motion.div
      ref={containerRef}
      initial={false}
      animate={{ width: open ? expandedWidth : COLLAPSED_WIDTH }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: COLLAPSED_WIDTH }}
      className={`relative flex h-9 shrink-0 items-center overflow-hidden rounded-full border transition-[background-color,border-color,box-shadow] duration-200 ${
        open ? "header-search-surface backdrop-blur-xl" : "border-transparent bg-transparent"
      }`}
    >
      <button
        type="button"
        aria-label="Search markets"
        aria-expanded={open}
        onClick={openSearch}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors ${
          open ? "text-foreground" : "hover:bg-card/60 hover:text-foreground"
        }`}
      >
        <Search className="size-4" />
      </button>

      <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center pr-4">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search matches, teams, leagues, players..."
          tabIndex={open ? 0 : -1}
          className="w-full min-w-0 bg-transparent text-[13px] font-light tracking-wide text-foreground outline-none placeholder:text-muted-foreground/70"
        />
      </form>
    </motion.div>
  );
}
