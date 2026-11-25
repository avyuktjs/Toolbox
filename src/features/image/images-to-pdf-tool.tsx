"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Trash2,
  X,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { Segmented } from "@/components/ui/segmented";
import { ImageDropzone } from "./image-dropzone";
import { loadImage, downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";

type PageSize = "fit" | "a4" | "letter";
type Margin = "none" | "small";
const MAX_FILES = 40;
const MAX_BYTES = 25 * 1024 * 1024;
const A4 = { w: 595.28, h: 841.89 } as const; // pt
const LETTER = { w: 612, h: 792 } as const;

interface Page {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  img: HTMLImageElement;
}
let pageId = 0;
const nextId = () => `pg-${++pageId}-${Date.now().toString(36)}`;

export function ImagesToPdfTool() {
  const [pages, setPages] = useState<Page[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [margin, setMargin] = useState<Margin>("none");
  const [orientation, setOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => pages.forEach((p) => URL.revokeObjectURL(p.url)), [pages]);

  const onFiles = useCallback(async (files: File[]) => {
    const room = MAX_FILES - pages.length;
    const accepted = files.slice(0, Math.max(0, room)).filter((f) => f.type.startsWith("image/") || /\.(bmp|svg)$/i.test(f.name));
    if (accepted.length < files.length) toast.message("Some files skipped", { description: `Room for ${MAX_FILES} pages — images only.` });
    for (const file of accepted) {
      if (file.size > MAX_BYTES) { toast.error("Too big", { description: `“${file.name}” — up to 25 MB.` }); continue; }
      try {
        const img = await loadImage(file);
        setPages((prev) => [...prev, {
          id: nextId(), name: file.name, size: file.size, type: file.type,
          url: URL.createObjectURL(file), img,
        }]);
      } catch {
        toast.error("Couldn't read it", { description: `“${file.name}” failed to decode.` });
      }
    }
  }, [pages.length]);

  const move = (index: number, delta: -1 | 1) => {
    setPages((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const buildPdf = async () => {
    if (pages.length === 0) return;
    setBusy(true);
    try {
      const pdf = await PDFDocument.create();
      pdf.setTitle("Images PDF — made with Toolbox");
      pdf.setProducer("Toolbox (local)");

      for (const page of pages) {
        const imgW = page.img.naturalWidth;
        const imgH = page.img.naturalHeight;
        // Normalize through canvas — pdf-lib only embeds PNG/JPEG bytes
        const canvas = document.createElement("canvas");
        canvas.width = imgW;
        canvas.height = imgH;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        const sourceHasAlpha = /png|webp|avif|gif/.test(page.type);
        if (!sourceHasAlpha) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, imgW, imgH);
        }
        ctx.drawImage(page.img, 0, 0);
        const isPng = sourceHasAlpha;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), isPng ? "image/png" : "image/jpeg", 0.9));
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const embedded = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

        const m = margin === "small" ? 36 : 0; // 0.5in
        let pageW: number, pageH: number;
        if (pageSize === "fit") {
          pageW = imgW * 0.75 + m * 2; // px → pt at 96dpi
          pageH = imgH * 0.75 + m * 2;
        } else {
          const base = pageSize === "a4" ? A4 : LETTER;
          let portrait = imgH >= imgW;
          if (orientation === "portrait") portrait = true;
          if (orientation === "landscape") portrait = false;
          pageW = portrait ? base.w : base.h;
          pageH = portrait ? base.h : base.w;
        }
        const p = pdf.addPage([pageW, pageH]);
        const availW = pageW - m * 2;
        const availH = pageH - m * 2;
        const scale = Math.min(availW / (imgW * 0.75), availH / (imgH * 0.75));
        const w = imgW * 0.75 * scale;
        const h = imgH * 0.75 * scale;
        p.drawImage(embedded, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
      }

      const bytes = await pdf.save();
      downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), "images.pdf");
      toast.success(`PDF saved — ${pages.length} page${pages.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error("PDF build failed", { description: error instanceof Error ? error.message : "Try fewer or smaller images." });
    } finally {
      setBusy(false);
    }
  };

  if (pages.length === 0) {
    return (
      <ImageDropzone
        multiple
        onFiles={onFiles}
        title="Drop images to make a PDF"
        hint="Scans, receipts, whiteboards, screenshots — reorder them, pick a page size, get one clean PDF. Everything stays in this tab."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      {/* page list */}
      <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
        <p className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          {pages.length} page{pages.length === 1 ? "" : "s"} · top = first
          <button type="button" onClick={() => setPages([])} className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent-ink hover:underline underline-offset-4">Clear all</button>
        </p>
        <ul className="max-h-[30rem] divide-y divide-line overflow-y-auto">
          {pages.map((page, index) => (
            <li key={page.id} className="flex items-center gap-3 px-3 py-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-sunken font-mono text-[11px] font-semibold tabular-nums text-ink2">
                {index + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.url} alt="" className="size-14 shrink-0 rounded-[7px] border border-line object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-ink" title={page.name}>{page.name}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">
                  {page.img.naturalWidth}×{page.img.naturalHeight} · {formatBytes(page.size)}
                </span>
              </span>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up"
                  className="grid size-6 place-items-center rounded-[5px] text-ink3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-25">
                  <ArrowUp className="size-3.5" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === pages.length - 1} aria-label="Move down"
                  className="grid size-6 place-items-center rounded-[5px] text-ink3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-25">
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => { URL.revokeObjectURL(page.url); setPages((prev) => prev.filter((p) => p.id !== page.id)); }}
                aria-label={`Remove ${page.name}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-11 w-full items-center justify-center gap-2 border-t border-line text-[12px] font-medium text-ink2 transition-colors hover:text-ink"
        >
          <FileUp className="size-4" aria-hidden /> Add more images
        </button>
        <input
          ref={inputRef}
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
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Page size</p>
          <Segmented
            ariaLabel="Page size"
            size="sm"
            value={pageSize}
            onChange={setPageSize}
            options={[
              { value: "fit", label: "Fit image" },
              { value: "a4", label: "A4" },
              { value: "letter", label: "Letter" },
            ]}
            className="mt-1.5"
          />
        </div>
        {pageSize !== "fit" ? (
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Orientation</p>
            <Segmented
              ariaLabel="Orientation"
              size="sm"
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: "auto", label: "Auto (per image)" },
                { value: "portrait", label: "Portrait" },
                { value: "landscape", label: "Landscape" },
              ]}
              className="mt-1.5"
            />
          </div>
        ) : null}
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Margins</p>
          <Segmented
            ariaLabel="Margins"
            size="sm"
            value={margin}
            onChange={setMargin}
            options={[
              { value: "none", label: "None" },
              { value: "small", label: "0.5 inch" },
            ]}
            className="mt-1.5"
          />
        </div>

        <ul className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-ink2">
          <li className="flex gap-2"><span className="font-mono text-ink3">·</span> Photos are re-encoded as JPEG 90; transparent graphics stay PNG.</li>
          <li className="flex gap-2"><span className="font-mono text-ink3">·</span> “Fit image” makes each PDF page exactly the picture — ideal for archives.</li>
          <li className="flex gap-2"><span className="font-mono text-ink3">·</span> Nothing is uploaded. The PDF is assembled in this tab.</li>
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setPages([])}
            aria-label="Clear all pages"
            className="grid size-10 place-items-center rounded-[9px] text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-5" />
          </button>
          <button
            type="button"
            onClick={buildPdf}
            disabled={busy}
            className="flex h-11 items-center gap-2 rounded-[9px] bg-brand px-5 text-[13.5px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? <FileText className="size-4 animate-pulse" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {busy ? "Assembling PDF…" : `Download PDF (${pages.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
