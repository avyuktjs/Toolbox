"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { cn } from "@/lib/utils";
import { ColorWell } from "@/components/ui/color-picker";

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb | null {
  const m = hex.trim().replace(/^#/, "");
  if (m.length === 3) {
    const [r, g, b] = m.split("").map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  if (m.length !== 6 || /[^0-9a-fA-F]/.test(m)) return null;
  const n = Number.parseInt(m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
const ratio = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const hexOf = (rgb: Rgb) =>
  `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

export function ContrastTool() {
  const [fg, setFg] = useState("#1D1D1F");
  const [bg, setBg] = useState("#FBFBFD");
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const valid = fgRgb !== null && bgRgb !== null;
  const value = valid ? ratio(fgRgb, bgRgb) : null;

  const checks =
    value === null
      ? []
      : [
          { label: "AA — normal text", pass: value >= 4.5, need: "4.5" },
          { label: "AA — large text", pass: value >= 3, need: "3.0" },
          { label: "AAA — normal text", pass: value >= 7, need: "7.0" },
          { label: "AAA — large text", pass: value >= 4.5, need: "4.5" },
          { label: "AA — graphics & UI", pass: value >= 3, need: "3.0" },
        ];

  const previewFg = fgRgb ? hexOf(fgRgb) : fg;
  const previewBg = bgRgb ? hexOf(bgRgb) : bg;

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="grid sm:grid-cols-2">
        {([
          { label: "Text", value: fg, set: setFg, rgb: fgRgb },
          { label: "Background", value: bg, set: setBg, rgb: bgRgb },
        ] as const).map(({ label, value: v, set, rgb }) => (
          <div key={label} className="flex items-center gap-3 border-b border-line p-4 max-sm:last:border-b-0 sm:border-r sm:last:border-r-0">
            <ColorWell
              aria-label={`${label} color`}
              value={rgb ? hexOf(rgb).toLowerCase() : "#000000"}
              onChange={(color) => set(color.toString("hex"))}
              wellClassName="size-12 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
                {label}
              </p>
              <span className="mt-0.5 flex items-center gap-1.5">
                <input
                  value={v}
                  onChange={(e) => set(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  aria-label={`${label} hex value`}
                  className={cn(
                    "h-8 w-full min-w-0 rounded-[8px] border bg-sunken/50 px-2 py-1 font-mono text-[13px] uppercase text-ink outline-none",
                    rgb ? "border-line" : "border-danger",
                  )}
                />
                <AiCopyButton variant="ghost" size="sm" iconOnly label={`Copy ${label.toLowerCase()}`} value={v} className="size-7 shrink-0" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* preview */}
      <div
        className="border-b border-line px-5 py-6 text-center transition-colors duration-150"
        style={{ background: previewBg, color: previewFg }}
      >
        <p className="text-3xl font-semibold tracking-[-0.02em]">Aa</p>
        <p className="mt-1 text-sm">The quick brown fox jumps over the lazy dog.</p>
        <p className="mt-0.5 text-[11px] opacity-80">0123456789 — contrast is the whole point.</p>
      </div>

      {/* verdicts */}
      <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="font-display text-5xl font-semibold leading-none tracking-[-0.03em] text-ink">
            {value === null ? "—" : value.toFixed(2)}
            <span className="text-lg text-ink3">:1</span>
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-ink3">Contrast ratio</p>
        </div>
        <ul className="grid w-full max-w-xs grid-cols-1 gap-1.5">
          {checks.map(({ label, pass, need }) => (
            <li
              key={label}
              className={cn(
                "flex items-center justify-between rounded-[9px] border px-3 py-1.5 text-[11px] font-medium",
                pass ? "border-ok/30 bg-ok-soft text-ok" : "border-danger/30 bg-danger-soft text-danger",
              )}
            >
              <span>{label}</span>
              <span className="flex items-center gap-1.5 font-mono text-[9px]">
                {need}+
                {pass ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
