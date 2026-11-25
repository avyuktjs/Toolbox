"use client";

import { useEffect, useMemo, useState } from "react";
import { Pipette, Trash2 } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { cn } from "@/lib/utils";
import { ColorWell } from "@/components/ui/color-picker";

/** one eased lightness curve — saturation and hue carry over from the base */
const STOPS: { name: string; l: number; sScale: number }[] = [
  { name: "50", l: 0.97, sScale: 0.28 },
  { name: "100", l: 0.93, sScale: 0.40 },
  { name: "200", l: 0.85, sScale: 0.54 },
  { name: "300", l: 0.74, sScale: 0.68 },
  { name: "400", l: 0.63, sScale: 0.84 },
  { name: "500", l: 0.53, sScale: 1.0 },
  { name: "600", l: 0.44, sScale: 0.98 },
  { name: "700", l: 0.36, sScale: 0.95 },
  { name: "800", l: 0.28, sScale: 0.90 },
  { name: "900", l: 0.21, sScale: 0.85 },
  { name: "950", l: 0.14, sScale: 0.78 },
];

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = 60 * (((g - b) / d) % 6);
    else if (max === g) hue = 60 * ((b - r) / d + 2);
    else hue = 60 * ((r - g) / d + 4);
  }
  return { h: (hue + 360) % 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = ch.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastWith(hex: string, other: string): number {
  const a = luminance(hex);
  const b = luminance(other);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

export function ShadesTool() {
  const [base, setBase] = useState("#2563eb");
  const [prefix, setPrefix] = useState("brand");
  const [copied, setCopied] = useState<string | null>(null);

  const hsl = hexToHsl(base);
  const shades = useMemo(() => {
    if (!hsl) return null;
    return STOPS.map((stop) => ({
      name: stop.name,
      hex: hslToHex(hsl.h, Math.min(1, hsl.s * stop.sScale), stop.l),
    }));
  }, [hsl]);

  const cssVars = shades
    ? `--${prefix || "color"}-50: ${shades[0].hex};\n` +
      shades.slice(1).map((s) => `--${prefix || "color"}-${s.name}: ${s.hex};`).join("\n")
    : "";
  const jsonOut = shades ? `{\n${shades.map((s) => `  "${s.name}": "${s.hex}"`).join(",\n")}\n}` : "";
  const tailwindOut = shades
    ? `@theme {\n${shades.map((s) => `  --color-${prefix || "brand"}-${s.name}: ${s.hex};`).join("\n")}\n}`
    : "";

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* input bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-sunken/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <ColorWell
            aria-label="Base color"
            value={hsl ? base : "#2563eb"}
            onChange={(color) => setBase(color.toString("hex"))}
            wellClassName="size-11"
          />
          <input
            value={base}
            onChange={(e) => setBase(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            aria-label="Base hex"
            className={cn(
              "h-11 w-32 rounded-[8px] border bg-panel px-3 font-mono text-[14px] text-ink outline-none focus:border-brand",
              hsl ? "border-line2" : "border-red-400",
            )}
          />
        </div>
        <label className="flex h-11 items-center gap-2 rounded-[8px] border border-line2 bg-panel px-3 text-[12px] font-medium text-ink2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">prefix</span>
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.replace(/[^a-z0-9-]/gi, ""))}
            spellCheck={false}
            aria-label="Variable prefix"
            className="h-7 w-24 bg-transparent font-mono text-[12px] text-ink outline-none"
          />
        </label>
        {!hsl ? <p role="alert" className="font-mono text-[11px] text-red-500">Enter a valid #hex — 3 or 6 digits.</p> : null}
        <button
          type="button"
          onClick={() => setBase("#2563eb")}
          aria-label="Reset"
          className="ml-auto grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* swatch ladder */}
      {shades ? (
        <div className="grid grid-cols-11 border-b border-line">
          {shades.map((shade) => {
            const onWhite = contrastWith(shade.hex, "#ffffff");
            const onBlack = contrastWith(shade.hex, "#000000");
            const textOn = onWhite >= onBlack ? "#ffffff" : "#000000";
            return (
              <button
                key={shade.name}
                type="button"
                onClick={() => { void navigator.clipboard?.writeText(shade.hex); setCopied(shade.name); }}
                title={`Copy ${shade.hex}`}
                className="group flex h-36 flex-col items-center justify-between py-3 transition-transform hover:scale-[1.03] sm:h-44"
                style={{ backgroundColor: shade.hex }}
              >
                <span className="font-mono text-[10px] font-bold" style={{ color: textOn }}>
                  {shade.name}
                </span>
                <span className="font-mono text-[8px] sm:text-[9px]" style={{ color: textOn }}>
                  {copied === shade.name ? "copied ✓" : shade.hex}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid h-36 place-items-center text-[13px] text-ink3">Fix the hex above to see the ladder.</div>
      )}

      {/* export formats */}
      {shades ? (
        <div className="grid md:grid-cols-3">
          {[
            { title: "CSS variables", body: cssVars, label: "Copy CSS vars" },
            { title: "Tailwind v4 @theme", body: tailwindOut, label: "Copy @theme" },
            { title: "JSON", body: jsonOut, label: "Copy JSON" },
          ].map((block, i) => (
            <div key={block.title} className={`border-line p-4 ${i > 0 ? "border-t md:border-l md:border-t-0" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">{block.title}</p>
                <AiCopyButton variant="ghost" size="sm" label={block.label} value={() => block.body} iconOnly />
              </div>
              <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded-[8px] border border-line bg-sunken/40 p-3 font-mono text-[10.5px] leading-relaxed text-ink2">
                {block.body}
              </pre>
            </div>
          ))}
        </div>
      ) : null}

      <p className="flex items-center gap-2 border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        <Pipette className="size-3" aria-hidden /> HSL lightness ladder · click any swatch to copy
      </p>
    </div>
  );
}
