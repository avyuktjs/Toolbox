"use client";

import { useMemo, useState } from "react";

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
const countSentences = (text: string) => {
  const matches = text.match(/[.!?…]+(\s|$)/g);
  return matches ? matches.length : text.trim() ? 1 : 0;
};

export function WordCounterTool() {
  const [input, setInput] = useState("");

  const stats = useMemo(() => {
    const words = countWords(input);
    const chars = input.length;
    const noSpaces = input.replace(/\s/g, "").length;
    const lines = input ? input.split("\n").length : 0;
    const sentences = countSentences(input);
    const minutes = words / 220; // average adult reading speed
    const reading = minutes < 1 ? `${Math.max(1, Math.round(minutes * 60))}s` : `${minutes.toFixed(1)} min`;
    return { words, chars, noSpaces, lines, sentences, reading };
  }, [input]);

  const cells: { label: string; value: string | number }[] = [
    { label: "Words", value: stats.words },
    { label: "Characters", value: stats.chars },
    { label: "No spaces", value: stats.noSpaces },
    { label: "Sentences", value: stats.sentences },
    { label: "Lines", value: stats.lines },
    { label: "Reading time", value: stats.reading },
  ];

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="grid grid-cols-3 gap-px border-b border-line bg-line sm:grid-cols-6">
        {cells.map(({ label, value }) => (
          <div key={label} className="bg-panel px-3 py-3 text-center">
            <p className="t-tabular font-display text-xl font-semibold leading-none tracking-[-0.02em] text-ink">
              {value}
            </p>
            <p className="mt-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-ink3">
              {label}
            </p>
          </div>
        ))}
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Start typing, or paste anything — a post, a script, an email, your novel’s first page…"
        autoFocus
        spellCheck
        aria-label="Text to count"
        className="block h-72 w-full resize-y bg-panel p-5 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink3"
      />
    </div>
  );
}
