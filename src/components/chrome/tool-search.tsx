"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search, SearchX, ArrowUpRight } from "lucide-react";
import { TOOLS } from "@/features/tools/registry";
import { BUNDLES } from "@/features/tools/bundles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The nav's white pill — opens a quick-jump palette over every tool.
 * ⌘K / Ctrl-K works from anywhere.
 */
export function ToolSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const bundleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUNDLES.filter((b) =>
      !q ||
      `${b.name} ${b.manifesto} bundle shelf`.toLowerCase().includes(q),
    ).map((b) => ({
      slug: b.slug,
      name: `${b.name} bundle`,
      tagline: b.manifesto,
      icon: b.icon,
    }));
  }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tools = q
      ? TOOLS.filter((tool) =>
          `${tool.name} ${tool.tagline} ${tool.slug}`.toLowerCase().includes(q),
        )
      : TOOLS;
    return [...bundleEntries, ...tools];
  }, [query, bundleEntries]);

  const openResults = () => {
    const first = results[0];
    if (!first) return;
    setOpen(false);
    router.push(first.slug);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Meta+K Control+K"
        className="group flex h-9 items-center gap-2 rounded-full bg-white px-3.5 text-[13px] font-semibold tracking-[-0.01em] text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all duration-200 hover:bg-brand hover:text-white active:scale-[0.98]"
      >
        <Search className="size-4 transition-colors group-hover:text-white" strokeWidth={2.2} aria-hidden />
        <span>Search</span>
        <kbd className="hidden rounded-[5px] bg-black/[0.06] px-1.5 py-0.5 font-sans text-[10px] font-medium leading-none text-black/45 transition-colors group-hover:bg-white/20 group-hover:text-white/80 min-[420px]:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setQuery("");
        }}
      >
        <DialogContent className="top-[14%] w-[min(92vw,36rem)] translate-y-0 overflow-hidden rounded-[22px] p-0 sm:p-0">
          <DialogTitle className="sr-only">Search tools</DialogTitle>
          <DialogDescription className="sr-only">
            Find any Toolbox tool by name or description.
          </DialogDescription>

          <div className="flex h-14 items-center gap-2.5 border-b border-line pl-4 pr-12">
            <Search className="size-4 shrink-0 text-ink3" strokeWidth={2} aria-hidden />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  openResults();
                }
              }}
              placeholder={`Search ${TOOLS.length} tools and ${BUNDLES.length} shelves…`}
              aria-label="Search tools"
              className="tool-search-input h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink caret-brand outline-none placeholder:text-ink3 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>

          <div className="max-h-[min(58vh,25rem)] overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <SearchX className="size-5 text-ink3" strokeWidth={1.7} aria-hidden />
                <p className="text-[13px] text-ink2">
                  No tools match <span className="font-semibold text-ink">“{query.trim()}”</span>.
                </p>
              </div>
            ) : (
              <ul>
                {results.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li key={tool.slug}>
                      <Link
                        href={tool.slug}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors hover:bg-sunken"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-sunken text-ink transition-colors duration-200 group-hover:bg-brand group-hover:text-white">
                          <Icon className="size-[17px]" strokeWidth={1.8} aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13.5px] font-medium leading-tight text-ink">
                            {tool.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-ink2">
                            {tool.tagline}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="ml-auto size-3.5 shrink-0 text-ink3 opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink3">
            <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
            <span>↵ open · esc close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
