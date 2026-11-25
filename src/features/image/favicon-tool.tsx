"use client";

import { useCallback, useMemo, useState } from "react";
import { Trash2, FileArchive, Hexagon } from "lucide-react";
import { toast } from "sonner";
import { AiCopyButton } from "@/components/ai-copy-button";
import { Segmented } from "@/components/ui/segmented";
import { ImageDropzone } from "./image-dropzone";
import { loadImage, downloadBlob } from "@/lib/download";
import { encodeIco } from "@/lib/ico";
import { zipSync } from "fflate";
import { ColorWell } from "@/components/ui/color-picker";

const MAX_BYTES = 25 * 1024 * 1024;
const PNG_SIZES = [16, 32, 48, 180, 192, 512] as const;

export function FaviconTool() {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [sourceInfo, setSourceInfo] = useState<{ name: string; w: number; h: number } | null>(null);
  const [fit, setFit] = useState<"letterbox" | "crop">("letterbox");
  const [padColor, setPadColor] = useState("#ffffff");
  const [padTransparent, setPadTransparent] = useState(true);
  const [themeColor, setThemeColor] = useState("#ffffff");
  const [busy, setBusy] = useState(false);

  const buildSquare = useCallback((img: HTMLImageElement, mode: "letterbox" | "crop", bg: string, transparent: boolean) => {
    const side = mode === "letterbox" ? Math.max(img.naturalWidth, img.naturalHeight) : Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    if (mode === "letterbox") {
      if (!transparent) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, side, side);
      }
      const scale = side / Math.max(img.naturalWidth, img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (side - w) / 2, (side - h) / 2, w, h);
    } else {
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
    }
    return canvas;
  }, []);

  const onFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(bmp|svg)$/i.test(file.name)) {
      toast.error("Not an image", { description: `“${file.name}” isn't an image.` });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Too big", { description: "Up to 25 MB per image." });
      return;
    }
    try {
      const img = await loadImage(file);
      setSource(img);
      setSourceInfo({ name: file.name, w: img.naturalWidth, h: img.naturalHeight });
    } catch (error) {
      toast.error("Couldn't read it", { description: error instanceof Error ? error.message : "Decode failed." });
    }
  }, []);

  const square = useMemo(
    () => (source ? buildSquare(source, fit, padColor, padTransparent) : null),
    [source, fit, padColor, padTransparent, buildSquare],
  );

  const isSquare = sourceInfo ? sourceInfo.w === sourceInfo.h : true;

  const frameAt = (size: number): HTMLCanvasElement => {
    if (!square) throw new Error("drop an image first");
    const frame = document.createElement("canvas");
    frame.width = size;
    frame.height = size;
    const ctx = frame.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(square, 0, 0, size, size);
    return frame;
  };

  const encodePng = (size: number): Promise<Uint8Array> =>
    new Promise((resolve, reject) => {
      frameAt(size).toBlob((blob) => {
        if (!blob) return reject(new Error("encode failed"));
        blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)), reject);
      }, "image/png");
    });

  const manifest = `{
  "name": "Your App",
  "short_name": "App",
  "icons": [
    { "src": "/android-chrome-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "${themeColor}",
  "background_color": "${themeColor}",
  "display": "standalone"
}`;

  const htmlSnippet = `<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${themeColor}">`;

  const downloadPack = async () => {
    if (!square) return;
    setBusy(true);
    try {
      const entries: Record<string, Uint8Array> = {};
      for (const size of PNG_SIZES) {
        const bytes = await encodePng(size);
        const name = size === 180 ? "apple-touch-icon.png" : size >= 192 ? `android-chrome-${size}.png` : `icon-${size}.png`;
        entries[name] = bytes;
      }
      const ico = await encodeIco(square, [16, 32, 48]);
      entries["favicon.ico"] = new Uint8Array(await ico.arrayBuffer());
      entries["site.webmanifest"] = new TextEncoder().encode(manifest);
      entries["head-snippet.html"] = new TextEncoder().encode(htmlSnippet + "\n");
      const zipped = zipSync(entries, { level: 6 });
      downloadBlob(new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" }), "favicon-pack.zip");
      toast.success("Favicon pack saved", { description: "Drop the files in your /public folder and paste the snippet into <head>." });
    } catch (error) {
      toast.error("Pack failed", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  if (!square) {
    return (
      <ImageDropzone
        onFiles={onFiles}
        title="Drop a logo to build a favicon pack"
        hint="One square-ish image in — favicon.ico, every PNG size, apple-touch-icon, webmanifest and the <head> snippet out, zipped."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      {/* preview of every size */}
      <div className="soft-shadow flex flex-col rounded-[18px] border border-line bg-[#101318] p-4">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">Every size, right now</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PNG_SIZES.map((size) => {
            const previewSide = size <= 48 ? size * 3 : size <= 180 ? 90 : 72;
            return (
              <div key={size} className="flex flex-col items-center gap-1.5 rounded-[10px] bg-white/5 p-2">
                <canvas
                  ref={(node) => {
                    if (!node) return;
                    node.width = size;
                    node.height = size;
                    const ctx = node.getContext("2d");
                    if (ctx && square) {
                      ctx.imageSmoothingEnabled = true;
                      ctx.imageSmoothingQuality = "high";
                      ctx.drawImage(square, 0, 0, size, size);
                    }
                  }}
                  className="rounded-[3px] bg-white/10"
                  style={{ width: previewSide, height: previewSide, imageRendering: size <= 48 ? "pixelated" : "auto" }}
                />
                <span className="font-mono text-[9px] text-white/60">{size}px</span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => { setSource(null); setSourceInfo(null); }}
          className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-[8px] text-[11px] font-medium text-white/50 transition-colors hover:text-white"
        >
          <Trash2 className="size-3.5" aria-hidden /> Start over — {sourceInfo?.w}×{sourceInfo?.h}
        </button>
      </div>

      {/* settings */}
      <div className="soft-shadow flex flex-col gap-4 rounded-[18px] border border-line bg-panel p-4 sm:p-5">
        {!isSquare ? (
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Not square — how to fit</p>
            <Segmented
              ariaLabel="Fit mode"
              size="sm"
              value={fit}
              onChange={setFit}
              options={[
                { value: "letterbox", label: "Pad to square" },
                { value: "crop", label: "Center-crop" },
              ]}
              className="mt-1"
            />
            {fit === "letterbox" ? (
              <label className="mt-2 flex items-center gap-2 text-[12px] font-medium text-ink2">
                <input type="checkbox" checked={padTransparent} onChange={(e) => setPadTransparent(e.target.checked)} className="accent-[var(--brand,#1d43f2)]" />
                transparent padding
                {!padTransparent ? (
                  <ColorWell aria-label="Padding color" value={padColor} onChange={(color) => setPadColor(color.toString("hex"))} wellClassName="size-7" />
                ) : null}
              </label>
            ) : null}
          </div>
        ) : null}

        <label className="block">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Theme color (manifest + meta)</span>
          <div className="mt-1 flex items-center gap-2">
            <ColorWell aria-label="Theme color" value={themeColor} onChange={(color) => setThemeColor(color.toString("hex"))} wellClassName="size-10" />
            <input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} spellCheck={false} className="h-10 w-28 rounded-[8px] border border-line2 bg-sunken px-3 font-mono text-[13px] text-ink outline-none focus:border-brand" />
          </div>
        </label>

        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">site.webmanifest</p>
          <pre className="mt-1 max-h-36 overflow-auto rounded-[10px] border border-line bg-sunken/50 p-3 font-mono text-[10.5px] leading-relaxed text-ink2">{manifest}</pre>
          <div className="mt-1.5 flex items-center gap-1.5">
            <AiCopyButton variant="outline" size="sm" label="Copy manifest" value={() => manifest} className="bg-panel" />
            <AiCopyButton variant="outline" size="sm" label="Copy head snippet" value={() => htmlSnippet} className="bg-panel" />
          </div>
        </div>

        <button
          type="button"
          onClick={downloadPack}
          disabled={busy}
          className="mt-auto flex h-11 items-center justify-center gap-2 rounded-[9px] bg-brand px-5 text-[13.5px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Hexagon className="size-4 animate-pulse" aria-hidden /> : <FileArchive className="size-4" aria-hidden />}
          {busy ? "Packing…" : "Download favicon-pack.zip"}
        </button>
      </div>
    </div>
  );
}
