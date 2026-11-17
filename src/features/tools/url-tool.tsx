"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { Segmented } from "@/components/ui/segmented";

type Mode = "encode" | "decode";

export function UrlTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  const output = useMemo(() => {
    if (!input) return { ok: true as const, text: "" };
    try {
      return {
        ok: true as const,
        text: mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input),
      };
    } catch {
      return {
        ok: false as const,
        text: "",
        message: "That's not valid percent-encoding — try %20-style sequences.",
      };
    }
  }, [input, mode]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <Segmented
          ariaLabel="Direction"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
        />
        <button
          type="button"
          onClick={() => setInput("")}
          aria-label="Clear"
          className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <label className="sr-only" htmlFor="url-input">
        {mode === "encode" ? "Text to encode" : "Percent-encoded text to decode"}
      </label>
      <textarea
        id="url-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={mode === "encode" ? "hello world & friends?" : "hello%20world%20%26%20friends%3F"}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="block h-44 w-full resize-y bg-panel p-4 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink3"
      />

      <div className="border-t border-line">
        <div className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-1.5">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Output</span>
          <AiCopyButton
            variant="ghost"
            size="sm"
            iconOnly
            label={mode === "encode" ? "Copy encoded" : "Copy decoded"}
            value={() => (output.ok ? output.text : "")}
            className="size-7"
          />
        </div>
        <textarea
          readOnly
          value={output.text}
          placeholder="Output appears here"
          aria-label="Output"
          spellCheck={false}
          className="block h-44 w-full resize-y bg-sunken/30 p-4 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink3"
        />
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-ink3">
        <span>{output.ok ? (input ? `${output.text.length.toLocaleString()} characters` : "Waiting for input") : output.message}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em]">encodeURIComponent</span>
      </div>
    </div>
  );
}
