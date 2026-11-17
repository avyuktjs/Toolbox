"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Trash2 } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { cn } from "@/lib/utils";

type Direction = "encode" | "decode";

const encodeUtf8 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};
const decodeUtf8 = (b64: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

export function Base64Tool() {
  const [direction, setDirection] = useState<Direction>("encode");
  const [input, setInput] = useState("");

  const output = useMemo(() => {
    if (!input.trim()) return { ok: true as const, text: "" };
    try {
      return {
        ok: true as const,
        text: direction === "encode" ? encodeUtf8(input) : decodeUtf8(input.replace(/\s+/g, "")),
      };
    } catch {
      return { ok: false as const, text: "", message: "That isn't valid Base64 — check the padding (=) and characters." };
    }
  }, [input, direction]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* direction row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          <span>{direction === "encode" ? "Text" : "Base64"}</span>
          <button
            type="button"
            aria-label="Swap direction"
            onClick={() => setDirection((d) => (d === "encode" ? "decode" : "encode"))}
            className="grid size-8 place-items-center rounded-full text-ink2 transition-colors hover:bg-line hover:text-ink"
          >
            <ArrowDownUp className="size-4" />
          </button>
          <span>{direction === "encode" ? "Base64" : "Text"}</span>
        </div>
        <button
          type="button"
          onClick={() => setInput("")}
          aria-label="Clear"
          className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={direction === "encode" ? "Text to encode…" : "Base64 to decode…"}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Input"
          className="h-64 resize-y bg-panel p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink3 max-sm:border-b max-sm:border-line sm:border-r"
        />
        <div className="flex flex-col">
          <textarea
            readOnly
            value={output.text}
            placeholder={direction === "encode" ? "SGVsbG8…" : "Decoded text appears here"}
            aria-label="Output"
            spellCheck={false}
            className="h-56 resize-y bg-sunken/30 p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink3 sm:h-64"
          />
          <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
            <span className={cn("text-[12px]", output.ok ? "text-ink3" : "text-danger")}>
              {!output.ok ? output.message : output.text ? `${output.text.length.toLocaleString()} characters` : "Waiting for input"}
            </span>
            <AiCopyButton
              variant="secondary"
              size="sm"
              label="Copy"
              value={() => (output.ok ? output.text : "")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
