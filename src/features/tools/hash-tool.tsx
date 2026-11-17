"use client";

import { useEffect, useState } from "react";
import { Trash2, Fingerprint } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";

type HashAlgo = "SHA-256" | "SHA-1" | "SHA-512";
const ALGOS: HashAlgo[] = ["SHA-256", "SHA-1", "SHA-512"];

async function digest(algo: HashAlgo, text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest(algo, bytes);
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function HashTool() {
  const [input, setInput] = useState("");
  const [computed, setComputed] = useState<{ input: string; hashes: Record<HashAlgo, string> } | null>(null);
  const [upper, setUpper] = useState(false);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    Promise.all(ALGOS.map((a) => digest(a, input))).then(([sha256, sha1, sha512]) => {
      if (cancelled) return;
      setComputed({ input, hashes: { "SHA-256": sha256, "SHA-1": sha1, "SHA-512": sha512 } });
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  // never show a stale hash for text the user no longer sees
  const hashes = computed && computed.input === input ? computed.hashes : null;

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          <Fingerprint className="size-4" /> Web Crypto — computed locally
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUpper((v) => !v)}
            aria-pressed={upper}
            className="h-8 rounded-full border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(29,67,242,0.55)] px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            {upper ? "UPPER" : "lower"}
          </button>
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

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type anything — the hash updates as you type…"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="Text to hash"
        className="block h-32 w-full resize-y bg-panel p-4 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink3"
      />

      <ul className="divide-y divide-line border-t border-line">
        {ALGOS.map((algo) => {
          const value = hashes?.[algo] ?? "";
          const shown = upper ? value.toUpperCase() : value;
          return (
            <li key={algo} className="flex items-center gap-3 px-4 py-3">
              <span className="w-16 shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">
                {algo}
              </span>
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-ink">
                {shown || <span className="text-ink3">—</span>}
              </code>
              <AiCopyButton
                variant="ghost"
                size="sm"
                iconOnly
                label={`Copy ${algo}`}
                value={shown}
                className="size-7 shrink-0"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
