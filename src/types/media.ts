/* Shared contract between server and client. */

export type JobKind = "download" | "convert";
export type JobState = "running" | "complete" | "error";

export interface JobSnapshot {
  id: string;
  kind: JobKind;
  state: JobState;
  /** Human-readable stage, e.g. "Downloading", "Merging streams", "Transcoding". */
  stage: string;
  /** 0–100, or null while indeterminate. */
  percent: number | null;
  /** e.g. "2.3 MB/s" */
  speed: string | null;
  /** e.g. "00:12" */
  eta: string | null;
  filename: string | null;
  size: number | null;
  error: string | null;
  title: string | null;
  createdAt: number;
  finishedAt: number | null;
  /** Path to save output, or null while running / on failure. */
  downloadUrl: string | null;
}

/* ---------- inspect (downloader) ---------- */

export interface InspectedVideoVariant {
  height: number;
  container: "mp4" | "webm";
  vcodec: string | null;
  vbitrateKbps: number | null;
  /** Estimated *combined* size (video + best audio) when the source reports it. */
  estimatedBytes: number | null;
}

export interface InspectedMedia {
  id: string;
  title: string;
  webpageUrl: string;
  extractor: string;
  uploader: string | null;
  durationSec: number | null;
  viewCount: number | null;
  uploadDate: string | null;
  thumbnail: string | null;
  maxHeight: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  /** Best variant per (height, container), sorted by height. */
  videoVariants: InspectedVideoVariant[];
  /** Source audio stream estimate, used for combined-size math. */
  bestAudioBytes: number | null;
  audioBitrateKbps: number | null;
}

export interface DownloadSelection {
  mode: "video" | "audio";
  container?: "mp4" | "webm";
  height?: number;
  audioFormat?: "mp3" | "wav" | "aac";
  audioBitrate?: 128 | 192 | 320;
}

/* ---------- converter ---------- */

export interface ProbeStream {
  codec: string | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  bitrateKbps?: number | null;
}

export interface ProbedFile {
  uploadId: string;
  name: string;
  size: number;
  durationSec: number | null;
  video: ProbeStream | null;
  audio: ProbeStream | null;
  formatName: string | null;
}

export type ConvertIntent = "video" | "audio" | "extract";
export type VideoTarget = "mp4" | "webm";
export type AudioTarget = "mp3" | "wav" | "aac";
export type VideoQuality = "high" | "balanced" | "compact";

export interface ConvertRequest {
  uploadId: string;
  intent: ConvertIntent;
  videoTarget?: VideoTarget;
  audioTarget?: AudioTarget;
  videoQuality?: VideoQuality;
  /** Custom CRF (0–51). Overrides videoQuality when set. */
  videocrf?: number;
  audioBitrate?: 128 | 192 | 320;
}

/* ---------- history ---------- */

export interface HistoryEntry {
  id: string;
  kind: JobKind;
  title: string;
  detail: string;
  size: number | null;
  createdAt: number;
  downloadPath: string;
}
