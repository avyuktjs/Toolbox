"use client";

import { useMemo, useState } from "react";
import { Trash2, Braces, CircleAlert, CircleCheck } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { AiCopyButton } from "@/components/ai-copy-button";

type Mode = "pretty2" | "pretty4" | "minify";

function locate(json: string, message: string): { line: number; col: number } | null {
  const m = message.match(/position (\d+)/i);
  if (!m) return null;
  const pos = Number(m[1]);
  const upto = json.slice(0, pos);
  const line = upto.split("\n").length;
  const col = pos - (upto.lastIndexOf("\n") + 1) + 1;
  return { line, col };
}

function countKeys(value: unknown): number {
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce(
      (sum, [, v]) => sum + 1 + countKeys(v),
      0,
    );
  }
  return 0;
}

export function JsonTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("pretty2");
  const result = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      const text =
        mode === "minify"
          ? JSON.stringify(parsed)
          : JSON.stringify(parsed, null, mode === "pretty2" ? 2 : 4);
      return { ok: true as const, text, keys: countKeys(parsed), bytes: new TextEncoder().encode(text).length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      return { ok: false as const, message, where: locate(trimmed, message) };
    }
  }, [input, mode]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <Segmented
          ariaLabel="Format"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "pretty2", label: "2 spaces" },
            { value: "pretty4", label: "4 spaces" },
            { value: "minify", label: "Minify" },
          ]}
        />
        <div className="flex items-center gap-1.5">
          <AiCopyButton
            variant="outline"
            size="sm"
            label="Copy"
            value={() => (result && result.ok ? result.text : "")}
            className="bg-panel"
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
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Paste JSON — {"hello": "world"}'
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="JSON input"
        className="block h-56 w-full resize-y bg-panel p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink3"
      />

      <div className="border-t border-line">
        <div className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-1.5">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Output</span>
          {result?.ok ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
              {new TextEncoder().encode(result.text).length.toLocaleString()} bytes
            </span>
          ) : null}
        </div>
        <textarea
          readOnly
          value={result?.ok ? result.text : result ? "" : ""}
          placeholder="Formatted output appears here"
          aria-label="Formatted JSON output"
          spellCheck={false}
          className="block h-56 w-full resize-y bg-sunken/30 p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none placeholder:text-ink3"
        />
      </div>

      {/* status */}
      <div className="border-t border-line px-4 py-2.5">
        {!result ? (
          <p className="flex items-center gap-2 text-[12px] text-ink3">
            <Braces className="size-4" /> Waiting for JSON…
          </p>
        ) : result.ok ? (
          <p className="flex items-center gap-2 text-[12px] font-medium text-ok">
            <CircleCheck className="size-4" />
            Valid JSON — {result.keys} keys, {result.bytes.toLocaleString()} bytes
            {mode === "minify" ? ", minified" : ""}
          </p>
        ) : (
          <p className="flex items-start gap-2 text-[12px] font-medium leading-snug text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {result.message}
              {result.where && (
                <span className="ml-1 font-normal text-ink2">
                  (line {result.where.line}, column {result.where.col})
                </span>
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
