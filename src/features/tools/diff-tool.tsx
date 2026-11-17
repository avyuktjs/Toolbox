"use client";

import { useMemo, useState } from "react";
import { Trash2, Columns2 } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { cn } from "@/lib/utils";

type Line = { type: "same" | "add" | "del"; text: string };

/** Line-based LCS diff — no dependencies, capped at 2000 lines per side. */
function diffLines(before: string[], after: string[]): Line[] {
  const m = before.length;
  const n = after.length;
  if (m * n > 4_000_000) return [{ type: "del", text: "Inputs too large to diff (cap: 2000×2000 lines)." }];

  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = before[i] === after[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: Line[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (before[i] === after[j]) {
      out.push({ type: "same", text: before[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: before[i] });
      i++;
    } else {
      out.push({ type: "add", text: after[j] });
      j++;
    }
  }
  while (i < m) out.push({ type: "del", text: before[i++] });
  while (j < n) out.push({ type: "add", text: after[j++] });
  return out;
}

const SAMPLE_BEFORE = "const greeting = \"hello\";\nconsole.log(greeting);\n\nfunction main() {\n  run();\n}";
const SAMPLE_AFTER = "const greeting = \"hello, world\";\nconsole.log(greeting.toUpperCase());\n\nfunction main() {\n  setup();\n  run();\n}";

export function DiffTool() {
  const [before, setBefore] = useState(SAMPLE_BEFORE);
  const [after, setAfter] = useState(SAMPLE_AFTER);

  const result = useMemo(() => {
    const a = before.split("\n");
    const b = after.split("\n");
    const lines = diffLines(a, b);
    const added = lines.filter((l) => l.type === "add").length;
    const removed = lines.filter((l) => l.type === "del").length;
    return { lines, added, removed, changed: added + removed };
  }, [before, after]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          <Columns2 className="size-4" /> Line diff — computed locally
        </span>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="t-tabular text-ok">+{result.added}</span>
          <span className="t-tabular text-danger">−{result.removed}</span>
          <button
            type="button"
            onClick={() => {
              setBefore("");
              setAfter("");
            }}
            aria-label="Clear both"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2">
        <label className="border-b border-line p-3 sm:border-b-0 sm:border-r">
          <span className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-ink3">Before</span>
            <AiCopyButton variant="ghost" size="sm" iconOnly label="Copy before" value={before} className="size-6" />
          </span>
          <textarea
            value={before}
            onChange={(e) => setBefore(e.target.value)}
            spellCheck={false}
            aria-label="Original text"
            className="h-56 w-full resize-y bg-transparent font-mono text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink3"
          />
        </label>
        <label className="p-3">
          <span className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-ink3">After</span>
            <AiCopyButton variant="ghost" size="sm" iconOnly label="Copy after" value={after} className="size-6" />
          </span>
          <textarea
            value={after}
            onChange={(e) => setAfter(e.target.value)}
            spellCheck={false}
            aria-label="Changed text"
            className="h-56 w-full resize-y bg-transparent font-mono text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink3"
          />
        </label>
      </div>

      <div className="border-t border-line bg-sunken/30">
        <div className="flex items-center justify-between border-b border-line px-4 py-1.5">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Diff</span>
          {result.changed > 0 && <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink3 t-tabular">{result.changed} changed</span>}
        </div>
        <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
          {result.lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap rounded-[3px] px-2 py-0.5",
                line.type === "add" && "bg-ok-soft text-ok",
                line.type === "del" && "bg-danger-soft text-danger",
              )}
            >
              <span className="select-none opacity-60">{line.type === "add" ? "+ " : line.type === "del" ? "− " : "  "}</span>
              {line.text || " "}
            </div>
          ))}
          {result.lines.length === 0 && <div className="px-2 text-ink3">Nothing to compare.</div>}
        </pre>
      </div>
    </div>
  );
}
