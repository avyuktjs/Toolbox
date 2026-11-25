"use client";

import { useCallback, useState } from "react";
import { Download, Trash2, Gauge, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Segmented } from "@/components/ui/segmented";
import { ImageDropzone } from "./image-dropzone";
import { blobFromCanvas, downloadBlob, loadImage } from "@/lib/download";
import { formatBytes } from "@/lib/format";

const MAX_BYTES = 25 * 1024 * 1024;
const WIDTH_PRESETS = [
  { value: 0, label: "Keep size" },
  { value: 2560, label: "2560" },
  { value: 1920, label: "1920" },
  { value: 1600, label: "1600" },
  { value: 1280, label: "1280" },
  { value: 1080, label: "1080" },
] as const;

function hasTransparency(img: HTMLImageElement): boolean {
  const probe = document.createElement("canvas");
  probe.width = Math.min(64, img.width);
  probe.height = Math.min(64, img.height);
  const ctx = probe.getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, probe.width, probe.height);
  const data = ctx.getImageData(0, 0, probe.width, probe.height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  return false;
}

interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  quality: number;
  scaledDown: boolean;
  hitTarget: boolean;
}

async function compressToTarget(
  img: HTMLImageElement,
  maxWidth: number,
  targetBytes: number,
  format: "jpeg" | "webp",
  onProgress: (message: string) => void,
): Promise<CompressResult> {
  const mime = format === "jpeg" ? "image/jpeg" : "image/webp";
  let width = Math.min(img.width, maxWidth > 0 ? maxWidth : img.width);
  let height = Math.max(1, Math.round((width * img.height) / img.width));
  let scaledDown = width !== img.width;

  const encodeAt = async (w: number, h: number, q: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    if (format === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await blobFromCanvas(canvas, mime, q);
    if (!blob) throw new Error("This browser can't encode that format.");
    return blob;
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    // binary-search the quality that just fits
    let lo = 0.05;
    let hi = 0.95;
    let best: Blob | null = null;
    let bestQ = lo;
    for (let i = 0; i < 8; i += 1) {
      const mid = (lo + hi) / 2;
      onProgress(`Encoding at quality ${(mid * 100).toFixed(0)}…`);
      const blob = await encodeAt(width, height, mid);
      if (blob.size <= targetBytes) {
        best = blob;
        bestQ = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    if (best) {
      return { blob: best, width: Math.round(width), height: Math.round(height), quality: bestQ, scaledDown, hitTarget: true };
    }
    // even q=0.05 is too big — shrink the frame and try again
    width *= 0.8;
    height *= 0.8;
    scaledDown = true;
    onProgress(`Too big at ${Math.round(width / 0.8)}px — trying ${Math.round(width)}px…`);
  }
  const blob = await encodeAt(width, height, 0.05);
  return { blob, width: Math.round(width), height: Math.round(height), quality: 0.05, scaledDown, hitTarget: false };
}

export function CompressTool() {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [meta, setMeta] = useState<{ name: string; size: number } | null>(null);
  const [targetKb, setTargetKb] = useState(200);
  const [maxWidth, setMaxWidth] = useState(0);
  const [format, setFormat] = useState<"jpeg" | "webp">("webp");
  const [alpha, setAlpha] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompressResult | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Not an image", { description: `“${file.name}” isn't an image.` });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Too big", { description: "Up to 25 MB per image." });
      return;
    }
    try {
      const image = await loadImage(file);
      setImg(image);
      setMeta({ name: file.name, size: file.size });
      setAlpha(hasTransparency(image));
      setResult(null);
      setStatus(null);
    } catch (error) {
      toast.error("Couldn't read it", { description: error instanceof Error ? error.message : "Decode failed." });
    }
  }, []);

  const run = async () => {
    if (!img || !meta) return;
    if (format === "jpeg" && alpha) {
      toast.message("Transparency detected", { description: "JPEG can't keep an alpha channel — using WebP fronts you a smaller file anyway." });
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await compressToTarget(img, maxWidth, Math.max(8, targetKb) * 1024, format, setStatus);
      setResult(r);
      setStatus(null);
      if (!r.hitTarget) {
        toast.message("Close, but not quite", { description: "Couldn't hit the target — this is the smallest this image goes." });
      }
    } catch (error) {
      toast.error("Compression failed", { description: error instanceof Error ? error.message : "Try again." });
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const savedPct = result && meta ? Math.max(0, (1 - result.blob.size / meta.size) * 100) : 0;

  if (!img) {
    return (
      <ImageDropzone
        onFiles={onFiles}
        title="Drop an image to shrink"
        hint="Name the size you need — 200 KB for a blog header? — and the encoder binary-searches quality and dimensions until it fits."
      />
    );
  }

  return (
    <div className="soft-shadow mx-auto max-w-3xl overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* summary strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sunken/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[10px] bg-sunken text-ink3">
            <ImageIcon className="size-5" aria-hidden />
          </span>
          <div>
            <p className="max-w-56 truncate text-[13px] font-semibold text-ink" title={meta?.name}>{meta?.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">
              {img.width}×{img.height} · {formatBytes(meta?.size ?? 0)}{alpha ? " · has alpha" : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setImg(null); setMeta(null); setResult(null); }}
          className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          aria-label="Start over"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-end gap-4 p-4 sm:p-5">
        <label className="block">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Target size (KB)</span>
          <input
            type="number" min={8} max={20000}
            value={targetKb}
            onChange={(e) => setTargetKb(Math.max(8, Number(e.target.value) || 8))}
            className="mt-1 h-11 w-28 rounded-[8px] border border-line2 bg-sunken px-3 text-center font-mono text-[16px] font-semibold text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Max width</span>
          <select
            value={maxWidth}
            onChange={(e) => setMaxWidth(Number(e.target.value))}
            className="mt-1 h-11 rounded-[8px] border border-line2 bg-sunken px-3 text-[13px] text-ink outline-none focus:border-brand"
          >
            {WIDTH_PRESETS.map((w) => <option key={w.value} value={w.value}>{w.label}{w.value === 0 ? " (original)" : " px"}</option>)}
          </select>
        </label>
        <div className="block">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Format</span>
          <Segmented
            ariaLabel="Format"
            size="sm"
            value={format}
            onChange={setFormat}
            options={[{ value: "webp", label: "WebP" }, { value: "jpeg", label: "JPEG" }]}
            className="mt-1"
          />
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="flex h-11 items-center gap-1.5 rounded-[9px] bg-brand px-5 text-[13px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
        >
          <Gauge className="size-4" aria-hidden />
          {busy ? "Crunching…" : "Compress to target"}
        </button>
      </div>

      {status ? (
        <p aria-live="polite" className="px-5 pb-3 font-mono text-[11px] text-ink3">{status}</p>
      ) : null}

      {/* result */}
      {result ? (
        <div className="border-t border-line p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Result</p>
              <p className="mt-1 font-mono text-[26px] font-semibold leading-none text-ink">
                {formatBytes(result.blob.size)}
                <span className="ml-2 align-middle text-[13px] font-medium text-emerald-600 dark:text-emerald-400">−{savedPct.toFixed(0)}%</span>
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">
                {result.width}×{result.height} · quality {(result.quality * 100).toFixed(0)}
                {result.scaledDown ? " · dimensions reduced" : ""}
                {result.hitTarget ? " · target hit" : " · target not reached"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const base = (meta?.name ?? "image").replace(/\.[^.]+$/, "");
                downloadBlob(result.blob, `${base}-${result.width}x${result.height}.${format === "jpeg" ? "jpg" : "webp"}`);
              }}
              className="flex h-11 items-center gap-1.5 rounded-[9px] bg-brand px-5 text-[13px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Download className="size-4" aria-hidden /> Download
            </button>
          </div>
        </div>
      ) : null}

      <p className="border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        Binary search over quality, then dimensions — all in this tab
      </p>
    </div>
  );
}
