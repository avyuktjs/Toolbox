"use client";

import { useMemo, useState } from "react";
import { Trash2, Link2 } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { AiCopyButton } from "@/components/ai-copy-button";

import { slugify, type SlugSeparator as Separator } from "@/lib/slugify";

export function SlugifyTool() {
  const [input, setInput] = useState("");
  const [separator, setSeparator] = useState<Separator>("-");
  const [lower, setLower] = useState(true);
  const [perLine, setPerLine] = useState(false);

  const output = useMemo(() => {
    if (!input.trim()) return "";
    const render = (line: string) => slugify(line, { separator, lower });
    return perLine
      ? input.split("\n").filter((l) => l.trim()).map(render).join("\n")
      : render(input);
  }, [input, separator, lower, perLine]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            ariaLabel="Separator"
            size="sm"
            value={separator}
            onChange={setSeparator}
            options={[
              { value: "-", label: "dash -" },
              { value: "_", label: "underscore _" },
              { value: ".", label: "dot ." },
            ]}
          />
          <button
            type="button"
            role="checkbox"
            aria-checked={lower}
            onClick={() => setLower((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-[8px] border border-line2 bg-sunken px-2.5 text-[12px] font-medium text-ink2 transition-colors hover:text-ink aria-checked:border-brand aria-checked:text-accent-ink"
          >
            <span className="font-mono">{lower ? "✓" : ""}</span> lowercase
          </button>
          <button
            type="button"
            role="checkbox"
            aria-checked={perLine}
            onClick={() => setPerLine((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-[8px] border border-line2 bg-sunken px-2.5 text-[12px] font-medium text-ink2 transition-colors hover:text-ink aria-checked:border-brand aria-checked:text-accent-ink"
          >
            <span className="font-mono">{perLine ? "✓" : ""}</span> batch (one per line)
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <AiCopyButton variant="outline" size="sm" label="Copy" value={() => output} className="bg-panel" />
          <button
            type="button"
            onClick={() => setInput("")}
            aria-label="Clear"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"The quick brown fox jumps over the lazy dog\nOr batch titles, one per line…"}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Text to slugify"
          className="block h-56 w-full resize-y bg-panel p-4 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink3 sm:border-r sm:border-line"
        />
        <div className="border-t border-line bg-sunken/30 p-4 sm:border-t-0">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Slug</p>
          <output className="mt-2 block min-h-40 whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed text-ink">
            {output || <span className="text-ink3">your-slug-appears-here</span>}
          </output>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-sunken/40 px-4 py-1.5">
        <Link2 className="size-3 text-ink3" aria-hidden />
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
          Accents folded · punctuation dropped · diacritics removed
        </p>
      </div>
    </div>
  );
}
