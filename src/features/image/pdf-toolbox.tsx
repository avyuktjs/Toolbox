"use client";

import { useCallback, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileArchive,
  FileText,
  Scissors,
  Merge,
  FileImage,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { zipSync } from "fflate";
import { Segmented } from "@/components/ui/segmented";
import { downloadBlob } from "@/lib/download";
import { formatBytes, sanitizeFilename } from "@/lib/format";
import { cn } from "@/lib/utils";
import { parsePageRanges } from "@/lib/page-ranges";

type Tab = "merge" | "split" | "images";
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_PAGES_IMAGES = 80;

interface PdfEntry {
  id: string;
  name: string;
  size: number;
  pages: number;
  bytes: Uint8Array;
}
let pdfId = 0;
const nextId = () => `pdf-${++pdfId}-${Date.now().toString(36)}`;

function PdfDropHint({ label, onFiles, multiple }: { label: string; onFiles: (files: File[]) => void; multiple?: boolean }) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed px-4 py-10 text-center transition-colors",
        drag ? "border-brand bg-brand/5" : "border-line2 bg-sunken/30 hover:border-brand",
      )}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const files = [...e.dataTransfer.files].filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name)); if (files.length) onFiles(files); }}
    >
      <FileText className="size-7 text-ink3" strokeWidth={1.5} aria-hidden />
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <span className="text-[11px] text-ink3">or click to browse — PDFs never leave this tab</span>
      <input
        type="file"
        multiple={multiple}
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function PdfTool() {
  const [tab, setTab] = useState<Tab>("merge");

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <Segmented
          ariaLabel="PDF task"
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: "merge", label: "Merge & reorder", icon: <Merge className="size-3.5" /> },
            { value: "split", label: "Split & extract", icon: <Scissors className="size-3.5" /> },
            { value: "images", label: "Pages → images", icon: <FileImage className="size-3.5" /> },
          ]}
        />
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">No uploads — ever</p>
      </div>
      <div className="p-4 sm:p-5">
        {tab === "merge" ? <MergeTab /> : null}
        {tab === "split" ? <SplitTab /> : null}
        {tab === "images" ? <ImagesTab /> : null}
      </div>
    </div>
  );
}

/* ─────────── merge ─────────── */

function MergeTab() {
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const addFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      if (file.size > MAX_PDF_BYTES) { toast.error("Too big", { description: `“${file.name}” — up to 50 MB.` }); continue; }
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        setEntries((prev) => [...prev, { id: nextId(), name: file.name, size: file.size, pages: doc.getPageCount(), bytes }]);
      } catch {
        toast.error("Couldn't read it", { description: `“${file.name}” isn't a readable PDF — maybe it's encrypted.` });
      }
    }
  }, []);

  const move = (index: number, delta: -1 | 1) => {
    setEntries((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const totalPages = entries.reduce((sum, e) => sum + e.pages, 0);

  const merge = async () => {
    if (entries.length === 0) return;
    setBusy(true);
    try {
      const out = await PDFDocument.create();
      out.setProducer("Toolbox (local)");
      for (const entry of entries) {
        const src = await PDFDocument.load(entry.bytes, { ignoreEncryption: true });
        const indices = src.getPageIndices();
        const copied = await out.copyPages(src, indices);
        copied.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), "merged.pdf");
      toast.success(`Merged ${entries.length} PDFs — ${totalPages} pages`);
    } catch (error) {
      toast.error("Merge failed", { description: error instanceof Error ? error.message : "A file may be encrypted." });
    } finally {
      setBusy(false);
    }
  };

  if (entries.length === 0) {
    return <PdfDropHint label="Drop the PDFs to merge" multiple onFiles={addFiles} />;
  }

  return (
    <div>
      <ul className="divide-y divide-line overflow-hidden rounded-[12px] border border-line">
        {entries.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-3 bg-panel px-3 py-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-sunken font-mono text-[11px] font-semibold tabular-nums text-ink2">{index + 1}</span>
            <FileText className="size-5 shrink-0 text-ink3" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink" title={entry.name}>{entry.name}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">
                {entry.pages} page{entry.pages === 1 ? "" : "s"} · {formatBytes(entry.size)}
              </span>
            </span>
            <div className="flex shrink-0 flex-col gap-0.5">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier"
                className="grid size-6 place-items-center rounded-[5px] text-ink3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-25"><ArrowUp className="size-3.5" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === entries.length - 1} aria-label="Move later"
                className="grid size-6 place-items-center rounded-[5px] text-ink3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-25"><ArrowDown className="size-3.5" /></button>
            </div>
            <button type="button" onClick={() => setEntries((prev) => prev.filter((e) => e.id !== entry.id))} aria-label={`Remove ${entry.name}`}
              className="grid size-7 shrink-0 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"><X className="size-4" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PdfDropHintInline onFiles={addFiles} />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">{totalPages} pages total</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEntries([])} aria-label="Clear list"
            className="grid size-10 place-items-center rounded-[9px] text-ink3 transition-colors hover:bg-sunken hover:text-ink"><Trash2 className="size-5" /></button>
          <button
            type="button"
            onClick={merge}
            disabled={busy || entries.length === 0}
            className="flex h-11 items-center gap-2 rounded-[9px] bg-brand px-5 text-[13.5px] font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Merge className="size-4" aria-hidden />{busy ? "Merging…" : "Merge PDFs"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PdfDropHintInline({ onFiles }: { onFiles: (files: File[]) => void }) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-1.5 rounded-[9px] border border-dashed border-line2 px-3 text-[12px] font-medium text-ink2 transition-colors hover:border-brand hover:text-ink">
      + Add PDFs
      <input type="file" multiple accept="application/pdf,.pdf" className="sr-only" aria-hidden
        onChange={(e) => { const files = [...(e.target.files ?? [])]; if (files.length) onFiles(files); e.target.value = ""; }} />
    </label>
  );
}

/* ─────────── split ─────────── */

function SplitTab() {
  const [entry, setEntry] = useState<PdfEntry | null>(null);
  const [range, setRange] = useState("1-3");
  const [busy, setBusy] = useState(false);

  const addFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) { toast.error("Too big", { description: "Up to 50 MB per PDF." }); return; }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setEntry({ id: nextId(), name: file.name, size: file.size, pages: doc.getPageCount(), bytes });
      setRange(doc.getPageCount() >= 3 ? "1-3" : "1");
    } catch {
      toast.error("Couldn't read it", { description: "Encrypted or corrupt PDF?" });
    }
  }, []);

  const extract = async (mode: "selection" | "zip") => {
    if (!entry) return;
    setBusy(true);
    try {
      const src = await PDFDocument.load(entry.bytes, { ignoreEncryption: true });
      const base = sanitizeFilename(entry.name.replace(/\.pdf$/i, ""));

      if (mode === "selection") {
        const { pages, error } = parsePageRanges(range, entry.pages);
        if (error) { toast.error("Fix the range", { description: error }); return; }
        const out = await PDFDocument.create();
        out.setProducer("Toolbox (local)");
        const copied = await out.copyPages(src, pages.map((p) => p - 1));
        copied.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), `${base}-pages-${pages[0]}-${pages[pages.length - 1]}.pdf`);
        toast.success(`Extracted ${pages.length} page${pages.length === 1 ? "" : "s"}`);
      } else {
        const entries: Record<string, Uint8Array> = {};
        for (let i = 0; i < entry.pages; i += 1) {
          const out = await PDFDocument.create();
          out.setProducer("Toolbox (local)");
          const [copied] = await out.copyPages(src, [i]);
          out.addPage(copied);
          entries[`${base}-page-${String(i + 1).padStart(3, "0")}.pdf`] = await out.save();
        }
        const zipped = zipSync(entries, { level: 6 });
        downloadBlob(new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" }), `${base}-pages.zip`);
        toast.success(`Zipped ${entry.pages} single-page PDFs`);
      }
    } catch (error) {
      toast.error("Extract failed", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  if (!entry) {
    return <PdfDropHint label="Drop the PDF to split" onFiles={addFiles} />;
  }

  const parsed = parsePageRanges(range, entry.pages);

  return (
    <div>
      <div className="flex items-center gap-3 rounded-[12px] border border-line bg-sunken/30 px-3 py-2.5">
        <FileText className="size-6 shrink-0 text-ink3" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink" title={entry.name}>{entry.name}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">{entry.pages} pages · {formatBytes(entry.size)}</span>
        </span>
        <button type="button" onClick={() => setEntry(null)} aria-label="Start over"
          className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"><Trash2 className="size-4" /></button>
      </div>

      <label className="mt-3 block">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Pages to extract — e.g. 1-3, 5, 8-9</span>
        <input
          value={range}
          onChange={(e) => setRange(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          className={cn(
            "mt-1 h-12 w-full rounded-[10px] border bg-sunken px-4 font-mono text-[15px] text-ink outline-none focus:border-brand",
            parsed.error ? "border-red-400" : "border-line2",
          )}
        />
      </label>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-ink3">
        {parsed.error ? parsed.error : `${parsed.pages.length} page${parsed.pages.length === 1 ? "" : "s"} selected — pages ${parsed.pages.join(", ")}`}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => extract("selection")} disabled={busy || !!parsed.error}
          className="flex h-11 items-center gap-2 rounded-[9px] bg-brand px-5 text-[13px] font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50">
          <Download className="size-4" aria-hidden />{busy ? "Working…" : "Download selection"}
        </button>
        <button type="button" onClick={() => extract("zip")} disabled={busy}
          className="flex h-11 items-center gap-2 rounded-[9px] border border-line2 bg-sunken px-5 text-[13px] font-semibold text-ink2 transition-colors hover:border-brand hover:text-ink disabled:opacity-50">
          <FileArchive className="size-4" aria-hidden />Each page as its own PDF (zip)
        </button>
      </div>
    </div>
  );
}

/* ─────────── pages → images ─────────── */

function ImagesTab() {
  const [entry, setEntry] = useState<PdfEntry | null>(null);
  const [scale, setScale] = useState<2 | 3 | 4>(2);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const addFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) { toast.error("Too big", { description: "Up to 50 MB per PDF." }); return; }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setEntry({ id: nextId(), name: file.name, size: file.size, pages: doc.getPageCount(), bytes });
    } catch {
      toast.error("Couldn't read it", { description: "Encrypted or corrupt PDF?" });
    }
  }, []);

  const renderPages = async () => {
    if (!entry) return;
    setBusy(true);
    setProgress("Loading pdfjs…");
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs-worker.min.mjs";
      const doc = await pdfjs.getDocument({ data: entry.bytes.slice() }).promise;
      const total = Math.min(doc.numPages, MAX_PAGES_IMAGES);
      const base = sanitizeFilename(entry.name.replace(/\.pdf$/i, ""));
      const entries: Record<string, Uint8Array> = {};
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");

      for (let i = 1; i <= total; i += 1) {
        setProgress(`Rendering page ${i} of ${total}…`);
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), format === "png" ? "image/png" : "image/jpeg", 0.92));
        if (!blob) continue;
        entries[`${base}-page-${String(i).padStart(3, "0")}.${format === "png" ? "png" : "jpg"}`] =
          new Uint8Array(await blob.arrayBuffer());
        page.cleanup();
      }
      setProgress("Zipping…");
      const zipped = zipSync(entries, { level: 6 });
      downloadBlob(new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" }), `${base}-pages.zip`);
      toast.success(`Rendered ${total} page${total === 1 ? "" : "s"} → zip`);
      if (doc.numPages > MAX_PAGES_IMAGES) {
        toast.message("First 80 pages only", { description: `This PDF has ${doc.numPages} pages — split it first for the rest.` });
      }
    } catch (error) {
      toast.error("Render failed", { description: error instanceof Error ? error.message : "Try a smaller PDF." });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  if (!entry) {
    return <PdfDropHint label="Drop the PDF to rasterize" onFiles={addFiles} />;
  }

  return (
    <div>
      <div className="flex items-center gap-3 rounded-[12px] border border-line bg-sunken/30 px-3 py-2.5">
        <FileText className="size-6 shrink-0 text-ink3" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink" title={entry.name}>{entry.name}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">{entry.pages} pages · {formatBytes(entry.size)}</span>
        </span>
        <button type="button" onClick={() => setEntry(null)} aria-label="Start over"
          className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"><Trash2 className="size-4" /></button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Render scale</span>
          <Segmented
            ariaLabel="Scale"
            size="sm"
            value={String(scale)}
            onChange={(v) => setScale(Number(v) as 2 | 3 | 4)}
            options={[
              { value: "2", label: "2× · 144 dpi" },
              { value: "3", label: "3× · 216 dpi" },
              { value: "4", label: "4× · 288 dpi" },
            ]}
            className="mt-1"
          />
        </div>
        <div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Format</span>
          <Segmented
            ariaLabel="Format"
            size="sm"
            value={format}
            onChange={setFormat}
            options={[{ value: "png", label: "PNG" }, { value: "jpeg", label: "JPEG" }]}
            className="mt-1"
          />
        </div>
        <button
          type="button"
          onClick={renderPages}
          disabled={busy}
          className="flex h-11 items-center gap-2 rounded-[9px] bg-brand px-5 text-[13px] font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
        >
          <FileArchive className="size-4" aria-hidden />{busy ? "Rendering…" : `Render ${entry.pages} page${entry.pages === 1 ? "" : "s"} → zip`}
        </button>
      </div>
      {progress ? <p aria-live="polite" className="mt-2 font-mono text-[11px] text-ink3">{progress}</p> : null}
      <p className="mt-2 text-[11px] leading-snug text-ink2">
        Pages are painted onto a white canvas by pdfjs — transparency becomes white, text stays razor sharp at 3× and up.
      </p>
    </div>
  );
}
