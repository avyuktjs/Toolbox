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
import { JOBS_DIR, completeJob, failJob, updateJob, attachChild, getJobSnapshot } from "./jobs";

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
const FFPROBE = "ffprobe";

/**
 * Operator-only network config. Never exposed through the UI.
 * YTDLP_PROXY is a proxy URL; YTDLP_COOKIES is a path to a cookies.txt file;
 * YTDLP_COOKIES_FROM_BROWSER names a local browser profile (e.g. firefox).
 * All are opt-in and only read at process start, not per request.
 */
function networkArgs(): string[] {
  const args: string[] = [];
  const proxy = process.env.YTDLP_PROXY?.trim();
  if (proxy) args.push("--proxy", proxy);
  const cookies = process.env.YTDLP_COOKIES?.trim();
  if (cookies && fs.existsSync(cookies)) {
    args.push("--cookies", cookies);
  } else {
    const browser = process.env.YTDLP_COOKIES_FROM_BROWSER?.trim();
    if (browser) args.push("--cookies-from-browser", browser);
  }
  return args;
}

function isYouTubeUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube-nocookie.com")
    );
  } catch {
    return false;
  }
}

/**
 * YouTube's player clients fail independently: one gets a bot challenge while
 * another still answers. These are tried in order when the default client is
 * challenged. The last one asks yt-dlp for every client it knows about.
 */
const YOUTUBE_FALLBACKS: string[][] = [
  ["--extractor-args", "youtube:player_client=tv_embedded"],
  ["--extractor-args", "youtube:player_client=android_vr"],
  ["--extractor-args", "youtube:player_client=visionos"],
  ["--extractor-args", "youtube:player_client=web_embedded"],
  ["--extractor-args", "youtube:player_client=default,all;formats=duplicate,missing_pot"],
];

/** A YouTube failure that another player client might solve. */
function isRetryableYoutubeFailure(stderr: string): boolean {
  const text = stderr.toLowerCase();
  if (
    /private video|video is private|members-only|has been removed|terminated|copyright|does not exist|account.*(closed|terminated)/.test(
      text,
    )
  ) {
    return false;
  }
  // "Unavailable" is client-specific surprisingly often: YouTube says it to
  // one player while another still returns the video, so try the others.
  return /sign in to confirm|not a bot|login_required|use --cookies|cookies-from-browser|no video formats|no formats found|page needs to be reloaded|unable to extract|failed to extract|requested format is not available|only images are available|unable to download video data|http error (403|429)|forbidden|too many requests|temporarily unavailable|video unavailable|this video is unavailable|video is unavailable/.test(
    text,
  );
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

/** Inspect a URL, retrying YouTube with other player clients when challenged. */
async function captureInspect(url: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const baseArgs = [
    "--dump-single-json",
    "--no-playlist",
    "--skip-download",
    "--no-warnings",
    "--socket-timeout",
    "12",
    "--retries",
    "2",
    ...networkArgs(),
  ];
  // Fallbacks are bounded: a challenged host must not turn one inspection
  // into a long queue of extractor processes.
  const deadline = Date.now() + 90_000;
  let last = await runCapture([...baseArgs, url], 40_000);
  if (last.code === 0 || !isYouTubeUrl(url) || !isRetryableYoutubeFailure(last.stderr)) return last;

  let lastError: unknown = null;
  for (const extra of YOUTUBE_FALLBACKS) {
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;
    try {
      last = await runCapture([...baseArgs, ...extra, url], Math.min(25_000, remaining));
    } catch (err) {
      lastError = err;
      continue;
    }
    if (last.code === 0) return last;
    if (!isRetryableYoutubeFailure(last.stderr)) return last;
  }
  if (lastError && last.code !== 0) throw lastError;
  return last;
}

/* ---------------- direct-file probing ---------------- */

interface RawProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  bit_rate?: string;
  disposition?: { attached_pic?: number };
}

interface RawProbe {
  streams?: RawProbeStream[];
  format?: {
    duration?: string;
    size?: string;
    format_name?: string;
    tags?: Record<string, string>;
  };
}

/**
 * Direct media links (a plain .mp4, for example) come back from yt-dlp with no
 * codec, height or duration metadata. ffprobe fills those in so the picker can
 * offer a real resolution instead of showing an empty dossier.
 */
function probeDirectMedia(url: string): Promise<RawProbe | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: RawProbe | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(
        FFPROBE,
        ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", url],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch {
      done(null);
      return;
    }

    let stdout = "";
    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        /* already gone */
      }
      done(null);
    }, 20_000);

    child.stdout?.on("data", (d: Buffer) => (stdout += d));
    child.on("error", () => {
      clearTimeout(timer);
      done(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        done(null);
        return;
      }
      try {
        done(JSON.parse(stdout) as RawProbe);
      } catch {
        done(null);
      }
    });
  });
}

function containerFromProbe(url: string, formatName: string | null, codec: string | null): "mp4" | "webm" | null {
  let ext = "";
  try {
    ext = path.extname(new URL(url).pathname).slice(1).toLowerCase();
  } catch {
    /* ignore */
  }
  if (ext === "mp4" || ext === "m4v" || ext === "mov") return "mp4";
  if (ext === "webm") return "webm";
  const format = (formatName ?? "").toLowerCase();
  if (format.includes("webm")) return "webm";
  if (format.includes("mp4") || format.includes("mov")) return "mp4";
  if (codec === "vp8" || codec === "vp9" || codec === "av1") return "webm";
  return codec ? "mp4" : null;
}

function applyProbe(base: InspectedMedia, probe: RawProbe, url: string): InspectedMedia {
  const streams = probe.streams ?? [];
  const videoStream = streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const audioStream = streams.find((s) => s.codec_type === "audio");
  const duration = probe.format?.duration ? Number.parseFloat(probe.format.duration) : null;
  const totalBytes = probe.format?.size ? Number.parseInt(probe.format.size, 10) : null;
  const audioBytes =
    audioStream?.bit_rate && duration ? Math.round((Number(audioStream.bit_rate) * duration) / 8) : null;
  const videoBytes =
    videoStream?.bit_rate && duration ? Math.round((Number(videoStream.bit_rate) * duration) / 8) : null;
  const combined =
    totalBytes ?? (videoBytes != null || audioBytes != null ? (videoBytes ?? 0) + (audioBytes ?? 0) : null);
  const container = containerFromProbe(url, probe.format?.format_name ?? null, videoStream?.codec_name ?? null);
  const height = videoStream?.height ?? null;

  const variants: InspectedVideoVariant[] =
    videoStream && height && container
      ? [
          {
            height,
            container,
            vcodec: videoStream.codec_name ?? null,
            vbitrateKbps: videoStream.bit_rate ? Math.round(Number(videoStream.bit_rate) / 1000) : null,
            estimatedBytes: combined,
          },
        ]
      : [];

  const probedTitle = probe.format?.tags?.title?.trim();

  return {
    ...base,
    title: probedTitle || base.title,
    durationSec: base.durationSec ?? (duration != null && Number.isFinite(duration) ? duration : null),
    hasVideo: Boolean(videoStream),
    hasAudio: Boolean(audioStream),
    videoVariants: variants.length > 0 ? variants : base.videoVariants,
    maxHeight: height ?? base.maxHeight,
    bestAudioBytes: audioBytes ?? base.bestAudioBytes,
    audioBitrateKbps: audioStream?.bit_rate
      ? Math.round(Number(audioStream.bit_rate) / 1000)
      : base.audioBitrateKbps,
  };
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
    res = await captureInspect(url);
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

  let media: InspectedMedia = {
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

  // A direct media link gives yt-dlp no codec/dimension metadata. Probe it so
  // the picker isn't empty (this is also what makes the built-in demo useful).
  const directLike =
    data.direct === true ||
    (formats.length > 0 &&
      formats.every(
        (f) => !f.vcodec && !f.acodec && ["mp4", "webm", "m4a", "mp3", "aac", "wav"].includes(f.ext ?? ""),
      ));
  if ((!hasVideo || !hasAudio) && directLike) {
    const probe = await probeDirectMedia(url);
    if (probe) media = applyProbe(media, probe, url);
  }

  cacheSet(url, media);
  return { ok: true, media };
}

/* ---------------- download jobs ---------------- */

export function startDownload(jobId: string, url: string, title: string | null, selection: DownloadSelection) {
  const jobDir = path.join(/* turbopackIgnore: true */ JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  const template = path.join(jobDir, "source.%(ext)s");

  const baseArgs: string[] = [
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
    baseArgs.push("-x", "--audio-format", fmt);
    if (fmt !== "wav") {
      const br = selection.audioBitrate ?? 192;
      baseArgs.push("--postprocessor-args", `ffmpeg:-b:a ${br}k`);
    }
    expectedExt = fmt;
  } else {
    const height = selection.height;
    const container = selection.container ?? "mp4";
    const hFilter = height ? `[height<=${height}]` : "";
    if (container === "webm") {
      baseArgs.push("-f", `bv*${hFilter}[ext=webm]+ba/b${hFilter}[ext=webm]/bv*${hFilter}+ba/b`);
      baseArgs.push("--merge-output-format", "webm");
      expectedExt = "webm";
    } else {
      baseArgs.push("-f", `bv*${hFilter}[ext=mp4]+ba[ext=m4a]/bv*${hFilter}[ext=mp4]+ba/b${hFilter}[ext=mp4]/b${hFilter}/bv*+ba/b`);
      baseArgs.push("--merge-output-format", "mp4");
      expectedExt = "mp4";
    }
  }

  // Reuse the same fallback list as inspection so a format found on one
  // player client can still be downloaded by that client.
  const attempts: string[][] = isYouTubeUrl(url) ? [[], ...YOUTUBE_FALLBACKS] : [[]];
  let attempt = 0;
  let stderrTail = "";
  let stdoutRest = "";

  const clearJobDir = () => {
    for (const entry of fs.readdirSync(jobDir)) {
      fs.rmSync(path.join(jobDir, entry), { recursive: true, force: true });
    }
  };

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

  const finalise = () => {
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
  };

  const runAttempt = () => {
    if (attempt > 0) {
      updateJob(jobId, { stage: "Trying another player", percent: null, speed: null, eta: null });
    }
    stderrTail = "";
    stdoutRest = "";

    const child = spawn(YTDLP, [...baseArgs, ...attempts[attempt], url], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    attachChild(jobId, child);
    if (attempt === 0) updateJob(jobId, { stage: "Downloading", percent: 0 });

    child.stdout.on("data", (d: Buffer) => pump(d, "out"));
    child.stderr.on("data", (d: Buffer) => pump(d, "err"));

    child.on("error", () => failJob(jobId, "Couldn't start yt-dlp on this server."));
    child.on("close", (code) => {
      // The job may have been cancelled or swept while this attempt was
      // running — never resurrect it by finalising a stale child process.
      if (getJobSnapshot(jobId)?.state !== "running") return;

      if (code === 0) {
        finalise();
        return;
      }

      const canRetry =
        attempt + 1 < attempts.length && isRetryableYoutubeFailure(stderrTail);
      if (canRetry) {
        attempt += 1;
        try {
          clearJobDir();
        } catch {
          /* a file may still be settling; the next attempt overwrites it */
        }
        runAttempt();
        return;
      }

      failJob(jobId, mapExtractorError(stderrTail));
    });
  };

  runAttempt();
}
