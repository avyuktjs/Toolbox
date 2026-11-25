"use client";

import { useCallback, useState } from "react";
import { Trash2, Download, Camera, Sun, MapPin, FileImage, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import exifr from "exifr";
import { ImageDropzone } from "./image-dropzone";
import { blobFromCanvas, downloadBlob, loadImage } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_BYTES = 25 * 1024 * 1024;

interface ExifState {
  name: string;
  size: number;
  fileType: string;
  width: number;
  height: number;
  raw: Record<string, unknown> | null;
  error: string | null;
  file: File;
}

function field(raw: Record<string, unknown> | null, key: string): string | null {
  const v = raw?.[key];
  if (v == null) return null;
  if (v instanceof Date) return v.toLocaleString("en-GB");
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function gpsCoord(raw: Record<string, unknown> | null): string | null {
  const lat = raw?.latitude as number | undefined;
  const lon = raw?.longitude as number | undefined;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(6)}° ${lon >= 0 ? "E" : "W"}`;
}

export function ExifTool() {
  const [state, setState] = useState<ExifState | null>(null);
  const [busy, setBusy] = useState(false);

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
    let width = 0, height = 0;
    try {
      const img = await loadImage(file);
      width = img.naturalWidth;
      height = img.naturalHeight;
    } catch {
      /* dimension probe is best-effort */
    }
    try {
      const raw = (await exifr.parse(file, { gps: true, mergeOutput: true, translateValues: true })) as Record<string, unknown> | undefined;
      setState({ name: file.name, size: file.size, fileType: file.type || "unknown", width, height, raw: raw ?? null, error: null, file });
    } catch (error) {
      setState({
        name: file.name, size: file.size, fileType: file.type || "unknown", width, height, raw: null, file,
        error: error instanceof Error ? error.message : "No EXIF found.",
      });
    }
  }, []);

  const strip = async () => {
    if (!state) return;
    setBusy(true);
    try {
      const img = await loadImage(state.file);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      const asPng = state.fileType === "image/png";
      if (!asPng) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const mime = asPng ? "image/png" : "image/jpeg";
      const blob = await blobFromCanvas(canvas, mime, 0.92);
      if (!blob) throw new Error("encode failed");
      const base = state.name.replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${base}-clean.${asPng ? "png" : "jpg"}`);
      toast.success("Metadata stripped", { description: "The re-exported file carries no EXIF, GPS or camera fingerprints." });
    } catch (error) {
      toast.error("Strip failed", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  const raw = state?.raw ?? null;
  const cam = [
    ["Make", field(raw, "Make")],
    ["Model", field(raw, "Model")],
    ["Lens", field(raw, "LensModel") ?? field(raw, "Lens")],
    ["Software", field(raw, "Software")],
  ].filter(([, v]) => v) as [string, string][];
  const exposure = [
    ["Aperture", field(raw, "FNumber") ? `f/${field(raw, "FNumber")}` : null],
    ["Shutter", field(raw, "ExposureTime") ? `${field(raw, "ExposureTime")} s` : null],
    ["ISO", field(raw, "ISO")],
    ["Focal length", field(raw, "FocalLength") ? `${field(raw, "FocalLength")} mm` : null],
    ["Flash", field(raw, "Flash")],
    ["Date taken", field(raw, "DateTimeOriginal") ?? field(raw, "CreateDate")],
  ].filter(([, v]) => v) as [string, string][];
  const gps = gpsCoord(raw);
  const gpsAlt = field(raw, "GPSAltitude");
  const gpsLink = gps && raw?.latitude != null && raw?.longitude != null
    ? `https://www.openstreetmap.org/?mlat=${raw.latitude}&mlon=${raw.longitude}#map=16/${raw.latitude}/${raw.longitude}`
    : null;
  const orientation = field(raw, "Orientation");

  if (!state) {
    return (
      <ImageDropzone
        onFiles={onFiles}
        title="Drop a photo to read its EXIF"
        hint="Camera, exposure, GPS coordinates — and a one-click strip for a clean copy. Parsing happens in this tab."
      />
    );
  }

  const hasAny = (cam.length + exposure.length) > 0 || gps !== null;

  return (
    <div className="soft-shadow mx-auto max-w-3xl overflow-hidden rounded-[18px] border border-line bg-panel">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sunken/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[10px] bg-sunken text-ink3"><FileImage className="size-5" aria-hidden /></span>
          <div>
            <p className="max-w-64 truncate text-[13px] font-semibold text-ink" title={state.name}>{state.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">
              {state.fileType} · {state.width}×{state.height} · {formatBytes(state.size)}{orientation ? ` · orientation ${orientation}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            hasAny ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          )}>
            {hasAny ? <ShieldAlert className="size-3.5" aria-hidden /> : <ShieldCheck className="size-3.5" aria-hidden />}
            {hasAny ? "Metadata found" : "No metadata — clean"}
          </span>
          <button type="button" onClick={() => setState(null)} aria-label="Start over"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="border-b border-line px-4 py-3 font-mono text-[11.5px] text-amber-600 dark:text-amber-400">
          {state.error}
        </p>
      ) : null}

      <div className="grid sm:grid-cols-2">
        {/* camera + exposure */}
        <div className="border-b border-line p-4 sm:border-b-0 sm:border-r">
          {cam.length > 0 ? (
            <section>
              <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3"><Camera className="size-3.5" /> Camera</p>
              <dl className="mt-1.5 divide-y divide-line overflow-hidden rounded-[10px] border border-line">
                {cam.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 bg-panel px-3 py-1.5">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3">{k}</dt>
                    <dd className="text-right text-[12px] font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {exposure.length > 0 ? (
            <section className="mt-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3"><Sun className="size-3.5" /> Exposure</p>
              <dl className="mt-1.5 divide-y divide-line overflow-hidden rounded-[10px] border border-line">
                {exposure.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 bg-panel px-3 py-1.5">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink3">{k}</dt>
                    <dd className="text-right text-[12px] font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {cam.length === 0 && exposure.length === 0 ? (
            <p className="text-[13px] text-ink2">Nothing camera-related in this file. PNGs from design tools usually carry no EXIF.</p>
          ) : null}
        </div>

        {/* gps */}
        <div className="p-4">
          <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3"><MapPin className="size-3.5" /> Location</p>
          {gps ? (
            <div className="mt-1.5 rounded-[12px] border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="font-mono text-[14px] font-semibold text-ink">{gps}</p>
              {gpsAlt ? <p className="mt-0.5 font-mono text-[11px] text-ink2">altitude {gpsAlt} m</p> : null}
              {gpsLink ? (
                <a href={gpsLink} target="_blank" rel="noreferrer noopener"
                  className="mt-2 inline-block text-[12px] font-semibold text-accent-ink underline underline-offset-4 hover:opacity-80">
                  Open in OpenStreetMap ↗
                </a>
              ) : null}
              <p className="mt-2 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
                Anyone with this file knows where it was taken. Strip before posting.
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-[13px] text-ink2">No GPS coordinates embedded — nothing to leak.</p>
          )}

          <button
            type="button"
            onClick={strip}
            disabled={busy}
            className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[9px] bg-brand px-4 text-[13px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden />
            {busy ? "Re-encoding…" : "Strip metadata & download"}
          </button>
        </div>
      </div>

      <p className="border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        Parsed in this tab with exifr · nothing uploaded
      </p>
    </div>
  );
}
