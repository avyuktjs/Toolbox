"use client";

import { useMemo, useState } from "react";
import { Plus, X, Layers } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ColorWell } from "@/components/ui/color-picker";

interface Layer {
  id: number;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string; // hex
  alpha: number; // 0–1
  inset: boolean;
}

let layerId = 0;
const nextLayerId = () => ++layerId;
const newLayer = (): Layer => ({ id: nextLayerId(), x: 0, y: 12, blur: 32, spread: -8, color: "#0f172a", alpha: 0.35, inset: false });

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function layerCss(l: Layer): string {
  return `${l.inset ? "inset " : ""}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${hexToRgba(l.color, Math.round(l.alpha * 100) / 100)}`;
}

export function ShadowTool() {
  const [layers, setLayers] = useState<Layer[]>([newLayer()]);
  const [radius, setRadius] = useState(18);
  const [dark, setDark] = useState(false);

  const css = useMemo(() => layers.map(layerCss).join(",\n    "), [layers]);
  const declaration = `box-shadow:\n    ${css};\nborder-radius: ${radius}px;`;
  const previewShadow = layers.map(layerCss).join(", ");

  const update = (id: number, patch: Partial<Layer>) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: number) => setLayers((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* preview stage */}
      <div
        className={cn(
          "flex h-56 items-center justify-center border-b border-line transition-colors sm:h-64",
          dark ? "bg-[#101318]" : "bg-[#e8e6e1]",
        )}
        style={{ backgroundImage: dark
          ? "radial-gradient(circle at 30% 20%, #1c2230 0%, transparent 60%)"
          : "radial-gradient(circle at 30% 20%, #f4f2ed 0%, transparent 60%)" }}
      >
        <div
          aria-hidden
          className={cn(
            "flex h-28 w-44 flex-col items-center justify-center gap-1 sm:h-32 sm:w-52",
            dark ? "bg-[#1d212b]" : "bg-white",
          )}
          style={{ boxShadow: previewShadow, borderRadius: radius }}
        >
          <span className={cn("font-mono text-[10px] uppercase tracking-[0.22em]", dark ? "text-slate-500" : "text-slate-400")}>
            box-shadow
          </span>
          <span className={cn("text-[15px] font-semibold", dark ? "text-slate-200" : "text-slate-700")}>
            {layers.length} layer{layers.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-1.5">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          {layers.length} layer{layers.length === 1 ? "" : "s"} · radius {radius}px
        </p>
        <button
          type="button"
          onClick={() => setDark((v) => !v)}
          className="h-7 rounded-[7px] border border-line2 bg-sunken px-2 text-[10.5px] font-semibold text-ink2 transition-colors hover:text-ink"
        >
          {dark ? "Light stage" : "Dark stage"}
        </button>
      </div>

      <div className="grid md:grid-cols-[1.4fr_1fr]">
        {/* layers */}
        <div className="border-b border-line p-4 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink2">
              <Layers className="size-4" aria-hidden /> Layers
            </p>
            <button
              type="button"
              onClick={() => setLayers((prev) => [...prev, newLayer()])}
              className="flex h-7 items-center gap-1 rounded-[7px] border border-line2 bg-sunken px-2 text-[11px] font-semibold text-ink2 transition-colors hover:border-brand hover:text-ink"
            >
              <Plus className="size-3.5" aria-hidden /> Add layer
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {layers.map((layer, index) => (
              <div key={layer.id} className="rounded-[12px] border border-line bg-sunken/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold text-ink3">#{index + 1}</span>
                  <ColorWell
                    aria-label="Shadow color"
                    value={layer.color}
                    onChange={(color) => update(layer.id, { color: color.toString("hex") })}
                    wellClassName="size-7"
                  />
                  <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded-[6px] border border-line2 bg-sunken px-2 text-[11px] font-medium text-ink2">
                    <input
                      type="checkbox"
                      checked={layer.inset}
                      onChange={(e) => update(layer.id, { inset: e.target.checked })}
                      className="accent-[var(--brand,#1d43f2)]"
                    />
                    inset
                  </label>
                  <Slider
                    minValue={0}
                    maxValue={100}
                    value={Math.round(layer.alpha * 100)}
                    onChange={(v) => update(layer.id, { alpha: v / 100 })}
                    thumbLabel="Opacity"
                    aria-label="Opacity"
                    showTooltip={false}
                    className="h-7 min-w-0 flex-1"
                  />
                  <span className="w-8 text-right font-mono text-[10px] tabular-nums text-ink3">{Math.round(layer.alpha * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => remove(layer.id)}
                    aria-label="Remove layer"
                    className="grid size-7 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
                  {([
                    ["x", layer.x, -60, 60],
                    ["y", layer.y, -60, 60],
                    ["blur", layer.blur, 0, 120],
                    ["spread", layer.spread, -60, 60],
                  ] as const).map(([key, value, min, max]) => (
                    <div key={key} className="block">
                      <span className="flex items-baseline justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">
                        {key} <span className="tabular-nums text-ink2">{value}px</span>
                      </span>
                      <Slider
                        minValue={min}
                        maxValue={max}
                        value={value}
                        onChange={(v) => update(layer.id, { [key]: v } as Partial<Layer>)}
                        thumbLabel={key}
                        aria-label={key}
                        showTooltip={false}
                        className="mt-0.5"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-ink2">Border radius</span>
              <span className="font-mono text-[13px] tabular-nums text-ink">{radius}px</span>
            </div>
            <Slider minValue={0} maxValue={80} value={radius} onChange={setRadius} thumbLabel="Border radius" aria-label="Border radius" showTooltip={false} className="mt-1" />
          </div>
        </div>

        {/* output */}
        <div className="flex flex-col p-5">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">CSS</p>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-[10px] border border-line bg-sunken/50 p-4 font-mono text-[12px] leading-relaxed text-ink">
            {declaration}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <AiCopyButton variant="outline" size="sm" label="Copy CSS" value={() => declaration} className="bg-panel" />
            <AiCopyButton variant="outline" size="sm" label="Copy value only" value={() => layers.map(layerCss).join(", ")} className="bg-panel" />
          </div>
          <div className="mt-4 rounded-[10px] border border-line bg-sunken/40 p-3 text-[11px] leading-relaxed text-ink2">
            <p className="font-semibold text-ink">Why layers?</p>
            Real depth is rarely one shadow. A tight contact shadow plus one soft ambient shadow is the difference between “flat card” and “floating panel.”
          </div>
        </div>
      </div>
    </div>
  );
}
