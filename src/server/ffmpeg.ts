/* ffprobe / ffmpeg integration for the local-file converter. */

import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { JOBS_DIR, completeJob, failJob, updateJob, attachChild, deleteUpload, getUpload } from "./jobs";
import { sanitizeFilename } from "@/lib/format";
import type { ConvertRequest, ConvertIntent, ProbedFile } from "@/types/media";

const FFMPEG = "ffmpeg";
const FFPROBE = "ffprobe";

/* Allowed input extensions — container gate before we ever touch ffmpeg. */
export const ALLOWED_EXTENSIONS = new Set([
  "mp4", "mkv", "webm", "mov", "avi", "m4v",
  "mp3", "wav", "m4a", "aac", "flac", "ogg", "opus",
]);
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024; // 300 MB

export async function probeFile(filePath: string): Promise<Omit<ProbedFile, "uploadId" | "name" | "size">> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      FFPROBE,
      ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("ffprobe timed out."));
    }, 15_000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error("That file couldn't be read as media. It may be corrupt or an unsupported codec."));
        return;
      }
      try {
        resolve(normalizeProbe(JSON.parse(out)));
      } catch {
        reject(new Error("That file couldn't be read as media."));
      }
    });
  });
}

interface RawStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  bit_rate?: string;
}
interface RawProbe {
  format?: { duration?: string; format_name?: string };
  streams?: RawStream[];
}

function fpsFrom(rate: string | undefined): number | null {
  if (!rate) return null;
  const [a, b] = rate.split("/").map(Number);
  if (!b || Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a / b) * 100) / 100;
}

function normalizeProbe(raw: RawProbe) {
  const streams = raw.streams ?? [];
  const v = streams.find((s) => s.codec_type === "video" && s.codec_name !== "mjpeg");
  const a = streams.find((s) => s.codec_type === "audio");
  const durationSec = raw.format?.duration ? Number(raw.format.duration) : null;
  return {
    durationSec: durationSec && Number.isFinite(durationSec) ? durationSec : null,
    formatName: raw.format?.format_name ?? null,
    video: v
      ? {
          codec: v.codec_name ?? null,
          width: v.width ?? null,
          height: v.height ?? null,
          fps: fpsFrom(v.avg_frame_rate),
          bitrateKbps: v.bit_rate ? Math.round(Number(v.bit_rate) / 1000) : null,
        }
      : null,
    audio: a
      ? {
          codec: a.codec_name ?? null,
          bitrateKbps: a.bit_rate ? Math.round(Number(a.bit_rate) / 1000) : null,
        }
      : null,
  };
}

/* ---------------- convert ---------------- */

const VIDEO_CRF: Record<"high" | "balanced" | "compact", { x264: number; vp9: number }> = {
  high: { x264: 18, vp9: 28 },
  balanced: { x264: 23, vp9: 33 },
  compact: { x264: 28, vp9: 38 },
};

export function convertPlan(intent: ConvertIntent, req: ConvertRequest) {
  if (intent === "video") {
    const target = req.videoTarget ?? "mp4";
    const quality = req.videoQuality ?? "balanced";
    const defaults = VIDEO_CRF[quality];
    const x264crf = req.videocrf ?? defaults.x264;
    const vp9crf = req.videocrf != null ? Math.min(63, Math.round(req.videocrf * 1.5) + 4) : defaults.vp9;
    const crf = { x264: x264crf, vp9: vp9crf };
    if (target === "webm") {
      return {
        ext: "webm",
        args: [
          "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf.vp9),
          "-deadline", "good", "-cpu-used", "4", "-row-mt", "1",
          "-c:a", "libopus", "-b:a", "128k",
        ],
      };
    }
    return {
      ext: "mp4",
      args: [
        "-c:v", "libx264", "-preset", "medium", "-crf", String(crf.x264),
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
      ],
    };
  }
  const target = req.audioTarget ?? "mp3";
  const bitrate = req.audioBitrate ?? 192;
  if (target === "wav") return { ext: "wav", args: ["-vn", "-c:a", "pcm_s16le"] };
  if (target === "aac") return { ext: "aac", args: ["-vn", "-c:a", "aac", "-b:a", `${bitrate}k`] };
  return { ext: "mp3", args: ["-vn", "-c:a", "libmp3lame", "-b:a", `${bitrate}k`] };
}

export function startConvert(jobId: string, req: ConvertRequest) {
  const record = getUpload(req.uploadId);
  if (!record) {
    failJob(jobId, "That upload expired. Add the file again.");
    return;
  }

  const intent: ConvertIntent = req.intent;
  const plan = convertPlan(intent, req);
  const jobDir = path.join(/* turbopackIgnore: true */ JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const base = sanitizeFilename(path.basename(record.name, path.extname(record.name)), "converted");
  const filename = `${base}.${plan.ext}`;
  const outputPath = path.join(/* turbopackIgnore: true */ jobDir, filename);

  const durationSec = record.durationSec;
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-nostats",
    "-progress", "pipe:1",
    "-i", record.path,
    ...plan.args,
    outputPath,
  ];

  const child = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
  attachChild(jobId, child);
  updateJob(jobId, { stage: intent === "video" ? "Transcoding" : "Extracting audio", percent: 0 });

  let stderrTail = "";
  let stdoutRest = "";

  const handleLine = (line: string) => {
    const idx = line.indexOf("=");
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key === "out_time_us" && durationSec && durationSec > 0) {
      const seconds = Number(value) / 1_000_000;
      const pct = Math.max(0, Math.min(99, Math.floor((seconds / durationSec) * 100)));
      updateJob(jobId, { percent: Number.isFinite(pct) ? pct : 0 });
    } else if (key === "speed") {
      updateJob(jobId, { speed: value });
    } else if (key === "progress" && value === "end") {
      updateJob(jobId, { percent: 99 });
    }
  };

  const pump = (chunk: Buffer, which: "out" | "err") => {
    const text = chunk.toString("utf8");
    if (which === "err") stderrTail = (stderrTail + text).split("\n").slice(-20).join("\n");
    stdoutRest += text;
    const lines = stdoutRest.split("\n");
    stdoutRest = lines.pop() ?? "";
    for (const line of lines) handleLine(line);
  };
  child.stdout.on("data", (d: Buffer) => pump(d, "out"));
  child.stderr.on("data", (d: Buffer) => pump(d, "err"));

  child.on("error", () => failJob(jobId, "Couldn't start ffmpeg on this server."));
  child.on("close", (code) => {
    // Upload consumed (or not) — drop it either way to keep the temp dir honest.
    deleteUpload(req.uploadId);
    if (code !== 0) {
      const msg = stderrTail.split("\n").map((l) => l.trim()).filter(Boolean).pop();
      failJob(jobId, msg ? `ffmpeg failed: ${msg.slice(0, 180)}` : "ffmpeg couldn't convert that file.");
      return;
    }
    try {
      const stat = fs.statSync(/* turbopackIgnore: true */ outputPath);
      if (stat.size === 0) {
        failJob(jobId, "ffmpeg produced an empty file.");
        return;
      }
      completeJob(jobId, outputPath, filename, stat.size, record.name);
    } catch {
      failJob(jobId, "Couldn't finalise the converted file.");
    }
  });
}
