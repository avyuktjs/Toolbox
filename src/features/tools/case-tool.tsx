"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";

/** Split a phrase into lower-case words: handles snake, kebab, spaces, camel boundaries. */
function words(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelBoundary
    .split(/[^a-zA-Z0-9]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const CASES: { label: string; apply: (w: string[]) => string }[] = [
  { label: "camelCase", apply: (w) => w.map((x, i) => (i === 0 ? x : cap(x))).join("") },
  { label: "PascalCase", apply: (w) => w.map(cap).join("") },
  { label: "snake_case", apply: (w) => w.join("_") },
  { label: "kebab-case", apply: (w) => w.join("-") },
  { label: "CONSTANT_CASE", apply: (w) => w.join("_").toUpperCase() },
  { label: "dot.case", apply: (w) => w.join(".") },
  { label: "Title Case", apply: (w) => w.map(cap).join(" ") },
  { label: "Train-Case", apply: (w) => w.map(cap).join("-") },
  { label: "path/case", apply: (w) => w.join("/") },
  { label: "Sentence case", apply: (w) => cap(w.join(" ")) },
];

export function CaseTool() {
  const [input, setInput] = useState("");
  const split = useMemo(() => words(input), [input]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-2">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Input</span>
        <button
          type="button"
          onClick={() => setInput("")}
          aria-label="Clear"
          className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="someVariableName, a phrase — anything goes"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Text to convert"
        className="block h-14 w-full bg-panel px-4 font-mono text-[15px] text-ink outline-none placeholder:text-ink3"
      />
      <ul className="divide-y divide-line border-t border-line">
        {CASES.map(({ label, apply }) => {
          const value = split.length ? apply(split) : "";
          return (
            <li key={label} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sunken/40">
              <span className="w-32 shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">
                {label}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{value || "—"}</span>
              <AiCopyButton
                variant="ghost"
                size="sm"
                iconOnly
                label={`Copy ${label}`}
                value={value}
                className="size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
