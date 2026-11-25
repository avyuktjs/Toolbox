"use client";

import { useMemo, useState } from "react";
import { Download, Image as ImageIcon, Trash2 } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ColorWell } from "@/components/ui/color-picker";

type BgStyle = "solid" | "diagram";

const SIZES = [
  { label: "300×250", w: 300, h: 250 },
  { label: "728×90", w: 728, h: 90 },
  { label: "1200×630", w: 1200, h: 630 },
  { label: "1080×1080", w: 1080, h: 1080 },
  { label: "1920×1080", w: 1920, h: 1080 },
] as const;

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = ch.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function PlaceholderTool() {
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(450);
  const [background, setBackground] = useState("#e5e7eb");
  const [foreground, setForeground] = useState("#374151");
  const [label, setLabel] = useState("");
  const [style, setStyle] = useState<BgStyle>("diagram");
  const [quality, setQuality] = useState(90);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  /** Render straight into a data URL — pure derivation, no state churn. */
  const preview = useMemo(() => {
    if (typeof document === "undefined") return null;
    const w = Math.min(4000, Math.max(8, width || 8));
    const h = Math.min(4000, Math.max(8, height || 8));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // backdrop
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    if (style === "diagram") {
      const fg = luminance(background) > 0.45 ? "rgba(15, 23, 42, 0.10)" : "rgba(255, 255, 255, 0.10)";
      ctx.strokeStyle = fg;
      ctx.lineWidth = Math.max(1, Math.round(Math.min(w, h) / 250));
      const step = Math.max(40, Math.round(Math.min(w, h) / 12));
      for (let x = step; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    // label
    const text = label.trim() || `${w} × ${h}`;
    const fontSize = Math.max(12, Math.min(w, h) / 9);
    ctx.fillStyle = foreground;
    ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.slice(0, 64), w / 2, h / 2, w * 0.92);
    try {
      const url = canvas.toDataURL(format === "png" ? "image/png" : "image/jpeg", quality / 100);
      // bytes ≈ base64 payload × 3/4
      const bytes = Math.round(((url.length - (url.indexOf(",") + 1)) * 3) / 4);
      return { url, bytes, w, h };
    } catch {
      return null;
    }
  }, [width, height, background, foreground, label, style, format, quality]);

  const download = () => {
    if (!preview) return;
    const a = document.createElement("a");
    a.download = `placeholder-${preview.w}x${preview.h}.${format === "png" ? "png" : "jpg"}`;
    a.href = preview.url;
    a.click();
  };

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* preview */}
      <div className="grid place-items-center border-b border-line bg-[repeating-conic-gradient(#00000010_0%_25%,transparent_0%_50%)] bg-[length:24px_24px] p-4 sm:p-6">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url}
            alt={`Placeholder preview — ${width} by ${height}`}
            className="max-h-80 max-w-full rounded-[6px] border border-line2 shadow-sm"
          />
        ) : null}
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink3">
          {preview?.w}×{preview?.h} · {format.toUpperCase()}{preview ? ` · ~${formatBytes(preview.bytes)}` : ""}
        </p>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-sunken/40 px-4 py-2">
        {SIZES.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => { setWidth(s.w); setHeight(s.h); }}
            className="h-8 rounded-[8px] border border-line2 bg-sunken px-2.5 font-mono text-[11.5px] text-ink2 transition-colors hover:border-brand hover:text-ink"
          >
            {s.label}
          </button>
        ))}
        <Segmented
          ariaLabel="Background style"
          size="sm"
          value={style}
          onChange={setStyle}
          options={[{ value: "diagram", label: "Blueprint" }, { value: "solid", label: "Solid" }]}
          className="ml-auto"
        />
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        <label className="block">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Width (px)</span>
          <input
            type="number" min={8} max={4000} value={width}
            onChange={(e) => setWidth(Math.min(4000, Math.max(8, Number(e.target.value) || 8)))}
            className="mt-1 h-10 w-full rounded-[8px] border border-line2 bg-sunken px-3 font-mono text-[13px] text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Height (px)</span>
          <input
            type="number" min={8} max={4000} value={height}
            onChange={(e) => setHeight(Math.min(4000, Math.max(8, Number(e.target.value) || 8)))}
            className="mt-1 h-10 w-full rounded-[8px] border border-line2 bg-sunken px-3 font-mono text-[13px] text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Backdrop</span>
          <ColorWell aria-label="Backdrop color" value={background} onChange={(color) => setBackground(color.toString("hex"))} wellClassName="mt-1 size-10" placement="bottom start" />
        </label>
        <label className="block">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Foreground</span>
          <ColorWell aria-label="Foreground color" value={foreground} onChange={(color) => setForeground(color.toString("hex"))} wellClassName="mt-1 size-10" placement="bottom start" />
        </label>
        <label className="block sm:col-span-2">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Label (empty = dimensions)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={`${width} × ${height}`}
            spellCheck={false}
            className="mt-1 h-10 w-full rounded-[8px] border border-line2 bg-sunken px-3 font-mono text-[13px] text-ink outline-none placeholder:text-ink3 focus:border-brand"
          />
        </label>
        <div className="flex items-end gap-2">
          <Segmented
            ariaLabel="Format"
            size="sm"
            value={format}
            onChange={setFormat}
            options={[{ value: "png", label: "PNG" }, { value: "jpeg", label: "JPEG" }]}
          />
          {format === "jpeg" ? (
            <div className="flex h-8 items-center gap-2 font-mono text-[11px] text-ink2">
              q{quality}
              <Slider minValue={40} maxValue={100} value={quality} onChange={setQuality} thumbLabel="JPEG quality" aria-label="JPEG quality" showTooltip={false} className="w-20" />
            </div>
          ) : null}
        </div>
        <div className="flex items-end justify-end gap-1.5">
          <button
            type="button"
            onClick={() => { setLabel(""); setBackground("#e5e7eb"); setForeground("#374151"); setStyle("diagram"); }}
            aria-label="Reset"
            className={cn("grid size-10 place-items-center rounded-[8px] border border-line2 text-ink3 transition-colors hover:text-ink")}
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={download}
            className="flex h-10 items-center gap-1.5 rounded-[8px] bg-brand px-4 text-[13px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <Download className="size-4" aria-hidden /> Download
          </button>
        </div>
      </div>

      <p className="flex items-center gap-2 border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        <ImageIcon className="size-3" aria-hidden /> Canvas-rendered in this tab · nothing uploaded, ever
      </p>
    </div>
  );
}
