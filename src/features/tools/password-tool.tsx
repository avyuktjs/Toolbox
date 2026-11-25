"use client";

import { useCallback, useMemo, useState } from "react";
import { Dices, ShieldCheck, Trash2 } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { Slider } from "@/components/ui/slider";

const LOWER = "abcdefghijkmnopqrstuvwxyz"; // no l
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ"; // no I, L, O
const DIGITS = "23456789"; // no 0, 1
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL_LOWER = "abcdefghijklmnopqrstuvwxyz";
const ALL_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALL_DIGITS = "0123456789";

/** Rejection-sampled index — no modulo bias. */
function randomIndex(max: number): number {
  const limit = Math.floor(256 / max) * max;
  const buf = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

function generate(length: number, sets: string[]): string {
  const alphabet = sets.join("");
  if (!alphabet) return "";
  const chars: string[] = [];
  // guarantee at least one char from each selected set
  for (const set of sets) chars.push(set[randomIndex(set.length)]);
  while (chars.length < length) chars.push(alphabet[randomIndex(alphabet.length)]);
  // Fisher–Yates shuffle so guaranteed chars aren't always in front
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, length).join("");
}

function entropyBits(length: number, alphabetSize: number): number {
  if (alphabetSize <= 1) return 0;
  return length * Math.log2(alphabetSize);
}

const PRESETS = [
  { id: "pin", label: "PIN (digits)", length: 6, lower: false, upper: false, lowDigits: true, symbols: false, ambiguous: false },
  { id: "memorable", label: "Readable", length: 16, lower: true, upper: true, lowDigits: true, symbols: false, ambiguous: false },
  { id: "strong", label: "Strong", length: 24, lower: true, upper: true, lowDigits: true, symbols: true, ambiguous: false },
  { id: "max", label: "Maximum", length: 48, lower: true, upper: true, lowDigits: true, symbols: true, ambiguous: false },
] as const;

export function PasswordTool() {
  const [length, setLength] = useState(20);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [noAmbiguous, setNoAmbiguous] = useState(true);
  const [count, setCount] = useState(5);
  const [batch, setBatch] = useState<string[]>([]);

  const sets = useMemo(() => {
    const out: string[] = [];
    if (lower) out.push(noAmbiguous ? LOWER : ALL_LOWER);
    if (upper) out.push(noAmbiguous ? UPPER : ALL_UPPER);
    if (digits) out.push(noAmbiguous ? DIGITS : ALL_DIGITS);
    if (symbols) out.push(SYMBOLS);
    return out;
  }, [lower, upper, digits, symbols, noAmbiguous]);

  const alphabetSize = sets.join("").length;
  const bits = entropyBits(length, alphabetSize);
  const verdict =
    bits >= 80 ? { label: "Fortress", cls: "text-emerald-600 dark:text-emerald-400" }
    : bits >= 60 ? { label: "Strong", cls: "text-emerald-600 dark:text-emerald-400" }
    : bits >= 40 ? { label: "Decent", cls: "text-amber-600 dark:text-amber-400" }
    : { label: "Weak — add length", cls: "text-red-500" };

  const roll = useCallback(() => {
    setBatch(Array.from({ length: count }, () => generate(length, sets)));
  }, [count, length, sets]);

  const toggle = (on: boolean, set: (v: boolean) => void, label: string) => (
    <button
      key={label}
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={() => set(!on)}
      className="flex h-8 items-center gap-1.5 rounded-[8px] border border-line2 bg-sunken px-2.5 text-[12px] font-medium text-ink2 transition-colors hover:text-ink aria-checked:border-brand aria-checked:text-accent-ink"
    >
      <span className="font-mono">{on ? "✓" : ""}</span> {label}
    </button>
  );

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setLength(p.length);
              setLower(p.lower);
              setUpper(p.upper);
              setDigits(p.lowDigits);
              setSymbols(p.symbols);
              setNoAmbiguous(p.ambiguous === false ? true : false);
            }}
            className="h-8 rounded-[8px] border border-line2 bg-sunken px-2.5 text-[12px] font-medium text-ink2 transition-colors hover:border-brand hover:text-ink"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-0 sm:grid-cols-[1fr_1fr]">
        {/* left — settings */}
        <div className="border-b border-line p-5 sm:border-b-0 sm:border-r">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-semibold text-ink2">Length</span>
            <span className="font-mono text-[22px] font-semibold tabular-nums text-ink">{length}</span>
          </div>
          <Slider minValue={4} maxValue={64} value={length} onChange={setLength} thumbLabel="Length" aria-label="Length" showTooltip={false} className="mt-2" />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {toggle(lower, setLower, "lowercase")}
            {toggle(upper, setUpper, "UPPERCASE")}
            {toggle(digits, setDigits, "digits")}
            {toggle(symbols, setSymbols, "symbols")}
            {toggle(noAmbiguous, setNoAmbiguous, "no ambiguous (0O1lI)")}
          </div>

          <div className="mt-5 rounded-[12px] border border-line bg-sunken/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink3">
                <ShieldCheck className="size-3.5" aria-hidden /> Entropy
              </span>
              <span className={`text-[13px] font-semibold ${verdict.cls}`}>{verdict.label}</span>
            </div>
            <p className="mt-1 font-mono text-[28px] font-semibold leading-none tabular-nums text-ink">
              {bits.toFixed(0)} <span className="text-[13px] font-medium text-ink3">bits</span>
            </p>
            <p className="mt-1 text-[11px] text-ink3">
              {alphabetSize}-character alphabet · cracking at 1 trillion guesses/sec ≈{" "}
              {bits > 40 ? (2 ** (bits - 40) / (3.15e7 * 1e12)).toExponential(1) : "0"} years
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <label htmlFor="pw-count" className="text-[12px] font-semibold text-ink2">How many</label>
            <input
              id="pw-count"
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="h-8 w-16 rounded-[8px] border border-line2 bg-sunken px-2 text-center font-mono text-[13px] text-ink outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={roll}
              className="flex h-9 items-center gap-1.5 rounded-[9px] bg-brand px-4 text-[13px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <Dices className="size-4" aria-hidden /> Generate
            </button>
          </div>
        </div>

        {/* right — output */}
        <div className="flex flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
              {batch.length ? `${batch.length} password${batch.length === 1 ? "" : "s"} — click any to copy` : "Output"}
            </p>
            <div className="flex items-center gap-1.5">
              <AiCopyButton variant="outline" size="sm" label="Copy all" value={() => batch.join("\n")} className="bg-panel" />
              <button
                type="button"
                onClick={() => setBatch([])}
                aria-label="Clear output"
                className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          {batch.length === 0 ? (
            <p className="mt-6 text-center text-[13px] text-ink3">Hit Generate — everything stays in this tab.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[12px] border border-line">
              {batch.map((pw, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(pw)}
                    title="Copy"
                    className="block w-full break-all bg-panel px-3 py-2 text-left font-mono text-[12.5px] leading-relaxed text-ink transition-colors hover:bg-sunken/60"
                  >
                    {pw}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        crypto.getRandomValues · rejection sampled · never leaves this tab
      </p>
    </div>
  );
}
