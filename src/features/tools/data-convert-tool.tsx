"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import YAML from "yaml";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import Papa from "papaparse";
import { Segmented } from "@/components/ui/segmented";
import { AiCopyButton } from "@/components/ai-copy-button";

type Format = "json" | "yaml" | "toml" | "csv";

const FORMAT_META: Record<Format, { label: string; ext: string }> = {
  json: { label: "JSON", ext: "json" },
  yaml: { label: "YAML", ext: "yaml" },
  toml: { label: "TOML", ext: "toml" },
  csv: { label: "CSV", ext: "csv" },
};

function parseBy(format: Format, input: string): unknown {
  switch (format) {
    case "json": return JSON.parse(input);
    case "yaml": return YAML.parse(input);
    case "toml": return parseToml(input);
    case "csv": {
      const result = Papa.parse<Record<string, string>>(input.trim(), {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });
      if (result.errors.length > 0 && result.data.length === 0) {
        throw new Error(result.errors[0].message);
      }
      return result.data;
    }
  }
}

function stringifyBy(format: Format, value: unknown): string {
  switch (format) {
    case "json": return JSON.stringify(value, null, 2);
    case "yaml": return YAML.stringify(value);
    case "toml": return stringifyToml(value as Record<string, unknown>);
    case "csv": {
      if (!Array.isArray(value)) {
        throw new Error("CSV needs a top-level array of flat objects — convert via JSON first.");
      }
      return Papa.unparse(value as Record<string, unknown>[]);
    }
  }
}

const PLACEHOLDER: Record<Format, string> = {
  json: '{\n  "name": "Toolbox",\n  "tools": ["json", "csv"]\n}',
  yaml: "name: Toolbox\ntools:\n  - json\n  - csv\n",
  toml: 'name = "Toolbox"\ntools = ["json", "csv"]\n',
  csv: "name,role\nToolbox,shelf\n",
};

export function DataConvertTool() {
  const [from, setFrom] = useState<Format>("json");
  const [to, setTo] = useState<Format>("yaml");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (from === to) return { ok: true as const, text: trimmed, note: "Same format — pasted through unchanged." };
    try {
      const parsed = parseBy(from, trimmed);
      const text = stringifyBy(to, parsed);
      return { ok: true as const, text, note: null as string | null };
    } catch (error) {
      return { ok: false as const, text: "", error: error instanceof Error ? error.message : "Couldn't parse that." };
    }
  }, [input, from, to]);

  const swap = () => {
    setFrom(to);
    setTo(from);
    if (result?.ok) setInput(result.text);
  };

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* from → to bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <Segmented
          ariaLabel="From format"
          size="sm"
          value={from}
          onChange={setFrom}
          options={(Object.keys(FORMAT_META) as Format[]).map((f) => ({ value: f, label: FORMAT_META[f].label }))}
        />
        <button
          type="button"
          onClick={swap}
          aria-label="Swap formats"
          title="Swap"
          className="grid size-8 place-items-center rounded-full border border-line2 bg-sunken text-ink2 transition-all hover:rotate-180 hover:text-ink"
        >
          <ArrowLeftRight className="size-4" />
        </button>
        <Segmented
          ariaLabel="To format"
          size="sm"
          value={to}
          onChange={setTo}
          options={(Object.keys(FORMAT_META) as Format[]).map((f) => ({ value: f, label: FORMAT_META[f].label }))}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <AiCopyButton variant="outline" size="sm" label="Copy" value={() => (result?.ok ? result.text : "")} className="bg-panel" />
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
          placeholder={PLACEHOLDER[from]}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Input"
          className="block h-64 w-full resize-y bg-panel p-4 font-mono text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink3 sm:border-r sm:border-line"
        />
        <textarea
          readOnly
          value={result?.ok ? result.text : ""}
          placeholder="Converted output appears here"
          aria-label="Output"
          spellCheck={false}
          className="block h-64 w-full resize-y border-t border-line bg-sunken/30 p-4 font-mono text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink3 sm:border-t-0"
        />
      </div>

      {result?.ok === false ? (
        <p role="alert" className="border-t border-line px-4 py-2 font-mono text-[11.5px] text-red-500">{result.error}</p>
      ) : (
        <p className="border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
          {result?.note ?? "Round-trip safe · CSV works best with flat arrays of objects"}
        </p>
      )}
    </div>
  );
}
