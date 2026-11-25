"use client";

import { useMemo, useState } from "react";
import { FileKey2 } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";

type Bits = { r: boolean; w: boolean; x: boolean };
type Row = "owner" | "group" | "other";
const ROWS: Row[] = ["owner", "group", "other"];
const COLS: (keyof Bits)[] = ["r", "w", "x"];

const PRESETS = [
  { label: "644", hint: "files", bits: "rw-r--r--" },
  { label: "755", hint: "scripts", bits: "rwxr-xr-x" },
  { label: "600", hint: "keys", bits: "rw-------" },
  { label: "700", hint: "private", bits: "rwx------" },
  { label: "777", hint: "nobody", bits: "rwxrwxrwx" },
  { label: "400", hint: "readonly", bits: "r--------" },
] as const;

function bitsToOctal(bits: Record<Row, Bits>): string {
  return ROWS.map((row) =>
    String(
      (bits[row].r ? 4 : 0) + (bits[row].w ? 2 : 0) + (bits[row].x ? 1 : 0),
    ),
  ).join("");
}

function bitsToSymbolic(bits: Record<Row, Bits>): string {
  return ROWS.map(
    (row) =>
      `${bits[row].r ? "r" : "-"}${bits[row].w ? "w" : "-"}${bits[row].x ? "x" : "-"}`,
  ).join("");
}

function octalToBits(octal: string): Record<Row, Bits> | null {
  const m = octal.trim().match(/^0?([0-7])([0-7])([0-7])$/);
  if (!m) return null;
  const decode = (d: string): Bits => {
    const n = Number(d);
    return { r: !!(n & 4), w: !!(n & 2), x: !!(n & 1) };
  };
  return { owner: decode(m[1]), group: decode(m[2]), other: decode(m[3]) };
}

function symbolicToBits(symbolic: string): Record<Row, Bits> | null {
  const m = symbolic.trim().match(/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/i);
  if (!m) return null;
  const s = m[0].toLowerCase();
  const row = (i: number): Bits => ({
    r: s[i] === "r",
    w: s[i + 1] === "w",
    x: s[i + 2] === "x",
  });
  return { owner: row(0), group: row(3), other: row(6) };
}

const EMPTY: Record<Row, Bits> = {
  owner: { r: true, w: true, x: false },
  group: { r: true, w: false, x: false },
  other: { r: true, w: false, x: false },
};

export function ChmodTool() {
  const [bits, setBits] = useState<Record<Row, Bits>>(EMPTY);
  const [octalInput, setOctalInput] = useState("644");
  const [symbolicInput, setSymbolicInput] = useState("rw-r--r--");
  const [error, setError] = useState<string | null>(null);

  const octal = bitsToOctal(bits);
  const symbolic = bitsToSymbolic(bits);

  const syncFromBits = (next: Record<Row, Bits>) => {
    setBits(next);
    setOctalInput(bitsToOctal(next));
    setSymbolicInput(bitsToSymbolic(next));
    setError(null);
  };

  const flip = (row: Row, col: keyof Bits) =>
    syncFromBits({ ...bits, [row]: { ...bits[row], [col]: !bits[row][col] } });

  const applyOctal = (value: string) => {
    setOctalInput(value);
    const parsed = octalToBits(value);
    if (parsed) {
      setBits(parsed);
      setSymbolicInput(bitsToSymbolic(parsed));
      setError(null);
    } else setError("Octal is three digits 0–7, e.g. 755");
  };

  const applySymbolic = (value: string) => {
    setSymbolicInput(value);
    const parsed = symbolicToBits(value);
    if (parsed) {
      setBits(parsed);
      setOctalInput(bitsToOctal(parsed));
      setError(null);
    } else setError("Symbolic is nine chars like rwxr-xr-x");
  };

  const summary = useMemo(() => {
    const parts = ROWS.map((row) => {
      const b = bits[row];
      return `${row}: ${b.r ? "read " : ""}${b.w ? "write " : ""}${b.x ? "execute" : ""}`.trim();
    });
    return parts.join(" · ");
  }, [bits]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* presets */}
      <div className="flex flex-wrap gap-1.5 border-b border-line bg-sunken/40 px-4 py-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => syncFromBits(symbolicToBits(p.bits)!)}
            className="h-8 rounded-[8px] border border-line2 bg-sunken px-2.5 font-mono text-[12px] text-ink2 transition-colors hover:border-brand hover:text-ink"
            title={p.bits}
          >
            {p.label} <span className="font-sans text-[10px] text-ink3">{p.hint}</span>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-[auto_1fr]">
        {/* matrix */}
        <div className="border-b border-line p-5 sm:border-b-0 sm:border-r">
          <div className="grid grid-cols-[auto_repeat(3,2.5rem)] items-center gap-1.5">
            <span />
            {COLS.map((c) => (
              <span key={c} className="text-center font-mono text-[11px] font-semibold uppercase text-ink3">{c}</span>
            ))}
            {ROWS.map((row) => (
              <div key={row} className="contents">
                <span className="pr-2 font-mono text-[12px] font-semibold text-ink2">{row}</span>
                {COLS.map((col) => {
                  const on = bits[row][col];
                  return (
                    <button
                      key={col}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${row} ${col}`}
                      onClick={() => flip(row, col)}
                      className={`grid size-10 place-items-center rounded-[9px] border font-mono text-[13px] font-semibold transition-all ${
                        on
                          ? "border-brand bg-brand text-white shadow-[0_4px_14px_-4px_rgba(29,67,242,0.6)]"
                          : "border-line2 bg-sunken text-ink3 hover:text-ink"
                      }`}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-4 max-w-56 text-[11px] leading-relaxed text-ink3">{summary}</p>
        </div>

        {/* readouts */}
        <div className="flex flex-col gap-4 p-5">
          <div>
            <label htmlFor="octal" className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Octal</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="octal"
                value={octalInput}
                onChange={(e) => applyOctal(e.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                className="h-14 w-full rounded-[10px] border border-line2 bg-sunken px-4 text-center font-mono text-[26px] font-semibold tabular-nums text-ink outline-none focus:border-brand"
              />
              <AiCopyButton variant="outline" size="sm" label="Copy" value={() => octal} className="bg-panel" />
            </div>
          </div>
          <div>
            <label htmlFor="symbolic" className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Symbolic</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="symbolic"
                value={symbolicInput}
                onChange={(e) => applySymbolic(e.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                className="h-14 w-full rounded-[10px] border border-line2 bg-sunken px-4 text-center font-mono text-[22px] font-semibold tracking-[0.08em] text-ink outline-none focus:border-brand"
              />
              <AiCopyButton variant="outline" size="sm" label="Copy" value={() => symbolic} className="bg-panel" />
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-[12px] font-medium text-red-500">{error}</p>
          ) : (
            <div className="flex items-center gap-2 rounded-[10px] border border-line bg-sunken/40 px-3 py-2">
              <FileKey2 className="size-4 shrink-0 text-ink3" aria-hidden />
              <code className="font-mono text-[12px] text-ink2">chmod {octal} file{bits.owner.x || bits.group.x || bits.other.x ? "" : ""}</code>
            </div>
          )}
          <p className="mt-auto font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
            r=4 · w=2 · x=1 — same math the shell does
          </p>
        </div>
      </div>
    </div>
  );
}
