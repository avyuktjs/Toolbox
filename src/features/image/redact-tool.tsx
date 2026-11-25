"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Trash2, Undo2, ScanEye } from "lucide-react";
import { toast } from "sonner";
import { Segmented } from "@/components/ui/segmented";
import { ImageDropzone } from "./image-dropzone";
import { blobFromCanvas, downloadBlob, loadImage } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { Slider } from "@/components/ui/slider";

type Effect = "pixelate" | "blur" | "blackout";
interface Box { id: number; x: number; y: number; w: number; h: number }

let boxId = 0;
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_W = 680;
const MAX_H = 500;

export function RedactTool() {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgMeta, setImgMeta] = useState<{ name: string; size: number } | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [effect, setEffect] = useState<Effect>("pixelate");
  const [strength, setStrength] = useState(14);
  const [draft, setDraft] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const draftRef = useRef<Box | null>(null);

  const scale = img ? Math.min(MAX_W / img.width, MAX_H / img.height, 1) : 1;
  const dispW = img ? Math.round(img.width * scale) : 0;
  const dispH = img ? Math.round(img.height * scale) : 0;

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
      setBoxes([]);
    } catch (error) {
      toast.error("Couldn't read it", { description: error instanceof Error ? error.message : "That image failed to decode." });
    }
  }, []);

  /* ── paint the stage: image + each box rendered with the effect ── */
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    canvas.width = dispW;
    canvas.height = dispH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(img, 0, 0, dispW, dispH);
    for (const b of [...boxes, ...(draft ? [draft] : [])]) {
      applyEffect(ctx, img, b, effect, strength, scale);
    }
    // outline for editing
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    for (const b of boxes) ctx.strokeRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
    if (draft) ctx.strokeRect(draft.x * scale, draft.y * scale, draft.w * scale, draft.h * scale);
    ctx.setLineDash([]);
  }, [img, boxes, draft, effect, strength, scale, dispW, dispH]);

  useEffect(() => { paint(); }, [paint]);

  const toSource = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: clamp((((e.clientX - r.left) / r.width) * dispW) / scale, 0, img?.width ?? 0),
      y: clamp((((e.clientY - r.top) / r.height) * dispH) / scale, 0, img?.height ?? 0),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = toSource(e);
    drawStart.current = p;
    const seed = { id: -1, x: p.x, y: p.y, w: 0, h: 0 };
    draftRef.current = seed;
    setDraft(seed);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawStart.current || !img) return;
    const p = toSource(e);
    const s = drawStart.current;
    const next = {
      id: -1,
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    };
    draftRef.current = next;
    setDraft(next);
  };
  const onPointerUp = () => {
    drawStart.current = null;
    const d = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (d && d.w >= 6 && d.h >= 6) {
      setBoxes((prev) => [...prev, { ...d, id: ++boxId }]);
    }
  };

  const download = async () => {
    if (!img) return;
    setBusy(true);
    try {
      const out = document.createElement("canvas");
      out.width = img.width;
      out.height = img.height;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(img, 0, 0);
      for (const b of boxes) applyEffect(ctx, img, b, effect, strength, 1);
      const blob = await blobFromCanvas(out, "image/png");
      if (!blob) throw new Error("encode failed");
      const base = (imgMeta?.name ?? "redacted").replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${base}-redacted.png`);
      toast.success("Redacted copy saved", { description: "The hidden pixels are unrecoverable in the export." });
    } catch (error) {
      toast.error("Export failed", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  if (!img) {
    return (
      <ImageDropzone
        onFiles={onFiles}
        title="Drop the screenshot to redact"
        hint="Mask emails, keys, faces, addresses — pixelate, blur or black them out. Everything happens locally; nothing leaves this tab."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      <div className="soft-shadow mx-auto w-fit max-w-full overflow-hidden rounded-[18px] border border-line bg-[#101318] p-2">
        <canvas
          ref={canvasRef}
          role="application"
          aria-label="Redaction canvas — drag to draw a mask box"
          className="block max-w-full cursor-crosshair touch-none select-none rounded-[10px]"
          style={{ width: dispW, height: dispH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div className="flex items-center justify-between gap-2 px-1.5 pb-1 pt-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
            {boxes.length} mask{boxes.length === 1 ? "" : "s"} applied
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBoxes((prev) => prev.slice(0, -1))}
              title="Undo last box"
              className="grid size-8 place-items-center rounded-[8px] text-white/50 transition-colors hover:text-white"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setBoxes([])}
              title="Clear all boxes"
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
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Effect</p>
          <Segmented
            ariaLabel="Effect"
            size="sm"
            value={effect}
            onChange={setEffect}
            options={[
              { value: "pixelate", label: "Pixelate" },
              { value: "blur", label: "Blur" },
              { value: "blackout", label: "Blackout" },
            ]}
            className="mt-1.5"
          />
          {effect !== "blackout" ? (
            <div className="mt-3 block">
              <span className="flex items-baseline justify-between text-[12px] font-semibold text-ink2">
                Strength <span className="font-mono text-[11px] tabular-nums text-ink">{strength}px</span>
              </span>
              <Slider
                minValue={4}
                maxValue={effect === "pixelate" ? 48 : 40}
                value={strength}
                onChange={setStrength}
                thumbLabel="Strength"
                aria-label="Strength"
                showTooltip={false}
                className="mt-1"
              />
            </div>
          ) : null}
        </div>

        <ol className="space-y-1.5 text-[11.5px] leading-snug text-ink2">
          <li className="flex gap-2"><span className="font-mono text-ink3">1</span> Drag across anything sensitive — emails, tokens, faces, plate numbers.</li>
          <li className="flex gap-2"><span className="font-mono text-ink3">2</span> Boxes are burned in pixel-by-pixel before export.</li>
          <li className="flex gap-2"><span className="font-mono text-ink3">3</span> Blackout is irreversible even to forensics; blur/pixel are not guaranteed. Use blackout for secrets.</li>
        </ol>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
            {imgMeta?.name} · {img.width}×{img.height} · {formatBytes(imgMeta?.size ?? 0)}
          </p>
          <button
            type="button"
            onClick={download}
            disabled={busy || boxes.length === 0}
            className="flex h-10 items-center gap-1.5 rounded-[9px] bg-brand px-4 text-[13px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <ScanEye className="size-4 animate-pulse" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {busy ? "Burning in…" : "Download redacted PNG"}
          </button>
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

/** Burn one mask box into ctx — shared by the stage preview and the export. */
function applyEffect(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement,
  box: Box,
  effect: Effect,
  strength: number,
  scale: number,
) {
  const x = box.x * scale;
  const y = box.y * scale;
  const w = Math.max(1, box.w * scale);
  const h = Math.max(1, box.h * scale);

  if (effect === "blackout") {
    ctx.fillStyle = "#050505";
    ctx.fillRect(x, y, w, h);
    return;
  }

  if (effect === "blur") {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.filter = `blur(${strength * scale}px)`;
    // draw the box region magnified beyond its edges so the blur has bleed to sample
    const bleed = strength * scale * 2;
    ctx.drawImage(
      source,
      box.x, box.y, box.w, box.h,
      x - bleed, y - bleed, w + bleed * 2, h + bleed * 2,
    );
    ctx.restore();
    return;
  }

  // pixelate — draw the region tiny, then scale back up with smoothing off
  const pixel = Math.max(2, strength * scale);
  const tinyW = Math.max(1, Math.floor(w / pixel));
  const tinyH = Math.max(1, Math.floor(h / pixel));
  const tiny = document.createElement("canvas");
  tiny.width = tinyW;
  tiny.height = tinyH;
  const tctx = tiny.getContext("2d");
  if (!tctx) return;
  tctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, tinyW, tinyH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, tinyW, tinyH, x, y, w, h);
  ctx.imageSmoothingEnabled = true;
}
