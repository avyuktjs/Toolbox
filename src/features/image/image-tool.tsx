"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileUp,
  FlipHorizontal2,
  FlipVertical2,
  Image as ImageIcon,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ColorWell } from "@/components/ui/color-picker";
import { formatBytes, sanitizeFilename } from "@/lib/format";
import { blobFromCanvas, downloadBlob } from "@/lib/download";
import { encodeBmp, encodeIco } from "@/lib/ico";

/* ── what the pipeline can do ── */

type OutputFormat = "png" | "jpeg" | "webp" | "avif" | "bmp" | "ico";
type CropAspect = "original" | "1:1" | "4:5" | "16:9" | "3:2" | "4:3";
type Rotation = 0 | 90 | 180 | 270;

const FORMATS: { id: OutputFormat; label: string; mime: string; kind: string }[] = [
  { id: "png", label: "PNG", mime: "image/png", kind: "Lossless" },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg", kind: "Smaller" },
  { id: "webp", label: "WebP", mime: "image/webp", kind: "Smallest" },
  { id: "avif", label: "AVIF", mime: "image/avif", kind: "Smallest, next-gen" },
  { id: "bmp", label: "BMP", mime: "image/bmp", kind: "Uncompressed" },
  { id: "ico", label: "ICO", mime: "image/x-icon", kind: "16 · 32 · 48 · 256 icons" },
];

const LOSSY = new Set<OutputFormat>(["jpeg", "webp", "avif"]);

const CROPS: { id: CropAspect; ratio: number | null }[] = [
  { id: "original", ratio: null },
  { id: "1:1", ratio: 1 },
  { id: "4:5", ratio: 4 / 5 },
  { id: "16:9", ratio: 16 / 9 },
  { id: "3:2", ratio: 3 / 2 },
  { id: "4:3", ratio: 4 / 3 },
];

const ROTATIONS: Rotation[] = [0, 90, 180, 270];
const MAX_FILES = 20;
const MAX_BYTES = 25 * 1024 * 1024;

interface LoadedImage {
  id: string;
  name: string;
  size: number;
  ext: string;
  width: number;
  height: number;
  img: HTMLImageElement;
  objectUrl: string;
}

interface RenderSettings {
  format: OutputFormat;
  quality: number;
  width: number;
  crop: CropAspect;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  background: string;
}

let imageId = 0;
const nextId = () => `img-${++imageId}-${Date.now().toString(36)}`;
const baseName = (name: string) => name.replace(/\.[^.]+$/, "");
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Centered crop rect for the given aspect, in source pixels. */
function cropRect(sw: number, sh: number, crop: CropAspect) {
  const ratio = CROPS.find((c) => c.id === crop)?.ratio ?? null;
  if (ratio === null) return { sx: 0, sy: 0, sw, sh };
  let cw = sw;
  let ch = Math.round(cw / ratio);
  if (ch > sh) {
    ch = sh;
    cw = Math.round(ch * ratio);
  }
  return { sx: Math.floor((sw - cw) / 2), sy: Math.floor((sh - ch) / 2), sw: cw, sh: ch };
}

/** Output pixel dims for the current settings + source. */
function outputDims(item: LoadedImage, s: RenderSettings) {
  const r = cropRect(item.width, item.height, s.crop);
  const outW = clamp(Math.round(s.width), 1, 8000);
  const outH = clamp(Math.round((outW * r.sh) / r.sw), 1, 8000);
  const rotated = s.rotation === 90 || s.rotation === 270;
  return { outW, outH, rotated, srcRect: r };
}

/** Draw the whole pipeline: crop → resize → rotate/flip → encode. */
function renderToCanvas(item: LoadedImage, s: RenderSettings): HTMLCanvasElement | null {
  const { outW, outH, rotated, srcRect } = outputDims(item, s);

  // stage A — crop and resize
  const a = document.createElement("canvas");
  a.width = outW;
  a.height = outH;
  const actx = a.getContext("2d");
  if (!actx) return null;
  if (s.format === "jpeg") {
    actx.fillStyle = s.background;
    actx.fillRect(0, 0, outW, outH);
  }
  actx.imageSmoothingEnabled = true;
  actx.imageSmoothingQuality = "high";
  try {
    actx.drawImage(
      item.img,
      srcRect.sx,
      srcRect.sy,
      srcRect.sw,
      srcRect.sh,
      0,
      0,
      outW,
      outH,
    );
  } catch {
    return null; // an SVG referencing outside content can't be re-encoded
  }

  // stage B — rotate / flip
  const final = document.createElement("canvas");
  final.width = rotated ? outH : outW;
  final.height = rotated ? outW : outH;
  const fctx = final.getContext("2d");
  if (!fctx) return null;
  if (s.format === "jpeg") {
    fctx.fillStyle = s.background;
    fctx.fillRect(0, 0, final.width, final.height);
  }
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = "high";
  fctx.translate(final.width / 2, final.height / 2);
  fctx.rotate((s.rotation * Math.PI) / 180);
  fctx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
  fctx.drawImage(a, -outW / 2, -outH / 2, outW, outH);
  return final;
}

/** The one encode path — estimate, download and batch all go through here. */
async function renderBlob(item: LoadedImage, s: RenderSettings): Promise<Blob | null> {
  const canvas = renderToCanvas(item, s);
  if (!canvas) return null;
  const quality = s.quality / 100;
  switch (s.format) {
    case "png":
      return blobFromCanvas(canvas, "image/png");
    case "jpeg":
      return blobFromCanvas(canvas, "image/jpeg", quality);
    case "webp":
      return blobFromCanvas(canvas, "image/webp", quality);
    case "avif":
      return blobFromCanvas(canvas, "image/avif", quality);
    case "bmp":
      return encodeBmp(canvas);
    case "ico":
      return encodeIco(canvas);
  }
}

export function ImageTool() {
  const [items, setItems] = useState<LoadedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragDepth, setDragDepth] = useState(0);
  const [format, setFormat] = useState<OutputFormat>("jpeg");
  const [quality, setQuality] = useState(82);
  const [width, setWidth] = useState(0);
  const [crop, setCrop] = useState<CropAspect>("original");
  const [rotation, setRotation] = useState<Rotation>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [background, setBackground] = useState("#ffffff");
  const [estimate, setEstimate] = useState<{ width: number; height: number; bytes: number | null } | null>(null);
  const [avifOk, setAvifOk] = useState<boolean | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find((it) => it.id === selectedId) ?? items[0] ?? null;

  /* ── probe AVIF encoding once — hidden when the browser can't ── */
  useEffect(() => {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    probe.toBlob((blob) => setAvifOk(!!blob && blob.type === "image/avif"), "image/avif");
  }, []);

  /* ── load files: decode, probe dimensions, keep a preview ── */
  const addFiles = useCallback((files: File[]) => {
    const room = MAX_FILES - items.length;
    if (room <= 0) {
      toast.message("That's enough for now", { description: `Twenty images at a time — keep it light.` });
      return;
    }
    const accepted = files.slice(0, room).filter((file) => {
      if (!file.type.startsWith("image/") && !/\.(bmp|svg)$/i.test(file.name)) {
        toast.error("Not an image", { description: `“${file.name}” isn't something Toolbox reads as an image.` });
        return false;
      }
      if (file.size > MAX_BYTES) {
        toast.error("Too big", { description: `“${file.name}” — up to 25 MB per image.` });
        return false;
      }
      return true;
    });
    if (accepted.length === 0) return;

    for (const file of accepted) {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const widthPx = img.naturalWidth || 1024;
        const heightPx = img.naturalHeight || 1024;
        const ext = (file.name.split(".").pop() ?? "img").toLowerCase();
        setItems((list) => [
          ...list,
          { id: nextId(), name: sanitizeFilename(file.name, "image"), size: file.size, ext, width: widthPx, height: heightPx, img, objectUrl },
        ]);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        toast.error("Couldn't read it", { description: `“${file.name}” didn't decode — try a different file.` });
      };
      img.src = objectUrl;
    }
  }, [items.length]);

  const removeItem = useCallback((id: string) => {
    setItems((list) => {
      const target = list.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl);
      return list.filter((it) => it.id !== id);
    });
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  const clearAll = useCallback(() => {
    setItems((list) => {
      for (const it of list) URL.revokeObjectURL(it.objectUrl);
      return [];
    });
    setSelectedId(null);
  }, []);

  useEffect(() => () => items.forEach((it) => URL.revokeObjectURL(it.objectUrl)), [items]);

  // width falls back to the selected image's own width until set — no effect needed
  const effectiveWidth = clamp(Math.round(width || selected?.width || 1), 1, 8000);
  const settings: RenderSettings = {
    format,
    quality,
    width: effectiveWidth,
    crop,
    rotation,
    flipH,
    flipV,
    background,
  };

  /* ── live output preview + byte estimate, both from one pipeline run ── */
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!selected) {
        if (!cancelled) {
          setEstimate(null);
          setPreviewUrl(null);
        }
        return;
      }
      // render the real pipeline: crop → resize → rotate/flip → backfill
      const canvas = renderToCanvas(selected, settings);
      if (!canvas) {
        if (!cancelled) {
          setEstimate(null);
          setPreviewUrl(null);
        }
        return;
      }

      // encodeIco center-crops to a square — the preview must match
      let previewSource = canvas;
      if (format === "ico" && canvas.width !== canvas.height) {
        const side = Math.min(canvas.width, canvas.height);
        const sq = document.createElement("canvas");
        sq.width = side;
        sq.height = side;
        const sctx = sq.getContext("2d");
        if (sctx) {
          sctx.drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, side, side);
          previewSource = sq;
        }
      }

      // a small preview is enough for the screen — never upscale it
      const maxSide = 440;
      const scale = Math.min(1, maxSide / Math.max(previewSource.width, previewSource.height));
      const pv = document.createElement("canvas");
      pv.width = Math.max(1, Math.round(previewSource.width * scale));
      pv.height = Math.max(1, Math.round(previewSource.height * scale));
      const pctx = pv.getContext("2d");
      if (pctx) {
        pctx.imageSmoothingEnabled = true;
        pctx.imageSmoothingQuality = "high";
        pctx.drawImage(previewSource, 0, 0, pv.width, pv.height);
        setPreviewUrl(pv.toDataURL("image/png"));
      }

      const dims = outputDims(selected, settings);
      const base = { width: dims.rotated ? dims.outH : dims.outW, height: dims.rotated ? dims.outW : dims.outH };
      if (format === "avif") {
        // AVIF encodes are seconds-slow — measure the size once it's on disk
        if (!cancelled) setEstimate({ ...base, bytes: null });
        return;
      }
      void renderBlob(selected, settings).then((blob) => {
        if (cancelled) return;
        setEstimate({ ...base, bytes: blob ? blob.size : null });
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, format, quality, effectiveWidth, crop, rotation, flipH, flipV, background]);

  const downloadOne = useCallback(
    async (item: LoadedImage) => {
      const blob = await renderBlob(item, settings);
      if (!blob) {
        toast.error("Couldn't encode it", {
          description:
            format === "avif"
              ? "Your browser can't encode AVIF — try WebP instead."
              : "That SVG can't be re-encoded — it references external content.",
        });
        return;
      }
      const ext = { png: "png", jpeg: "jpg", webp: "webp", avif: "avif", bmp: "bmp", ico: "ico" }[format];
      downloadBlob(blob, `${baseName(item.name)}.${ext}`);
    },
    // settings is rebuilt every render; effectiveWidth pins the useful part
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [format, quality, effectiveWidth, crop, rotation, flipH, flipV, background],
  );

  const downloadAll = useCallback(async () => {
    for (const item of items) {
      await downloadOne(item); // sequential on purpose — browsers throttle parallel downloads
    }
    toast.success(`Saved ${items.length} image${items.length === 1 ? "" : "s"}`);
  }, [items, downloadOne]);

  const dragging = dragDepth > 0;
  const showBackground = format === "jpeg";
  const lossy = LOSSY.has(format);
  const ico = format === "ico";
  const outDims = selected ? outputDims(selected, settings) : null;
  const shownDims = ico
    ? { w: 256, h: 256 }
    : outDims
      ? { w: outDims.rotated ? outDims.outH : outDims.outW, h: outDims.rotated ? outDims.outW : outDims.outH }
      : null;
  const visibleFormats = FORMATS.filter((f) => (f.id === "avif" ? avifOk === true : true));

  if (items.length === 0) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Add images"
        className={cn(
          "soft-shadow flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed px-6 py-20 text-center transition-colors",
          dragging ? "border-brand bg-brand/5" : "border-line2 bg-panel",
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragDepth((d) => d + 1);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragDepth((d) => Math.max(0, d - 1));
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragDepth(0);
          const files = [...e.dataTransfer.files];
          if (files.length) addFiles(files);
        }}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-sunken text-ink">
          <FileUp className="size-7" strokeWidth={1.5} />
        </span>
        <p className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">Drop images here</p>
        <p className="text-[12px] text-ink2">or browse from your machine</p>
        <p className="mt-1 max-w-[18rem] text-[11px] leading-relaxed text-ink3">
          PNG, JPEG, WebP, GIF, SVG, BMP, AVIF and ICO — up to 25 MB each, twenty at a time. Everything happens in this tab.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.bmp,.svg"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            if (files.length) addFiles(files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* header bar */}
      <div className="flex h-11 items-center justify-between border-b border-line bg-sunken/40 px-4">
        <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          <ImageIcon className="size-4" /> Image — converted in this tab
        </span>
        <button
          type="button"
          onClick={clearAll}
          className="flex h-7 items-center gap-1.5 rounded-[6px] px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3 transition-colors hover:bg-sunken hover:text-danger"
        >
          <Trash2 className="size-3.5" /> Clear all
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── left: the stack ── */}
        <div
          className="flex max-h-[34rem] flex-col gap-2 overflow-y-auto border-b border-line p-3 lg:border-b-0 lg:border-r"
          onDragEnter={(e) => {
            e.preventDefault();
            setDragDepth((d) => d + 1);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragDepth((d) => Math.max(0, d - 1));
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragDepth(0);
            const files = [...e.dataTransfer.files];
            if (files.length) addFiles(files);
          }}
        >
          {items.map((item) => {
            const active = item.id === selected?.id;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`Select ${item.name}`}
                onClick={() => setSelectedId(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(item.id);
                  }
                }}
                className={cn(
                  "group flex cursor-pointer items-center gap-3 rounded-[12px] border p-2 text-left transition-colors",
                  active ? "border-brand bg-brand/5" : "border-line hover:border-line2 hover:bg-sunken/40",
                )}
              >
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[9px] border border-line bg-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.objectUrl} alt="" className="size-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink" title={item.name}>
                    {item.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">
                    {item.ext} · {item.width}×{item.height} · {formatBytes(item.size)}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-9 items-center justify-center gap-2 rounded-[10px] border border-dashed border-line2 text-[12px] font-medium text-ink2 transition-colors hover:border-brand hover:text-ink"
          >
            <FileUp className="size-4" /> Add more images
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.bmp,.svg"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              if (files.length) addFiles(files);
              e.target.value = "";
            }}
          />
        </div>

        {/* ── right: preview + controls ── */}
        {selected && shownDims && (
          <div className="flex flex-col">
            {/* live output preview — crop, resize, rotate, flip and
                background all shown exactly as they'll be saved */}
            <div className="relative flex h-56 items-center justify-center overflow-hidden border-b border-line bg-[conic-gradient(#dcdce2_0_25%,#ffffff_0_50%,#dcdce2_0_75%,#ffffff_0)] bg-[length:16px_16px] p-4 sm:h-64">
              <span className="absolute left-3 top-2 font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-ink3/80">
                Output preview
              </span>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- generated data URL, not a static asset
                <img
                  src={previewUrl}
                  alt="Output preview — exactly what will be saved"
                  className="max-h-full max-w-full rounded-[4px] shadow-[0_2px_14px_rgba(0,0,0,0.18)]"
                />
              )}
            </div>

            <div className="flex flex-col gap-4 p-4 sm:p-5">
              {/* format */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-20 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">
                  Format
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {visibleFormats.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      aria-pressed={format === f.id}
                      className={cn(
                        "h-8 rounded-full border px-3 font-mono text-[11px] font-semibold transition-colors",
                        format === f.id
                          ? "border-ink bg-ink text-paper"
                          : "border-line2 text-ink2 hover:border-ink hover:text-ink",
                      )}
                      title={f.kind}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">
                  {ico
                    ? "→ 16 · 32 · 48 · 256 px icons"
                    : `→ ${shownDims.w} × ${shownDims.h} · ${estimate ? (estimate.bytes != null ? formatBytes(estimate.bytes) : format === "avif" ? "size on save" : "size unknown") : "…"}`}
                </span>
              </div>
              {(format === "ico" || format === "bmp" || format === "avif") && (
                <p className="-mt-2 pl-[5.5rem] text-[10px] leading-snug text-ink3">
                  {format === "ico" && "Saves one .ico with 16, 32, 48 and 256px frames, center-cropped to a square."}
                  {format === "bmp" && "Uncompressed 24-bit BMP — big, but some old tools demand it."}
                  {format === "avif" && "AVIF encodes are slow — the readout shows the size once you save."}
                </p>
              )}

              {/* width — pointless for an .ico, which ships fixed sizes */}
              {!ico && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="image-width" className="w-20 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">
                  Width
                </label>
                <input
                  id="image-width"
                  type="number"
                  min={1}
                  max={8000}
                  value={effectiveWidth}
                  onChange={(e) => setWidth(clamp(Number(e.target.value) || 1, 1, 8000))}
                  className="h-8 w-20 rounded-[8px] border border-line bg-sunken/40 px-2 font-mono text-[12px] text-ink outline-none focus:border-line2"
                />
                <span className="font-mono text-[11px] text-ink3">px</span>
                <div className="flex gap-1.5">
                  {[0.25, 0.5, 1, 2].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setWidth(Math.round((crop === "original" ? selected.width : outputDims(selected, settings).srcRect.sw) * p))}
                      className="h-8 rounded-full border border-line2 px-2.5 font-mono text-[10px] font-semibold text-ink2 transition-colors hover:border-ink hover:text-ink"
                    >
                      {p * 100}%
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* crop */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-20 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">Crop</span>
                <div className="flex flex-wrap gap-1.5">
                  {CROPS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCrop(c.id)}
                      aria-pressed={crop === c.id}
                      className={cn(
                        "h-8 rounded-full border px-2.5 font-mono text-[10px] font-semibold transition-colors",
                        crop === c.id
                          ? "border-ink bg-ink text-paper"
                          : "border-line2 text-ink2 hover:border-ink hover:text-ink",
                      )}
                    >
                      {c.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* rotate / flip */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-20 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">
                  Rotate
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ROTATIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRotation(r)}
                      aria-pressed={rotation === r}
                      className={cn(
                        "h-8 min-w-9 rounded-full border px-2.5 font-mono text-[10px] font-semibold transition-colors",
                        rotation === r
                          ? "border-ink bg-ink text-paper"
                          : "border-line2 text-ink2 hover:border-ink hover:text-ink",
                      )}
                      title={r === 0 ? "No rotation" : `Rotate ${r}°`}
                    >
                      {r === 0 ? "0°" : `${r}°`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFlipH((v) => !v)}
                    aria-pressed={flipH}
                    className={cn(
                      "grid h-8 w-9 place-items-center rounded-full border transition-colors",
                      flipH ? "border-ink bg-ink text-paper" : "border-line2 text-ink2 hover:border-ink hover:text-ink",
                    )}
                    title="Flip horizontal"
                  >
                    <FlipHorizontal2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipV((v) => !v)}
                    aria-pressed={flipV}
                    className={cn(
                      "grid h-8 w-9 place-items-center rounded-full border transition-colors",
                      flipV ? "border-ink bg-ink text-paper" : "border-line2 text-ink2 hover:border-ink hover:text-ink",
                    )}
                    title="Flip vertical"
                  >
                    <FlipVertical2 className="size-4" />
                  </button>
                </div>
              </div>

              {/* quality — lossy formats only */}
              {lossy && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-20 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">
                    Quality
                  </span>
                  <Slider
                    minValue={40}
                    maxValue={100}
                    value={quality}
                    onChange={setQuality}
                    thumbLabel="Quality"
                    aria-label="Quality"
                    showTooltip={false}
                    className="w-40"
                  />
                  <span className="w-8 font-mono text-[12px] text-ink">{quality}</span>
                </div>
              )}

              {/* opaque backdrop — jpeg only */}
              {showBackground && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-20 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">
                    Backdrop
                  </span>
                  <ColorWell
                    aria-label="Background for transparent areas"
                    value={background}
                    onChange={(color) => setBackground(color.toString("hex"))}
                    wellClassName="size-8"
                  />
                  <span className="font-mono text-[11px] uppercase text-ink2">{background}</span>
                  <span className="text-[10px] text-ink3">JPEG can&apos;t hold transparency — this fills it.</span>
                </div>
              )}

              {/* actions */}
              <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => void downloadOne(selected)}
                  className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-[13px] font-semibold text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-brand hover:bg-brand hover:text-white"
                >
                  <Download className="size-4" /> Download {format === "jpeg" ? "JPEG" : format.toUpperCase()}
                </button>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => void downloadAll()}
                    className="flex h-10 items-center gap-2 rounded-full border border-line2 px-5 text-[13px] font-medium text-ink2 transition-colors hover:border-ink hover:text-ink"
                  >
                    <Download className="size-4" /> All {items.length}
                  </button>
                )}
                <span className="ml-auto text-[10px] leading-snug text-ink3">
                  Re-encoding strips EXIF &amp; location data.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
