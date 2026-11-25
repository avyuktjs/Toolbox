"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Grid3x3,
  RotateCcw,
  Trash2,
  Crop as CropIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Segmented } from "@/components/ui/segmented";
import { AiCopyButton } from "@/components/ai-copy-button";
import { ImageDropzone } from "./image-dropzone";
import { blobFromCanvas, downloadBlob, loadImage } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

type AspectId = "free" | "original" | "1:1" | "4:5" | "3:2" | "4:3" | "5:4" | "16:9" | "9:16" | "passport";

const ASPECTS: { id: AspectId; label: string; ratio: number | "original" | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "original", label: "Original", ratio: "original" },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "5:4", label: "5:4", ratio: 5 / 4 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "passport", label: "Passport 35×45", ratio: 35 / 45 },
];

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_W = 660;
const MAX_H = 460;

interface Rect { x: number; y: number; w: number; h: number }
type DragHandle = "nw" | "ne" | "sw" | "se" | "move" | "draw" | null;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function CropTool() {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgMeta, setImgMeta] = useState<{ name: string; size: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [aspectId, setAspectId] = useState<AspectId>("free");
  const [grid, setGrid] = useState(true);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ handle: DragHandle; startX: number; startY: number; origin: Rect } | null>(null);

  const ratio = (() => {
    const a = ASPECTS.find((x) => x.id === aspectId);
    if (!a || a.ratio === null) return null;
    if (a.ratio === "original") return img ? img.width / img.height : null;
    return a.ratio;
  })();

  const scale = img ? Math.min(MAX_W / img.width, MAX_H / img.height) : 1;
  const dispW = img ? Math.round(img.width * scale) : 0;
  const dispH = img ? Math.round(img.height * scale) : 0;

  /* ── load the file ── */
  const onFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(bmp|svg)$/i.test(file.name)) {
      toast.error("Not an image", { description: `“${file.name}” isn't an image Toolbox reads.` });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Too big", { description: "Up to 25 MB per image." });
      return;
    }
    try {
      const image = await loadImage(file);
      setImg(image);
      setImgMeta({ name: file.name, size: file.size });
      const side = Math.min(image.width, image.height);
      const w = clamp(Math.round(side * 0.8), 8, image.width);
      const h = clamp(Math.round(side * 0.8), 8, image.height);
      setRect({ x: Math.floor((image.width - w) / 2), y: Math.floor((image.height - h) / 2), w, h });
    } catch (error) {
      toast.error("Couldn't read it", { description: error instanceof Error ? error.message : "That image failed to decode." });
    }
  }, []);

  /* ── draw the canvas: image + dim + frame + handles ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    canvas.width = dispW;
    canvas.height = dispH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(img, 0, 0, dispW, dispH);
    if (!rect) {
      ctx.fillStyle = "rgba(8, 10, 16, 0.55)";
      ctx.fillRect(0, 0, dispW, dispH);
      return;
    }

    const rx = rect.x * scale;
    const ry = rect.y * scale;
    const rw = rect.w * scale;
    const rh = rect.h * scale;

    // dim everything outside the crop
    ctx.fillStyle = "rgba(8, 10, 16, 0.55)";
    ctx.fillRect(0, 0, dispW, ry);
    ctx.fillRect(0, ry + rh, dispW, dispH - (ry + rh));
    ctx.fillRect(0, ry, rx, rh);
    ctx.fillRect(rx + rw, ry, dispW - (rx + rw), rh);

    // thirds grid
    if (grid) {
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      for (const t of [1 / 3, 2 / 3]) {
        ctx.beginPath(); ctx.moveTo(rx + rw * t, ry); ctx.lineTo(rx + rw * t, ry + rh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx, ry + rh * t); ctx.lineTo(rx + rw, ry + rh * t); ctx.stroke();
      }
    }

    // frame
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    // handles — corners always; edges only when free-form
    const handleSize = 11;
    const corners: { x: number; y: number }[] = [
      { x: rx, y: ry }, { x: rx + rw, y: ry }, { x: rx, y: ry + rh }, { x: rx + rw, y: ry + rh },
    ];
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(8,10,16,0.65)";
    ctx.lineWidth = 1.5;
    for (const c of corners) {
      ctx.beginPath();
      ctx.rect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    }
  }, [img, rect, dispW, dispH, scale, grid]);

  /* ── pointer handling ── */
  const toSource = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * dispW;
    const py = ((e.clientY - r.top) / r.height) * dispH;
    return { x: px / scale, y: py / scale };
  };

  const hitTest = (p: { x: number; y: number }): DragHandle => {
    if (!rect) return null;
    const hit = 14 / scale; // slop in source px
    const corners: { id: DragHandle; x: number; y: number }[] = [
      { id: "nw", x: rect.x, y: rect.y },
      { id: "ne", x: rect.x + rect.w, y: rect.y },
      { id: "sw", x: rect.x, y: rect.y + rect.h },
      { id: "se", x: rect.x + rect.w, y: rect.y + rect.h },
    ];
    for (const c of corners) {
      if (Math.abs(p.x - c.x) <= hit && Math.abs(p.y - c.y) <= hit) return c.id;
    }
    if (p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h) return "move";
    return null;
  };

  /** Enforce the locked aspect against a moving corner, anchored opposite. */
  const withAspect = (anchorX: number, anchorY: number, px: number, py: number, fixedRatio: number): Rect => {
    const dx = px - anchorX;
    const dy = py - anchorY;
    // pick the dominant axis so the box always contains the pointer direction
    let w = Math.abs(dx);
    let h = w / fixedRatio;
    if (h > Math.abs(dy)) {
      h = Math.abs(dy);
      w = h * fixedRatio;
    }
    const x = dx >= 0 ? anchorX : anchorX - w;
    const y = dy >= 0 ? anchorY : anchorY - h;
    return { x, y, w, h };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img || !rect) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = toSource(e);
    const handle = hitTest(p);
    if (handle) {
      dragRef.current = { handle, startX: p.x, startY: p.y, origin: { ...rect } };
    } else {
      // start drawing a brand-new rectangle
      dragRef.current = { handle: "draw", startX: p.x, startY: p.y, origin: { x: p.x, y: p.y, w: 0, h: 0 } };
      setRect({ x: p.x, y: p.y, w: 0, h: 0 });
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!img || !drag) return;
    const p = toSource(e);
    const clampP = { x: clamp(p.x, 0, img.width), y: clamp(p.y, 0, img.height) };

    if (drag.handle === "move") {
      const dx = clampP.x - drag.startX;
      const dy = clampP.y - drag.startY;
      setRect({
        ...drag.origin,
        x: clamp(drag.origin.x + dx, 0, img.width - drag.origin.w),
        y: clamp(drag.origin.y + dy, 0, img.height - drag.origin.h),
      });
      return;
    }

    const anchor = (() => {
      const o = drag.origin;
      if (drag.handle === "draw") return { x: drag.startX, y: drag.startY };
      switch (drag.handle) {
        case "nw": return { x: o.x + o.w, y: o.y + o.h };
        case "ne": return { x: o.x, y: o.y + o.h };
        case "sw": return { x: o.x + o.w, y: o.y };
        case "se": return { x: o.x, y: o.y };
        default: return { x: drag.startX, y: drag.startY };
      }
    })();

    if (ratio) {
      const next = withAspect(anchor.x, anchor.y, clampP.x, clampP.y, ratio);
      setRect({
        x: clamp(next.x, 0, img.width),
        y: clamp(next.y, 0, img.height),
        w: clamp(next.w, 1, img.width),
        h: clamp(next.h, 1, img.height),
      });
      return;
    }

    // free-form rect from anchor → pointer
    const x = clamp(Math.min(anchor.x, clampP.x), 0, img.width);
    const y = clamp(Math.min(anchor.y, clampP.y), 0, img.height);
    const w = clamp(Math.abs(clampP.x - anchor.x), 1, img.width - x);
    const h = clamp(Math.abs(clampP.y - anchor.y), 1, img.height - y);
    setRect({ x, y, w, h });
  };

  const onPointerUp = () => {
    dragRef.current = null;
    setRect((r) => (r && r.w >= 4 && r.h >= 4 ? r : null));
  };

  const resetToFull = () => {
    if (!img) return;
    setRect({ x: 0, y: 0, w: img.width, h: img.height });
  };

  /* ── export ── */
  const download = async () => {
    if (!img || !rect) return;
    setBusy(true);
    try {
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(rect.w));
      out.height = Math.max(1, Math.round(rect.h));
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      if (format === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, out.width, out.height);
      const mime = format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp";
      const blob = await blobFromCanvas(out, mime, format === "png" ? undefined : quality / 100);
      if (!blob) throw new Error("encode failed");
      const base = (imgMeta?.name ?? "crop").replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${base}-crop-${out.width}x${out.height}.${format === "jpeg" ? "jpg" : format}`);
    } catch (error) {
      toast.error("Export failed", { description: error instanceof Error ? error.message : "Try a different format." });
    } finally {
      setBusy(false);
    }
  };

  const outW = rect ? Math.round(rect.w) : 0;
  const outH = rect ? Math.round(rect.h) : 0;

  if (!img) {
    return (
      <ImageDropzone
        onFiles={onFiles}
        title="Drop the image to crop"
        hint="Drag a rectangle right on the picture — or grab a corner. Passport presets included. Stays in this tab."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      {/* canvas stage */}
      <div className="soft-shadow mx-auto w-fit max-w-full overflow-hidden rounded-[18px] border border-line bg-[#101318] p-2">
        <canvas
          ref={canvasRef}
          role="application"
          aria-label="Crop canvas — drag to draw, drag corners to resize"
          className="block max-w-full cursor-crosshair touch-none select-none rounded-[10px]"
          style={{ width: dispW, height: dispH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
            {img.width}×{img.height} → <span className="text-white/90">{outW}×{outH}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setGrid((v) => !v)}
              aria-pressed={grid}
              title="Rule-of-thirds grid"
              className={cn(
                "grid size-8 place-items-center rounded-[8px] text-white/50 transition-colors hover:text-white",
                grid && "bg-white/10 text-white",
              )}
            >
              <Grid3x3 className="size-4" />
            </button>
            <button
              type="button"
              onClick={resetToFull}
              title="Reset to full image"
              className="grid size-8 place-items-center rounded-[8px] text-white/50 transition-colors hover:text-white"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => { setImg(null); setRect(null); setImgMeta(null); }}
              title="Start over"
              className="grid size-8 place-items-center rounded-[8px] text-white/50 transition-colors hover:text-white"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="soft-shadow flex flex-col gap-4 rounded-[18px] border border-line bg-panel p-4 sm:p-5">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Aspect ratio</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={aspectId === a.id}
                onClick={() => {
                  setAspectId(a.id);
                  // snap the current crop into the new ratio, kept centered
                  if (!img || !rect) return;
                  const r = a.ratio === "original" ? img.width / img.height : a.ratio;
                  if (!r) return;
                  let w = rect.w;
                  let h = w / r;
                  if (h > img.height) { h = img.height; w = h * r; }
                  if (w > img.width) { w = img.width; h = w / r; }
                  setRect({
                    x: clamp(rect.x + rect.w / 2 - w / 2, 0, img.width - w),
                    y: clamp(rect.y + rect.h / 2 - h / 2, 0, img.height - h),
                    w, h,
                  });
                }}
                className={cn(
                  "h-8 rounded-[8px] border px-2.5 font-mono text-[11.5px] transition-colors",
                  aspectId === a.id
                    ? "border-brand bg-brand text-white"
                    : "border-line2 bg-sunken text-ink2 hover:text-ink",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          {aspectId === "passport" ? (
            <p className="mt-1.5 text-[11px] leading-snug text-ink2">
              35×45 mm — the standard visa/ID frame. For print, export at 413×531 px (300 DPI) or larger.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["w", "h"] as const).map((axis) => (
            <label key={axis} className="block">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
                {axis === "w" ? "Crop width (px)" : "Crop height (px)"}
              </span>
              <input
                type="number"
                min={1}
                max={img.width}
                value={rect ? Math.round(axis === "w" ? rect.w : rect.h) : 0}
                onChange={(e) => {
                  const v = clamp(Math.round(Number(e.target.value) || 1), 1, axis === "w" ? img.width : img.height);
                  setRect((r) => (r ? { ...r, [axis]: v } : r));
                }}
                className="mt-1 h-10 w-full rounded-[8px] border border-line2 bg-sunken px-3 font-mono text-[13px] text-ink outline-none focus:border-brand"
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            ariaLabel="Output format"
            size="sm"
            value={format}
            onChange={setFormat}
            options={[{ value: "png", label: "PNG" }, { value: "jpeg", label: "JPEG" }, { value: "webp", label: "WebP" }]}
          />
          {format !== "png" ? (
            <div className="flex h-8 items-center gap-2 font-mono text-[11px] text-ink2">
              q{quality}
              <Slider minValue={40} maxValue={100} value={quality} onChange={setQuality} thumbLabel="Quality" aria-label="Quality" showTooltip={false} className="w-28" />
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
            {outW}×{outH}px · source {formatBytes(imgMeta?.size ?? 0)}
          </div>
          <div className="flex items-center gap-1.5">
            <AiCopyButton
              variant="outline"
              size="sm"
              label="Copy dims"
              value={() => `${outW}x${outH}`}
              className="bg-panel"
            />
            <button
              type="button"
              onClick={download}
              disabled={busy || !rect}
              className="flex h-10 items-center gap-1.5 rounded-[9px] bg-brand px-4 text-[13px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <CropIcon className="size-4 animate-pulse" aria-hidden /> : <Download className="size-4" aria-hidden />}
              {busy ? "Cropping…" : "Download crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
