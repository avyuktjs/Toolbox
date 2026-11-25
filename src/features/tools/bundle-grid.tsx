"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, SearchX } from "lucide-react";
import { Seek } from "@/components/motion/seek";
import { TOOLS, type Tool } from "./registry";

/**
 * The bundle bench — same card language as the home grid, with its own
 * local filter (bundle pages aren't wired into the shared home filter).
 */
export function BundleToolsGrid({ slugs, label }: { slugs: string[]; label: string }) {
  const [query, setQuery] = useState("");
  const tools = useMemo(
    () =>
      slugs
        .map((slug) => TOOLS.find((tool) => tool.slug === slug))
        .filter((tool): tool is Tool => tool !== undefined),
    [slugs],
  );
  const normalized = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      normalized
        ? tools.filter((t) => `${t.name} ${t.tagline} ${t.slug}`.toLowerCase().includes(normalized))
        : tools,
    [tools, normalized],
  );

  return (
    <div>
      <div className="flex h-14 items-center justify-between">
        <p className="flex items-center gap-2 text-[12px] font-medium text-ink2">
          <span aria-hidden className="inline-block size-2 rounded-full bg-amber-500" />
          {normalized ? (
            `${visible.length} of ${tools.length} tools`
          ) : (
            <>{tools.length} tools — {label}</>
          )}
        </p>
        <Seek
          value={query}
          onChange={setQuery}
          placeholder="Filter tools…"
          ariaLabel="Filter tools"
          width={232}
        />
      </div>

      {visible.length === 0 ? (
        <div className="mt-2 flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-line2 py-16 text-center">
          <SearchX className="size-6 text-ink3" strokeWidth={1.6} />
          <p className="text-[14px] text-ink2">
            No tools match <span className="font-semibold text-ink">“{query.trim()}”</span>.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-[13px] font-medium text-accent-ink hover:underline underline-offset-4"
          >
            Clear the filter
          </button>
        </div>
      ) : (
        <ul className="mt-2 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 lg:grid-cols-4">
          {visible.map((tool) => {
            const Icon = tool.icon;
            return (
              <li key={tool.slug}>
                <Link
                  href={tool.slug}
                  className="group flex h-full flex-col rounded-[18px] border border-line bg-panel p-5 transition-[background-color,border-color] duration-300 ease-out hover:border-brand hover:bg-brand"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-[13px] bg-sunken text-ink transition-colors duration-200 group-hover:bg-white group-hover:text-brand">
                      <Icon className="size-5" strokeWidth={1.7} />
                    </span>
                    <ArrowRight className="size-4 text-ink3 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                  <h2 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink transition-colors duration-200 group-hover:text-white">{tool.name}</h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink2 transition-colors duration-200 group-hover:text-white/80">{tool.tagline}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
