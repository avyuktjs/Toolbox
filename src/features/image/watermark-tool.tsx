"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileArchive,
  Type,
  Stamp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Segmented } from "@/components/ui/segmented";
import { ImageDropzone } from "./image-dropzone";
import { loadImage } from "@/lib/download";
import { downloadBlob } from "@/lib/download";
import { formatBytes, sanitizeFilename } from "@/lib/format";
import { zipSync } from "fflate";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ColorWell } from "@/components/ui/color-picker";

type Position = "tl" | "tc" | "tr" | "cl" | "cc" | "cr" | "bl" | "bc" | "br";
const POSITIONS: Position[] = ["tl", "tc", "tr", "cl", "cc", "cr", "bl", "bc", "br"];
const MAX_FILES = 30;
const MAX_BYTES = 25 * 1024 * 1024;
const FONT_STACK = '700 {px}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

interface LoadedItem {
  id: string;
  name: string;
  size: number;
  url: string;
  img: HTMLImageElement;
}
let wmId = 0;
const nextId = () => `wm-${++wmId}-${Date.now().toString(36)}`;

export function WatermarkTool() {
  const [items, setItems] = useState<LoadedItem[]>([]);
  const [mode, setMode] = useState<"text" | "logo">("text");
  const [text, setText] = useState("© your-name");
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [logoName, setLogoName] = useState("");
  const [scalePct, setScalePct] = useState(text ? 8 : 18);
  const [opacity, setOpacity] = useState(0.6);
  const [position, setPosition] = useState<Position>("br");
  const [tiled, setTiled] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /* release object URLs on unmount / removal */
  useEffect(() => () => items.forEach((it) => URL.revokeObjectURL(it.url)), [items]);

  const onFiles = useCallback(async (files: File[]) => {
    const room = MAX_FILES - items.length;
    const accepted = files.slice(0, Math.max(0, room)).filter((f) => f.type.startsWith("image/") || /\.(bmp|svg)$/i.test(f.name));
    if (accepted.length < files.length) toast.message("Some files skipped", { description: `Room for ${MAX_FILES} images at a time — and images only.` });
    for (const file of accepted) {
      if (file.size > MAX_BYTES) { toast.error("Too big", { description: `“${file.name}” — up to 25 MB.` }); continue; }
      try {
        const img = await loadImage(file);
        setItems((prev) => [...prev, { id: nextId(), name: file.name, size: file.size, url: URL.createObjectURL(file), img }]);
      } catch {
        toast.error("Couldn't read it", { description: `“${file.name}” failed to decode.` });
      }
    }
  }, [items.length]);

  const onLogoFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const img = await loadImage(file);
      setLogo(img);
      setLogoName(file.name);
    } catch {
      toast.error("Couldn't read that logo", { description: "Try PNG or SVG with transparency." });
    }
  };

  /** Render one source image with the watermark burned in. */
  const render = useCallback((item: LoadedItem): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = item.img.naturalWidth;
    canvas.height = item.img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(item.img, 0, 0);
    ctx.globalAlpha = opacity;

    const stampOnce = (cx: number, cy: number) => {
      if (mode === "text") {
        const px = Math.max(10, Math.round((scalePct / 100) * canvas.width));
        ctx.font = FONT_STACK.replace("{px}", String(px));
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // subtle shadow for legibility on any backdrop
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = Math.round(px / 6);
        ctx.fillText(text || " ", cx, cy);
        ctx.shadowBlur = 0;
      } else if (logo) {
        const w = Math.max(16, Math.round((scalePct / 100) * canvas.width));
        const h = Math.max(1, Math.round((w * logo.naturalHeight) / logo.naturalWidth));
        ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
      }
    };

    if (tiled) {
      const stepX = canvas.width / 4;
      const stepY = canvas.height / Math.max(1, Math.round(canvas.height / stepX));
      for (let y = stepY / 2; y < canvas.height; y += stepY) {
        for (let x = stepX / 2; x < canvas.width; x += stepX) stampOnce(x, y);
      }
    } else {
      const inset = Math.round(Math.min(canvas.width, canvas.height) * 0.04);
      const x = position.includes("l") ? inset : position.includes("r") ? canvas.width - inset : canvas.width / 2;
      const y = position.startsWith("t") ? inset : position.startsWith("b") ? canvas.height - inset : canvas.height / 2;
      stampOnce(x, y);
    }
    ctx.globalAlpha = 1;
    return canvas;
  }, [mode, text, logo, scalePct, opacity, position, tiled, color]);

  const encode = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/png");
    });

  const downloadOneByOne = async () => {
    if (items.length === 0) return;
    setBusy(true);
    try {
      for (const item of items) {
        const blob = await encode(render(item));
        downloadBlob(blob, `${sanitizeFilename(item.name.replace(/\.[^.]+$/, ""))}-watermarked.png`);
      }
      toast.success(`Saved ${items.length} watermarked image${items.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error("Export failed", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  const downloadZip = async () => {
    if (items.length === 0) return;
    setBusy(true);
    try {
      const entries: Record<string, Uint8Array> = {};
      const usedNames = new Set<string>();
      for (const item of items) {
        const blob = await encode(render(item));
        let name = `${sanitizeFilename(item.name.replace(/\.[^.]+$/, ""))}-watermarked.png`;
        let n = 2;
        while (usedNames.has(name)) {
          name = `${sanitizeFilename(item.name.replace(/\.[^.]+$/, ""))}-watermarked-${n}.png`;
          n += 1;
        }
        usedNames.add(name);
        entries[name] = new Uint8Array(await blob.arrayBuffer());
      }
      const zipped = zipSync(entries, { level: 6 });
      downloadBlob(new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" }), "watermarked.zip");
      toast.success(`Zipped ${items.length} image${items.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error("Zip failed", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  if (items.length === 0) {
    return (
      <ImageDropzone
        multiple
        onFiles={onFiles}
        title="Drop images to watermark"
        hint="Batch-stamp a signature, © line or logo across a whole set — text or image, corner or tiled, then download one by one or as a zip."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      {/* file list */}
      <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
        <p className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          {items.length} image{items.length === 1 ? "" : "s"} queued
          <button type="button" onClick={() => setItems([])} className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent-ink hover:underline underline-offset-4">Clear all</button>
        </p>
        <ul className="max-h-96 divide-y divide-line overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="size-12 shrink-0 rounded-[8px] border border-line object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-ink" title={item.name}>{item.name}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">
                  {item.img.naturalWidth}×{item.img.naturalHeight} · {formatBytes(item.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => { URL.revokeObjectURL(item.url); setItems((prev) => prev.filter((p) => p.id !== item.id)); }}
                aria-label={`Remove ${item.name}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => document.querySelector<HTMLInputElement>("#wm-add-more")?.click()}
          className="flex h-10 w-full items-center justify-center gap-2 border-t border-line text-[12px] font-medium text-ink2 transition-colors hover:text-ink"
        >
          Add more images
        </button>
        <input
          id="wm-add-more"
          type="file"
          multiple
          accept="image/*,.bmp,.svg"
          className="sr-only"
          aria-hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            if (files.length) void onFiles(files);
            e.target.value = "";
          }}
        />
      </div>

      {/* settings */}
      <div className="soft-shadow flex flex-col gap-4 rounded-[18px] border border-line bg-panel p-4 sm:p-5">
        <Segmented
          ariaLabel="Watermark type"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "text", label: "Text stamp", icon: <Type className="size-3.5" /> },
            { value: "logo", label: "Logo stamp", icon: <Stamp className="size-3.5" /> },
          ]}
        />

        {mode === "text" ? (
          <label className="block">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Text</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="© your-name"
              spellCheck={false}
              className="mt-1 h-11 w-full rounded-[8px] border border-line2 bg-sunken px-3 text-[14px] text-ink outline-none focus:border-brand"
            />
          </label>
        ) : (
          <div>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Logo</span>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="mt-1 flex h-16 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-line2 text-[12px] font-medium text-ink2 transition-colors hover:border-brand hover:text-ink"
            >
              {logo ? `${logoName} — click to replace` : "Choose logo… (PNG with transparency works best)"}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-hidden
              onChange={(e) => { void onLogoFile(e.target.files?.[0]); e.target.value = ""; }}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="block">
            <span className="flex items-baseline justify-between font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
              Size <span className="tabular-nums text-ink2">{scalePct}% of width</span>
            </span>
            <Slider minValue={2} maxValue={60} value={scalePct} onChange={setScalePct} thumbLabel="Size" aria-label="Size" showTooltip={false} className="mt-1" />
          </div>
          <div className="block">
            <span className="flex items-baseline justify-between font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
              Opacity <span className="tabular-nums text-ink2">{Math.round(opacity * 100)}%</span>
            </span>
            <Slider minValue={5} maxValue={100} value={Math.round(opacity * 100)} onChange={(v) => setOpacity(v / 100)} thumbLabel="Opacity" aria-label="Opacity" showTooltip={false} className="mt-1" />
          </div>
        </div>

        {mode === "text" ? (
          <label className="flex items-center gap-2 text-[12px] font-medium text-ink2">
            Ink
            <ColorWell aria-label="Ink color" value={color} onChange={(c) => setColor(c.toString("hex"))} wellClassName="size-9" />
          </label>
        ) : null}

        {/* position grid */}
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Placement</p>
          <div className="mt-1 flex items-start gap-4">
            <div className="grid grid-cols-3 gap-1">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={!tiled && position === p}
                  aria-label={`Place ${p}`}
                  onClick={() => { setPosition(p); setTiled(false); }}
                  className={cn(
                    "size-8 rounded-[6px] border transition-all",
                    !tiled && position === p
                      ? "border-brand bg-brand text-white shadow-[0_3px_10px_-3px_rgba(29,67,242,0.7)]"
                      : "border-line2 bg-sunken text-ink3 hover:text-ink",
                  )}
                >
                  <span className="mx-auto block size-1.5 rounded-full bg-current" />
                </button>
              ))}
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={tiled}
              onClick={() => setTiled((v) => !v)}
              className="flex h-8 items-center gap-1.5 self-center rounded-[8px] border border-line2 bg-sunken px-3 text-[12px] font-medium text-ink2 transition-colors aria-checked:border-brand aria-checked:text-accent-ink"
            >
              <span className="font-mono">{tiled ? "✓" : ""}</span> Tile across whole image
            </button>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={downloadOneByOne}
            disabled={busy}
            className="flex h-10 items-center gap-1.5 rounded-[9px] border border-line2 bg-sunken px-4 text-[12.5px] font-semibold text-ink2 transition-colors hover:border-brand hover:text-ink disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden /> Save each
          </button>
          <button
            type="button"
            onClick={downloadZip}
            disabled={busy}
            className="flex h-10 items-center gap-1.5 rounded-[9px] bg-brand px-4 text-[12.5px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
          >
            <FileArchive className="size-4" aria-hidden />
            {busy ? "Burning in…" : "Download zip"}
          </button>
        </div>
      </div>
    </div>
  );
}
