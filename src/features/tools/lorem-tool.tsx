"use client";

import { useMemo, useState } from "react";
import { Trash2, Type } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { Segmented } from "@/components/ui/segmented";

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "commodo", "consequat",
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lorem(words: number, seed: number): string {
  const rand = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < words; i++) {
    out.push(WORDS[Math.floor(rand() * WORDS.length)]);
  }
  // capitalize sentence starts & add punctuation every 6-10 words
  let result = out.join(" ");
  result = result.charAt(0).toUpperCase() + result.slice(1);
  let pos = 0;
  let count = 0;
  while (pos < result.length) {
    const next = result.indexOf(" ", pos + 1);
    if (next === -1 || pos === 0) break;
    count++;
    if (count >= 7 && rand() < 0.6) {
      result = result.slice(0, next) + "." + result.slice(next);
      count = 0;
    }
    pos = next + 1;
  }
  if (!/[.!?]$/.test(result)) result += ".";
  return result;
}

export function LoremTool() {
  const [amount, setAmount] = useState<"words" | "sentences" | "paragraphs">("sentences");
  const [count, setCount] = useState(3);
  const [seed, setSeed] = useState(42);

  const output = useMemo(() => {
    if (amount === "words") return lorem(count, seed);
    if (amount === "sentences") {
      const sentences: string[] = [];
      for (let i = 0; i < count; i++) sentences.push(lorem(8 + Math.floor(Math.abs(Math.sin(seed + i)) * 12), seed + i));
      return sentences.join(" ");
    }
    const paragraphs: string[] = [];
    for (let i = 0; i < count; i++) paragraphs.push(lorem(40 + Math.floor(Math.abs(Math.sin(seed * 3 + i)) * 40), seed + i * 7));
    return paragraphs.join("\n\n");
  }, [amount, count, seed]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <Segmented
          ariaLabel="Unit"
          size="sm"
          value={amount}
          onChange={setAmount}
          options={[
            { value: "words", label: "Words" },
            { value: "sentences", label: "Sentences" },
            { value: "paragraphs", label: "Paragraphs" },
          ]}
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] text-ink2">
            Count
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="h-8 w-14 rounded-full border border-line bg-sunken/50 px-2 text-center font-mono text-[12px] text-ink outline-none"
              aria-label="How many"
            />
          </label>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="h-8 rounded-full border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(29,67,242,0.55)] px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
            title="Reshuffle"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => setCount(3)}
            aria-label="Reset"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-line px-4 py-2">
        <Type className="size-4 text-ink3" />
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink3">
          Deterministic — seed {seed} · same seed, same text
        </span>
      </div>

      <textarea
        readOnly
        value={output}
        aria-label="Generated lorem ipsum"
        className="block h-64 w-full resize-y bg-panel p-5 text-[14px] leading-relaxed text-ink outline-none"
      />
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
          {output.trim().split(/\s+/).length} words · {output.length.toLocaleString()} chars
        </span>
        <AiCopyButton variant="secondary" size="sm" label="Copy" value={output} />
      </div>
    </div>
  );
}
