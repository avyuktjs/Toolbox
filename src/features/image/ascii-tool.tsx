"use client";

import { useCallback, useMemo, useState } from "react";
import { Trash2, Download, FileText, Image as ImageIcon, Type } from "lucide-react";
import { toast } from "sonner";
import { Segmented } from "@/components/ui/segmented";
import { ImageDropzone } from "./image-dropzone";
import { downloadBlob, loadImage } from "@/lib/download";
import { AiCopyButton } from "@/components/ai-copy-button";
import { Slider } from "@/components/ui/slider";

const MAX_BYTES = 25 * 1024 * 1024;

const RAMPS: Record<string, string> = {
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  minimal: " .:*#",
  dots: " ·•●",
};

/** Char cells are ~2× taller than wide — correct for that. */
function toAscii(img: HTMLImageElement, columns: number, ramp: string, invert: boolean): string {
  const canvas = document.createElement("canvas");
  const aspect = img.height / img.width;
  const rows = Math.max(1, Math.round(columns * aspect * 0.5));
  canvas.width = columns;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(img, 0, 0, columns, rows);
  const { data } = ctx.getImageData(0, 0, columns, rows);
  const lines: string[] = [];
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    for (let x = 0; x < columns; x += 1) {
      const i = (y * columns + x) * 4;
      const alpha = data[i + 3] / 255;
      // alpha-weighted luminance against black — transparent cells become spaces
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      let t = lum * alpha;
      if (invert) t = 1 - t;
      line += ramp[Math.round(t * (ramp.length - 1))];
    }
    lines.push(line.replace(/\s+$/g, ""));
  }
  return lines.join("\n");
}

export function AsciiTool() {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgName, setImgName] = useState("");
  const [columns, setColumns] = useState(120);
  const [rampId, setRampId] = useState<keyof typeof RAMPS>("standard");
  const [invert, setInvert] = useState(false);

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
      setImgName(file.name.replace(/\.[^.]+$/, ""));
    } catch (error) {
      toast.error("Couldn't read it", { description: error instanceof Error ? error.message : "Decode failed." });
    }
  }, []);

  const output = useMemo(() => {
    if (!img) return "";
    try {
      return toAscii(img, columns, RAMPS[rampId], invert);
    } catch {
      return "";
    }
  }, [img, columns, rampId, invert]);

  const downloadTxt = () => {
    downloadBlob(new Blob([output], { type: "text/plain;charset=utf-8" }), `${imgName || "ascii"}.txt`);
  };

  const downloadPng = () => {
    if (!output) return;
    const lines = output.split("\n");
    const fontSize = 12;
    const probe = document.createElement("canvas").getContext("2d")!;
    probe.font = `${fontSize}px "SFMono-Regular", Menlo, Consolas, monospace`;
    const cellW = Math.ceil(probe.measureText("M").width);
    const lineH = Math.round(fontSize * 1.05);
    const w = Math.max(...lines.map((l) => l.length)) * cellW + 32;
    const h = lines.length * lineH + 24;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e6edf3";
    ctx.font = `${fontSize}px "SFMono-Regular", Menlo, Consolas, monospace`;
    ctx.textBaseline = "top";
    lines.forEach((line, i) => ctx.fillText(line, 16, 12 + i * lineH));
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${imgName || "ascii"}.png`);
    }, "image/png");
  };

  if (!img) {
    return (
      <ImageDropzone
        onFiles={onFiles}
        title="Drop an image to rasterize it into text"
        hint="Faces, logos, landscapes — luminance becomes characters. Great for READMEs, commit messages and plain-text signatures."
      />
    );
  }

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <div className="flex h-8 items-center gap-2 rounded-[8px] border border-line2 bg-sunken px-2 font-mono text-[10.5px] text-ink2">
          <Type className="size-3.5" aria-hidden /> {columns} cols
          <Slider
            minValue={48}
            maxValue={240}
            step={8}
            value={columns}
            onChange={setColumns}
            thumbLabel="Column count"
            aria-label="Column count"
            showTooltip={false}
            className="w-28"
          />
        </div>
        <Segmented
          ariaLabel="Character ramp"
          size="sm"
          value={rampId}
          onChange={setRampId}
          options={[
            { value: "standard", label: "Standard" },
            { value: "blocks", label: "Blocks" },
            { value: "minimal", label: "Minimal" },
            { value: "dots", label: "Dots" },
          ]}
        />
        <button
          type="button"
          role="checkbox"
          aria-checked={invert}
          onClick={() => setInvert((v) => !v)}
          className="flex h-8 items-center gap-1.5 rounded-[8px] border border-line2 bg-sunken px-2.5 text-[11.5px] font-medium text-ink2 transition-colors hover:text-ink aria-checked:border-brand aria-checked:text-accent-ink"
        >
          <span className="font-mono">{invert ? "✓" : ""}</span> invert
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <AiCopyButton variant="outline" size="sm" label="Copy text" value={() => output} className="bg-panel" />
          <button type="button" onClick={downloadTxt} title="Download .txt" className="grid size-8 place-items-center rounded-[8px] border border-line2 bg-sunken text-ink2 transition-colors hover:text-ink"><FileText className="size-4" /></button>
          <button type="button" onClick={downloadPng} title="Download PNG" className="grid size-8 place-items-center rounded-[8px] border border-line2 bg-sunken text-ink2 transition-colors hover:text-ink"><ImageIcon className="size-4" /></button>
          <button type="button" onClick={() => setImg(null)} aria-label="Start over" className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <div className="max-h-[34rem] overflow-auto bg-[#0d1117] p-4">
        <pre className="w-fit whitespace-pre font-mono text-[7px] leading-[1.05] text-[#e6edf3]">{output}</pre>
      </div>

      <p className="flex items-center gap-2 border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        <Download className="size-3" aria-hidden /> Luminance → ramp · light characters on dark background
      </p>
    </div>
  );
}
