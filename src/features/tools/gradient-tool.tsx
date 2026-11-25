"use client";

import { useMemo, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { AiCopyButton } from "@/components/ai-copy-button";
import { ColorWell } from "@/components/ui/color-picker";
import { Slider } from "@/components/ui/slider";

type GradientType = "linear" | "radial" | "conic";
interface Stop { id: number; color: string; position: number }

let stopId = 0;
const nextStopId = () => ++stopId;

const PRESETS: { label: string; type: GradientType; angle: number; stops: [string, number][] }[] = [
  { label: "Sunrise", type: "linear", angle: 135, stops: [["#ff9a5a", 0], ["#ff5fa2", 100]] },
  { label: "Ocean", type: "linear", angle: 160, stops: [["#0ea5e9", 0], ["#1e3a8a", 100]] },
  { label: "Matcha", type: "linear", angle: 120, stops: [["#d9f99d", 0], ["#166534", 100]] },
  { label: "Grape", type: "linear", angle: 150, stops: [["#c084fc", 0], ["#581c87", 100]] },
  { label: "Steel", type: "linear", angle: 180, stops: [["#e2e8f0", 0], ["#475569", 100]] },
  { label: "Disco", type: "conic", angle: 0, stops: [["#f43f5e", 0], ["#facc15", 25], ["#22c55e", 50], ["#3b82f6", 75], ["#f43f5e", 100]] },
];

function cssFor(type: GradientType, angle: number, stops: Stop[]): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const list = sorted.map((s) => `${s.color} ${s.position}%`).join(", ");
  if (type === "linear") return `linear-gradient(${angle}deg, ${list})`;
  if (type === "radial") return `radial-gradient(circle at center, ${list})`;
  return `conic-gradient(from ${angle}deg at center, ${list})`;
}

export function GradientTool() {
  const [type, setType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<Stop[]>([
    { id: nextStopId(), color: "#ff9a5a", position: 0 },
    { id: nextStopId(), color: "#ff5fa2", position: 100 },
  ]);

  const css = useMemo(() => cssFor(type, angle, stops), [type, angle, stops]);
  const declaration = `background: ${css};`;

  const updateStop = (id: number, patch: Partial<Stop>) =>
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeStop = (id: number) =>
    setStops((prev) => (prev.length > 2 ? prev.filter((s) => s.id !== id) : prev));
  const addStop = () =>
    setStops((prev) => {
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      const mid = Math.round((sorted[0].position + sorted[sorted.length - 1].position) / 2);
      return [...prev, { id: nextStopId(), color: "#a78bfa", position: mid }];
    });

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* presets */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-sunken/40 px-4 py-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setType(p.type);
              setAngle(p.angle);
              setStops(p.stops.map(([color, position]) => ({ id: nextStopId(), color, position })));
            }}
            className="h-8 rounded-[8px] border border-line2 bg-sunken px-2.5 text-[11.5px] font-medium text-ink2 transition-colors hover:border-brand hover:text-ink"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStops([{ id: nextStopId(), color: "#111827", position: 0 }, { id: nextStopId(), color: "#f9fafb", position: 100 }])}
          aria-label="Reset to black and white"
          className="ml-auto grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* preview */}
      <div
        aria-label="Gradient preview"
        role="img"
        className="h-44 w-full border-b border-line sm:h-56"
        style={{ background: css }}
      />

      <div className="grid md:grid-cols-[1fr_1.2fr]">
        {/* controls */}
        <div className="border-b border-line p-5 md:border-b-0 md:border-r">
          <Segmented
            ariaLabel="Gradient type"
            size="sm"
            value={type}
            onChange={setType}
            options={[
              { value: "linear", label: "Linear" },
              { value: "radial", label: "Radial" },
              { value: "conic", label: "Conic" },
            ]}
          />

          {type !== "radial" ? (
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold text-ink2">
                  {type === "linear" ? "Angle" : "Start angle"}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-ink">{angle}°</span>
              </div>
              <Slider minValue={0} maxValue={360} value={angle} onChange={setAngle} thumbLabel="Angle" aria-label="Angle" showTooltip={false} className="mt-1.5" />
            </div>
          ) : null}

          {/* stops */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-ink2">Color stops</p>
              <button
                type="button"
                onClick={addStop}
                className="flex h-7 items-center gap-1 rounded-[7px] border border-line2 bg-sunken px-2 text-[11px] font-semibold text-ink2 transition-colors hover:border-brand hover:text-ink"
              >
                <Plus className="size-3.5" aria-hidden /> Add stop
              </button>
            </div>
            {[...stops].sort((a, b) => a.position - b.position).map((stop) => (
              <div key={stop.id} className="flex items-center gap-2">
                <ColorWell
                  aria-label="Stop color"
                  value={stop.color}
                  onChange={(color) => updateStop(stop.id, { color: color.toString("hex") })}
                  wellClassName="size-9"
                />
                <input
                  value={stop.color}
                  onChange={(e) => updateStop(stop.id, { color: e.target.value })}
                  spellCheck={false}
                  aria-label="Stop hex"
                  className="h-9 w-24 rounded-[7px] border border-line2 bg-sunken px-2 font-mono text-[12px] text-ink outline-none focus:border-brand"
                />
                <Slider
                  minValue={0}
                  maxValue={100}
                  value={stop.position}
                  onChange={(v) => updateStop(stop.id, { position: v })}
                  thumbLabel="Stop position"
                  aria-label="Stop position"
                  showTooltip={false}
                  className="h-9 min-w-0 flex-1"
                />
                <span className="w-10 text-right font-mono text-[11px] tabular-nums text-ink2">{stop.position}%</span>
                <button
                  type="button"
                  onClick={() => removeStop(stop.id)}
                  aria-label="Remove stop"
                  className="grid size-7 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* output */}
        <div className="flex flex-col p-5">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">CSS</p>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all rounded-[10px] border border-line bg-sunken/50 p-4 font-mono text-[12.5px] leading-relaxed text-ink">
            {declaration}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <AiCopyButton variant="outline" size="sm" label="Copy CSS" value={() => declaration} className="bg-panel" />
            <AiCopyButton variant="outline" size="sm" label="Copy value only" value={() => css} className="bg-panel" />
            <AiCopyButton variant="outline" size="sm" label="Copy Tailwind bg-[...]" value={() => `bg-[${css}]`} className="bg-panel" />
          </div>
          <p className="mt-auto pt-4 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
            Pure CSS — no image assets, no vendor prefixes needed
          </p>
        </div>
      </div>
    </div>
  );
}
