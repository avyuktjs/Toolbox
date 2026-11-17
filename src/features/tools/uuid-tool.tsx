"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { Segmented } from "@/components/ui/segmented";

export function UuidTool() {
  const [count, setCount] = useState<"1" | "5" | "10">("5");
  const [ids, setIds] = useState<string[]>([]);

  const generate = useCallback((n: number) => {
    setIds(Array.from({ length: n }, () => crypto.randomUUID()));
  }, []);

  // deferred — a synchronous setState inside an effect body is a hydration smell
  useEffect(() => {
    const t = window.setTimeout(() => generate(5), 0);
    return () => window.clearTimeout(t);
  }, [generate]);


  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <Segmented
          ariaLabel="How many"
          size="sm"
          value={count}
          onChange={(v) => {
            setCount(v);
            generate(Number(v));
          }}
          options={[
            { value: "1", label: "One" },
            { value: "5", label: "Five" },
            { value: "10", label: "Ten" },
          ]}
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => generate(Number(count))}
            className="flex h-8 items-center gap-1.5 rounded-full border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(29,67,242,0.55)] px-3 text-[12px] font-semibold"
          >
            <RefreshCw className="size-3.5" /> New batch
          </button>
          <AiCopyButton
            variant="primary"
            size="sm"
            label="Copy all"
            value={() => ids.join("\n")}
          />
          <button
            type="button"
            onClick={() => setIds([])}
            aria-label="Clear list"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {ids.map((id) => (
          <li key={id} className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-sunken/40">
            <span className="truncate font-mono text-[13px] text-ink">{id}</span>
            <AiCopyButton
              variant="ghost"
              size="sm"
              iconOnly
              label="Copy this UUID"
              value={id}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            />
          </li>
        ))}
        {ids.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink3">Nothing here — generate a batch.</li>}
      </ul>
    </div>
  );
}
