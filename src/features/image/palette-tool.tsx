"use client";

import { useCallback, useState } from "react";
import { Trash2, Pipette, Check } from "lucide-react";
import { toast } from "sonner";
import { ImageDropzone } from "./image-dropzone";
import { loadImage } from "@/lib/download";
import { AiCopyButton } from "@/components/ai-copy-button";

const MAX_BYTES = 25 * 1024 * 1024;

interface Bucket {
  pixels: [number, number, number][];
}

function channelRange(pixels: [number, number, number][], ch: 0 | 1 | 2): number {
  let min = 255, max = 0;
  for (const p of pixels) {
    const v = p[ch];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

function medianCut(pixels: [number, number, number][], depth: number): Bucket[] {
  if (pixels.length === 0) return [];
  if (depth === 0 || pixels.length <= 8) return [{ pixels }];
  const ranges = [channelRange(pixels, 0), channelRange(pixels, 1), channelRange(pixels, 2)];
  const ch = (ranges[0] >= ranges[1] && ranges[0] >= ranges[2] ? 0 : ranges[1] >= ranges[2] ? 1 : 2) as 0 | 1 | 2;
  const sorted = [...pixels].sort((a, b) => a[ch] - b[ch]);
  const mid = Math.floor(sorted.length / 2);
  return [...medianCut(sorted.slice(0, mid), depth - 1), ...medianCut(sorted.slice(mid), depth - 1)];
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
const rgbToHex = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

export function PaletteTool() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [colors, setColors] = useState<{ hex: string; share: number }[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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
      const img = await loadImage(file);
      // sample at most 96px on the long edge — plenty for a palette
      const target = 96;
      const scale = Math.min(1, target / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const pixels: [number, number, number][] = [];
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
      if (pixels.length < 16) throw new Error("Not enough visible pixels — is the image transparent?");
      const buckets = medianCut(pixels, 3); // 8 buckets
      const total = pixels.length;
      const palette = buckets
        .map(({ pixels: px }) => {
          const avg = px.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0] as [number, number, number]);
          return {
            hex: rgbToHex(avg[0] / px.length, avg[1] / px.length, avg[2] / px.length),
            share: px.length / total,
          };
        })
        .sort((a, b) => b.share - a.share);
      setColors(palette);
      setImageName(file.name);
      setImageUrl(canvas.toDataURL("image/jpeg", 0.7));
    } catch (error) {
      toast.error("Couldn't read it", { description: error instanceof Error ? error.message : "Decode failed." });
    }
  }, []);

  const copyOne = (hex: string) => {
    void navigator.clipboard?.writeText(hex);
    setCopied(hex);
    window.setTimeout(() => setCopied(null), 1200);
  };

  const cssVars = colors
    ? `:root {\n${colors.map((c, i) => `  --palette-${i + 1}: ${c.hex};`).join("\n")}\n}`
    : "";

  if (!colors) {
    return (
      <ImageDropzone
        onFiles={onFiles}
        title="Drop an image to pull its palette"
        hint="Median-cut quantization finds the eight colors that actually dominate the picture. Click any swatch to copy."
      />
    );
  }

  return (
    <div className="soft-shadow mx-auto max-w-3xl overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="grid sm:grid-cols-[auto_1fr]">
        {/* source thumbnail */}
        <div className="relative flex items-center justify-center border-b border-line bg-[#101318] p-3 sm:border-b-0 sm:border-r">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`Palette source — ${imageName}`} className="max-h-56 rounded-[8px] object-contain" />
          ) : null}
          <button
            type="button"
            onClick={() => { setColors(null); setImageUrl(null); }}
            aria-label="Start over"
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/50 text-white/80 transition-colors hover:text-white"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {/* swatches */}
        <div className="p-4">
          <p className="flex items-center justify-between font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
            <span className="flex items-center gap-1.5"><Pipette className="size-3.5" /> Dominant colors</span>
            <AiCopyButton variant="ghost" size="sm" label="Copy CSS vars" value={() => cssVars} iconOnly />
          </p>
          <div className="mt-2 divide-y divide-line overflow-hidden rounded-[10px] border border-line">
            {colors.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => copyOne(c.hex)}
                title="Copy hex"
                className="flex w-full items-center gap-3 px-2 py-1.5 text-left transition-colors hover:bg-sunken/60"
              >
                <span className="h-9 w-14 shrink-0 rounded-[6px] border border-black/10" style={{ backgroundColor: c.hex }} />
                <span className="font-mono text-[13px] font-semibold uppercase text-ink">{c.hex}</span>
                <span className="ml-auto font-mono text-[10px] tabular-nums text-ink3">{(c.share * 100).toFixed(1)}%</span>
                <span className="grid size-6 place-items-center text-ink3">
                  {copied === c.hex ? <Check className="size-4 text-emerald-500" aria-hidden /> : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* full-bleed swatch strip */}
      <div className="flex h-14 border-t border-line">
        {colors.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => copyOne(c.hex)}
            title={`${c.hex} — click to copy`}
            className="h-full transition-[flex] duration-300 ease-out hover:flex-[2]"
            style={{ backgroundColor: c.hex, flexGrow: Math.max(0.15, c.share) }}
            aria-label={`Copy ${c.hex}`}
          />
        ))}
      </div>

      <p className="border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        Median-cut quantization · sampled at ≤96px · click anything to copy
      </p>
    </div>
  );
}
