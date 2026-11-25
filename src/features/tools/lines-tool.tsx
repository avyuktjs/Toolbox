"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Copy,
  ListOrdered,
  ListFilter,
  ListRestart,
  Shuffle,
  Trash2,
} from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { toast } from "sonner";

type Action =
  | "sortAsc" | "sortDesc" | "dedupe" | "reverse" | "shuffle"
  | "trim" | "dropEmpty" | "number" | "upper" | "lower";

const ACTIONS: { id: Action; label: string; icon: React.ReactNode }[] = [
  { id: "sortAsc", label: "Sort A→Z", icon: <ArrowDownAZ className="size-3.5" /> },
  { id: "sortDesc", label: "Sort Z→A", icon: <ArrowUpAZ className="size-3.5" /> },
  { id: "dedupe", label: "Dedupe", icon: <ListFilter className="size-3.5" /> },
  { id: "reverse", label: "Reverse", icon: <ListRestart className="size-3.5" /> },
  { id: "shuffle", label: "Shuffle", icon: <Shuffle className="size-3.5" /> },
  { id: "trim", label: "Trim whitespace", icon: <Copy className="size-3.5" /> },
  { id: "dropEmpty", label: "Drop empty lines", icon: <Trash2 className="size-3.5" /> },
  { id: "number", label: "Number lines", icon: <ListOrdered className="size-3.5" /> },
  { id: "upper", label: "UPPERCASE", icon: <span className="font-mono text-[10px]">AA</span> },
  { id: "lower", label: "lowercase", icon: <span className="font-mono text-[10px]">aa</span> },
];

function applyAction(lines: string[], action: Action): string[] {
  switch (action) {
    case "sortAsc": return [...lines].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    case "sortDesc": return [...lines].sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }));
    case "dedupe": {
      const seen = new Set<string>();
      return lines.filter((l) => (seen.has(l) ? false : (seen.add(l), true)));
    }
    case "reverse": return [...lines].reverse();
    case "shuffle": {
      const out = [...lines];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }
    case "trim": return lines.map((l) => l.trim());
    case "dropEmpty": return lines.filter((l) => l.trim().length > 0);
    case "number": return lines.map((l, i) => `${i + 1}\t${l}`);
    case "upper": return lines.map((l) => l.toUpperCase());
    case "lower": return lines.map((l) => l.toLowerCase());
  }
}

export function LinesTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);

  const inputStats = useMemo(() => {
    const lines = input.split("\n");
    const nonEmpty = lines.filter((l) => l.trim()).length;
    return { lines: input ? lines.length : 0, nonEmpty, unique: new Set(lines).size };
  }, [input]);

  const run = (action: Action) => {
    if (!input) {
      toast.message("Nothing to work on", { description: "Paste some lines first." });
      return;
    }
    setOutput(applyAction(input.split("\n"), action).join("\n"));
  };

  const shown = output ?? input;

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* actions */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-sunken/40 px-3 py-2">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => run(a.id)}
            className="flex h-8 items-center gap-1.5 rounded-[8px] border border-line2 bg-sunken px-2.5 text-[11.5px] font-medium text-ink2 transition-colors hover:border-brand hover:text-ink"
          >
            {a.icon}
            {a.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <AiCopyButton variant="outline" size="sm" label="Copy result" value={() => shown} className="bg-panel" />
          <button
            type="button"
            onClick={() => { setInput(""); setOutput(null); }}
            aria-label="Clear"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2">
        <div>
          <p className="border-b border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
            Input — {inputStats.lines} lines · {inputStats.nonEmpty} non-empty · {inputStats.unique} unique
          </p>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setOutput(null); }}
            placeholder={"Paste lines here…\nbanana\napple\nbanana\ncherry"}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Lines input"
            className="block h-72 w-full resize-y bg-panel p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink3 sm:border-r sm:border-line"
          />
        </div>
        <div>
          <p className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-1.5">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
              {output === null ? "Result (run an action)" : "Result"}
            </span>
            {output !== null ? (
              <button
                type="button"
                onClick={() => { setInput(output); setOutput(null); }}
                className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-ink hover:underline underline-offset-4"
              >
                Keep as input →
              </button>
            ) : null}
          </p>
          <textarea
            readOnly
            value={shown}
            placeholder="Result appears here"
            aria-label="Lines output"
            spellCheck={false}
            className="block h-72 w-full resize-y bg-sunken/30 p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink3"
          />
        </div>
      </div>
    </div>
  );
}
