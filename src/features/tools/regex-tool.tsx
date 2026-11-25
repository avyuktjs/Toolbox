"use client";

import { useMemo, useState } from "react";
import { Trash2, Replace, Regex as RegexIcon } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { cn } from "@/lib/utils";

const FLAG_OPTIONS = [
  { id: "g", label: "g", hint: "global" },
  { id: "i", label: "i", hint: "ignore case" },
  { id: "m", label: "m", hint: "multiline" },
  { id: "s", label: "s", hint: "dot matches newline" },
  { id: "u", label: "u", hint: "unicode" },
] as const;

type FlagId = (typeof FLAG_OPTIONS)[number]["id"];

interface MatchInfo {
  index: number;
  text: string;
  groups: string[];
  named: Record<string, string> | undefined;
}

const MAX_MATCHES = 500;

function runRegex(pattern: string, flags: Set<FlagId>, input: string) {
  if (!pattern) return { ok: true as const, matches: [] as MatchInfo[], error: null as string | null };
  let re: RegExp;
  try {
    re = new RegExp(pattern, [...flags].join(""));
  } catch (error) {
    return { ok: false as const, matches: [] as MatchInfo[], error: error instanceof Error ? error.message : "Invalid pattern" };
  }
  const matches: MatchInfo[] = [];
  if (flags.has("g")) {
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(input)) !== null && matches.length < MAX_MATCHES && guard < 1_000_000) {
      guard += 1;
      matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups as Record<string, string> | undefined });
      if (m[0] === "") re.lastIndex += 1; // don't spin forever on zero-width matches
    }
  } else {
    const m = re.exec(input);
    if (m) matches.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups as Record<string, string> | undefined });
  }
  return { ok: true as const, matches, error: null as string | null };
}

export function RegexTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<Set<FlagId>>(() => new Set(["g"]));
  const [input, setInput] = useState("");
  const [replacement, setReplacement] = useState("");

  const result = useMemo(() => runRegex(pattern, flags, input), [pattern, flags, input]);

  const toggleFlag = (id: FlagId) =>
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const replaced = useMemo(() => {
    if (!pattern || !result.ok) return null;
    try {
      const re = new RegExp(pattern, [...flags].join(""));
      return input.replace(re, replacement);
    } catch {
      return null;
    }
  }, [pattern, flags, input, replacement, result.ok]);

  /* build highlighted segments for the preview */
  const segments = useMemo(() => {
    if (!input) return [] as { text: string; hit: boolean }[];
    if (!result.ok || result.matches.length === 0) return [{ text: input, hit: false }];
    const segs: { text: string; hit: boolean }[] = [];
    let cursor = 0;
    for (const m of result.matches) {
      if (m.index > cursor) segs.push({ text: input.slice(cursor, m.index), hit: false });
      if (m.text) segs.push({ text: m.text, hit: true });
      cursor = m.index + m.text.length;
    }
    if (cursor < input.length) segs.push({ text: input.slice(cursor), hit: false });
    return segs;
  }, [input, result]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* pattern bar */}
      <div className="border-b border-line bg-sunken/40 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-10 min-w-52 flex-1 items-center gap-2 rounded-[10px] border border-line2 bg-panel px-3 focus-within:border-brand">
            <span aria-hidden className="font-mono text-[15px] text-ink3">/</span>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="pattern"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Regular expression pattern"
              className="h-full min-w-0 flex-1 bg-transparent font-mono text-[13.5px] text-ink outline-none placeholder:text-ink3"
            />
            <span aria-hidden className="font-mono text-[15px] text-ink3">/{[...flags].sort().join("")}</span>
          </div>
          <div className="flex items-center gap-1">
            {FLAG_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="checkbox"
                aria-checked={flags.has(f.id)}
                title={f.hint}
                onClick={() => toggleFlag(f.id)}
                className={cn(
                  "grid size-8 place-items-center rounded-[8px] border font-mono text-[13px] font-semibold transition-colors",
                  flags.has(f.id)
                    ? "border-brand bg-brand text-white"
                    : "border-line2 bg-sunken text-ink3 hover:text-ink",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setPattern(""); setInput(""); setReplacement(""); }}
            aria-label="Clear"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        {result.error ? (
          <p role="alert" className="mt-1.5 font-mono text-[11px] text-red-500">{result.error}</p>
        ) : pattern ? (
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">
            {result.matches.length}{result.matches.length >= MAX_MATCHES ? "+" : ""} match{result.matches.length === 1 ? "" : "es"}
          </p>
        ) : null}
      </div>

      {/* input + highlighted preview */}
      <div className="grid sm:grid-cols-2">
        <div className="border-b border-line sm:border-b-0 sm:border-r">
          <p className="border-b border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Test string</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Paste text to test…\nEmail me at jane@example.com or sam@test.org"}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Test string"
            className="block h-48 w-full resize-y bg-panel p-4 font-mono text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink3"
          />
        </div>
        <div>
          <p className="border-b border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Highlighted</p>
          <pre className="h-48 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-relaxed text-ink">
            {segments.map((seg, i) =>
              seg.hit ? (
                <mark key={i} className="rounded-[3px] bg-amber-300/70 px-0.5 text-inherit dark:bg-amber-500/40">{seg.text}</mark>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
            {!input && <span className="text-ink3">matches light up here</span>}
          </pre>
        </div>
      </div>

      {/* matches */}
      {result.matches.length > 0 ? (
        <div className="max-h-48 overflow-auto border-t border-line">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-sunken/95 backdrop-blur">
              <tr className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink3">
                <th className="px-4 py-1.5 font-semibold">#</th>
                <th className="px-4 py-1.5 font-semibold">Index</th>
                <th className="px-4 py-1.5 font-semibold">Match</th>
                <th className="px-4 py-1.5 font-semibold">Groups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono">
              {result.matches.slice(0, 100).map((m, i) => (
                <tr key={i} className="hover:bg-sunken/40">
                  <td className="px-4 py-1 tabular-nums text-ink3">{i + 1}</td>
                  <td className="px-4 py-1 tabular-nums text-ink2">{m.index}</td>
                  <td className="max-w-48 truncate px-4 py-1 text-ink" title={m.text}>{m.text || "∅"}</td>
                  <td className="max-w-64 truncate px-4 py-1 text-ink2">
                    {m.groups.length
                      ? m.groups.map((g, gi) => `${gi + 1}:${g ?? "∅"}`).join("  ")
                      : m.named
                        ? Object.entries(m.named).map(([k, v]) => `${k}:${v}`).join("  ")
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* replace */}
      <div className="border-t border-line">
        <div className="flex items-center gap-2 border-b border-line bg-sunken/40 px-4 py-1.5">
          <Replace className="size-3.5 text-ink3" aria-hidden />
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder="Replace with… ($1, $2 or $<name> work)"
            spellCheck={false}
            autoCapitalize="off"
            aria-label="Replacement string"
            className="h-7 min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink outline-none placeholder:text-ink3"
          />
          <AiCopyButton variant="outline" size="sm" label="Copy result" value={() => replaced ?? ""} className="bg-panel" />
        </div>
        {replacement || replaced !== null ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words bg-sunken/30 p-4 font-mono text-[12px] leading-relaxed text-ink">
            {replaced ?? ""}
          </pre>
        ) : (
          <p className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">Replace preview appears here</p>
        )}
      </div>

      <p className="flex items-center gap-2 border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        <RegexIcon className="size-3" aria-hidden /> JavaScript RegExp · first 500 matches
      </p>
    </div>
  );
}
