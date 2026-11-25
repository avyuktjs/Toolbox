/* yt-dlp integration: URL validation, metadata inspection, and
   spawned downloads with line-based progress parsing.
   Toolbox never bypasses DRM, logins, or platform restrictions — errors
   from the extractor are surfaced honestly. */

import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { DownloadSelection, InspectedMedia, InspectedVideoVariant } from "@/types/media";
import { sanitizeFilename } from "@/lib/format";
import { mapExtractorError } from "@/lib/extractor-errors";
import { JOBS_DIR, completeJob, failJob, updateJob, attachChild } from "./jobs";

export const mediaUrlSchema = z
  .string()
  .trim()
  .min(8, "That link is too short.")
  .max(2048, "That link is too long.")
  .url("That doesn't look like a valid URL.")
  .refine((u) => {
    try {
      const p = new URL(u);
      return p.protocol === "http:" || p.protocol === "https:";
    } catch {
      return false;
    }
  }, "Only http(s) links are supported.")
  .refine((u) => !isPrivateHost(u), "That host isn't supported.");

export function isPrivateHost(u: string): boolean {
  try {
    const { hostname } = new URL(u);
    const h = hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal")) return true;
    if (/^\[?::1\]?$/.test(h)) return true;
    const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (m) {
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (a === 10 || a === 127 || a === 0) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
    }
    return false;
  } catch {
    return true;
  }
}

const YTDLP = "yt-dlp";

/**
 * Operator-only network config. Never exposed through the UI.
 * YTDLP_PROXY is a proxy URL; YTDLP_COOKIES is a path to a cookies.txt file.
 * Both are opt-in and only read at process start, not per request.
 */
function networkArgs(): string[] {
  const args: string[] = [];
  const proxy = process.env.YTDLP_PROXY?.trim();
  if (proxy) args.push("--proxy", proxy);
  const cookies = process.env.YTDLP_COOKIES?.trim();
  if (cookies && fs.existsSync(cookies)) args.push("--cookies", cookies);
  return args;
}

function runCapture(args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("The source took too long to answer. Try again."));
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

/* ---------------- inspect ---------------- */

interface RawFormat {
  format_id?: string;
  ext?: string;
  height?: number | null;
  width?: number | null;
  vcodec?: string | null;
  acodec?: string | null;
  abr?: number | null;
  tbr?: number | null;
  vbr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
  fps?: number | null;
}

function rawBytes(f: RawFormat, durationSec: number | null): number | null {
  if (f.filesize && f.filesize > 0) return f.filesize;
  if (f.filesize_approx && f.filesize_approx > 0) return f.filesize_approx;
  const kbps = f.tbr ?? f.vbr ?? f.abr;
  if (kbps && durationSec) return Math.round((kbps * 1000 * durationSec) / 8);
  return null;
}

export type InspectResult =
  | { ok: true; media: InspectedMedia }
  | { ok: false; message: string };

/* Short-TTL cache for inspection results — the source data doesn't change
   meaningfully minute to minute, and asking twice in a row is common. */
const INSPECT_TTL_MS = 10 * 60 * 1000;
const INSPECT_CACHE_MAX = 100;
const ig = globalThis as unknown as { __toolboxInspectCache?: Map<string, { media: InspectedMedia; expiresAt: number }> };
const inspectCache = (ig.__toolboxInspectCache ??= new Map());

function cacheGet(url: string): InspectedMedia | null {
  const hit = inspectCache.get(url);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    inspectCache.delete(url);
    return null;
  }
  return hit.media;
}
function cacheSet(url: string, media: InspectedMedia) {
  if (inspectCache.size >= INSPECT_CACHE_MAX) {
    const oldest = inspectCache.keys().next().value;
    if (oldest !== undefined) inspectCache.delete(oldest);
  }
  inspectCache.set(url, { media, expiresAt: Date.now() + INSPECT_TTL_MS });
}

export async function inspectUrl(rawUrl: string): Promise<InspectResult> {
  const parsed = mediaUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Enter a valid link." };
  }
  const url = parsed.data;

  const cached = cacheGet(url);
  if (cached) return { ok: true, media: cached };

  let res: { stdout: string; stderr: string; code: number | null };
  try {
    res = await runCapture(
      ["--dump-single-json", "--no-playlist", "--skip-download", "--no-warnings", "--socket-timeout", "12", "--retries", "2", ...networkArgs(), url],
      50_000,
    );
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach the source." };
  }
  if (res.code !== 0) {
    return { ok: false, message: mapExtractorError(res.stderr) };
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(res.stdout);
  } catch {
    return { ok: false, message: "The source returned an unreadable response." };
  }

  const durationSec = typeof data.duration === "number" ? data.duration : null;
  const formats = Array.isArray(data.formats) ? (data.formats as RawFormat[]) : [];

  const videoOnly = formats.filter((f) => f.height && f.vcodec && f.vcodec !== "none");
  const audioOnly = formats.filter((f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none");

  const hasAudio = formats.some((f) => f.acodec && f.acodec !== "none");
  const hasVideo = videoOnly.length > 0;

  // Best audio stream (highest bitrate with a size, else highest bitrate).
  const bestAudio = [...audioOnly].sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0] ?? null;
  const bestAudioBytes = bestAudio ? rawBytes(bestAudio, durationSec) : null;
  const audioBitrateKbps = bestAudio?.abr ? Math.round(bestAudio.abr) : null;

  // Best video variant per (height, container), preferring mp4/webm.
  const variantMap = new Map<string, InspectedVideoVariant>();
  for (const f of videoOnly) {
    const container = f.ext === "webm" ? "webm" : f.ext === "mp4" ? "mp4" : null;
    if (!container || !f.height) continue;
    const key = `${f.height}:${container}`;
    const bytes = rawBytes(f, durationSec);
    const combined = bytes != null && bestAudioBytes != null ? bytes + bestAudioBytes : bytes;
    const candidate: InspectedVideoVariant = {
      height: f.height,
      container,
      vcodec: f.vcodec ?? null,
      vbitrateKbps: f.tbr ? Math.round(f.tbr) : null,
      estimatedBytes: combined,
    };
    const existing = variantMap.get(key);
    const score = (c: InspectedVideoVariant) => c.vbitrateKbps ?? (c.estimatedBytes ? c.estimatedBytes / 1000 : 0);
    if (!existing || score(candidate) > score(existing)) variantMap.set(key, candidate);
  }

  const videoVariants = [...variantMap.values()].sort((a, b) => a.height - b.height || a.container.localeCompare(b.container));
  const maxHeight = videoVariants.reduce((m, v) => Math.max(m, v.height), 0) || null;

  // Thumbnail: prefer the largest reported https thumbnail.
  const thumbnails = Array.isArray(data.thumbnails) ? (data.thumbnails as { url?: string; width?: number }[]) : [];
  const thumb =
    [...thumbnails]
      .filter((t) => t.url?.startsWith("https://"))
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ??
    (typeof data.thumbnail === "string" && data.thumbnail.startsWith("https://") ? data.thumbnail : null);

  const media: InspectedMedia = {
    id: String(data.id ?? ""),
    title: typeof data.title === "string" ? data.title : "Untitled media",
    webpageUrl: typeof data.webpage_url === "string" ? data.webpage_url : url,
    extractor: String(data.extractor_key ?? data.extractor ?? "Unknown source"),
    uploader: typeof data.uploader === "string" ? data.uploader : null,
    durationSec,
    viewCount: typeof data.view_count === "number" ? data.view_count : null,
    uploadDate: typeof data.upload_date === "string" ? data.upload_date : null,
    thumbnail: thumb,
    maxHeight,
    hasVideo,
    hasAudio,
    videoVariants,
    bestAudioBytes,
    audioBitrateKbps,
  };
  cacheSet(url, media);
  return { ok: true, media };
}

/* ---------------- download jobs ---------------- */

export function startDownload(jobId: string, url: string, title: string | null, selection: DownloadSelection) {
  const jobDir = path.join(/* turbopackIgnore: true */ JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  const template = path.join(jobDir, "source.%(ext)s");

  const args: string[] = [
    "--no-playlist",
    "--newline",
    "--no-colors",
    "--no-warnings",
    "--socket-timeout", "15",
    "--retries", "3",
    "-o", template,
    ...networkArgs(),
  ];

  let expectedExt: string;
  if (selection.mode === "audio") {
    const fmt = selection.audioFormat ?? "mp3";
    args.push("-x", "--audio-format", fmt);
    if (fmt !== "wav") {
      const br = selection.audioBitrate ?? 192;
      args.push("--postprocessor-args", `ffmpeg:-b:a ${br}k`);
    }
    expectedExt = fmt;
  } else {
    const height = selection.height;
    const container = selection.container ?? "mp4";
    const hFilter = height ? `[height<=${height}]` : "";
    if (container === "webm") {
      args.push("-f", `bv*${hFilter}[ext=webm]+ba/b${hFilter}[ext=webm]/bv*${hFilter}+ba/b`);
      args.push("--merge-output-format", "webm");
      expectedExt = "webm";
    } else {
      args.push("-f", `bv*${hFilter}[ext=mp4]+ba[ext=m4a]/bv*${hFilter}[ext=mp4]+ba/b${hFilter}[ext=mp4]/b${hFilter}/bv*+ba/b`);
      args.push("--merge-output-format", "mp4");
      expectedExt = "mp4";
    }
  }
  args.push(url);

  const child = spawn(YTDLP, args, { stdio: ["ignore", "pipe", "pipe"] });
  attachChild(jobId, child);
  updateJob(jobId, { stage: "Downloading", percent: 0 });

  let stderrTail = "";
  let stdoutRest = "";

  const handleLine = (line: string) => {
    const l = line.trim();
    if (!l) return;
    if (l.startsWith("[download]")) {
      const m = l.match(/([\d.]+)%/);
      const speed = l.match(/at\s+([^\s]+)/)?.[1] ?? null;
      const eta = l.match(/ETA\s+([^\s]+)/)?.[1] ?? null;
      const patch: Parameters<typeof updateJob>[1] = { stage: "Downloading" };
      if (m) patch.percent = Math.min(99, Number.parseFloat(m[1]));
      if (speed) patch.speed = speed;
      if (eta) patch.eta = eta;
      updateJob(jobId, patch);
      return;
    }
    if (l.startsWith("[Merger]") || l.startsWith("[VideoRemuxer]")) {
      updateJob(jobId, { stage: "Merging streams", percent: 99, speed: null, eta: null });
      return;
    }
    if (l.startsWith("[ExtractAudio]")) {
      updateJob(jobId, { stage: "Extracting audio", percent: 99, speed: null, eta: null });
      return;
    }
  };

  const pump = (chunk: Buffer, which: "out" | "err") => {
    const text = chunk.toString("utf8");
    if (which === "err") stderrTail = (stderrTail + text).split("\n").slice(-40).join("\n");
    stdoutRest += text;
    const lines = stdoutRest.split("\n");
    stdoutRest = lines.pop() ?? "";
    for (const line of lines) handleLine(line);
  };
  child.stdout.on("data", (d: Buffer) => pump(d, "out"));
  child.stderr.on("data", (d: Buffer) => pump(d, "err"));

  child.on("error", () => failJob(jobId, "Couldn't start yt-dlp on this server."));
  child.on("close", (code) => {
    if (code !== 0) {
      failJob(jobId, mapExtractorError(stderrTail));
      return;
    }
    try {
      const files = fs
        .readdirSync(jobDir)
        .filter((f) => !f.endsWith(".part") && !f.endsWith(".ytdl"));
      const produced = files.find((f) => f.startsWith("source.")) ?? files[0];
      if (!produced) {
        failJob(jobId, "The source finished but no file was produced.");
        return;
      }
      const ext = path.extname(produced).slice(1) || expectedExt;
      const safeTitle = sanitizeFilename(title ?? "media", "media").replace(/\.(mp4|webm|mp3|wav|aac|mkv|m4a)$/i, "");
      const filename = `${safeTitle}.${ext}`;
      const finalPath = path.join(/* turbopackIgnore: true */ jobDir, filename);
      fs.renameSync(path.join(/* turbopackIgnore: true */ jobDir, produced), finalPath);
      const stat = fs.statSync(finalPath);
      if (stat.size === 0) {
        failJob(jobId, "The source produced an empty file.");
        return;
      }
      completeJob(jobId, finalPath, filename, stat.size, title);
    } catch {
      failJob(jobId, "Couldn't finalise the downloaded file.");
    }
  });
}
