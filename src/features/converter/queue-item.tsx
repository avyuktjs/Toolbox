"use client";

import { useEffect, useRef } from "react";
import {
  Film,
  Music,
  X,
  AlertCircle,
  Loader2,
  Save,
  Video,
  AudioLines,
  Scissors,
} from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes, formatDuration } from "@/lib/format";
import { useJobPolling } from "@/features/shared/use-job";
import { Odometer } from "@/components/motion/odometer";
import type {
  ConvertIntent,
  VideoTarget,
  AudioTarget,
  VideoQuality,
  ProbedFile,
  JobSnapshot,
} from "@/types/media";

export interface QueueItem {
  id: string;
  name: string;
  size: number;
  stage: "ready" | "converting" | "done" | "error";
  error: string | null;
  probe: ProbedFile | null;
  intent: ConvertIntent;
  videoTarget: VideoTarget;
  audioTarget: AudioTarget;
  videoQuality: VideoQuality;
  videoCrf: number;
  audioBitrate: 128 | 192 | 320;
  jobId: string | null;
  /** Output filename once finished, for the save button. */
  outputName?: string | null;
}

export function itemDetail(item: QueueItem): string {
  if (item.intent === "video") {
    return `${item.videoTarget.toUpperCase()} · CRF ${item.videoCrf}`;
  }
  const fmt = item.audioTarget.toUpperCase();
  if (item.audioTarget === "wav") return `${fmt} · Lossless`;
  return item.intent === "extract" ? `Extract → ${fmt} · ${item.audioBitrate} kbps` : `${fmt} · ${item.audioBitrate} kbps`;
}

/** Polls the item's job once it's running. Renders nothing itself — parent renders controls. */
function useItemJob(item: QueueItem, onSettled: (item: QueueItem, job: JobSnapshot) => void) {
  const { job, cancel } = useJobPolling(item.stage === "converting" ? item.jobId : null);
  const settledRef = useRef(false);
  useEffect(() => {
    settledRef.current = false;
  }, [item.jobId]);
  useEffect(() => {
    if (job && job.state !== "running" && !settledRef.current) {
      settledRef.current = true;
      onSettled(item, job);
    }
  }, [job, item, onSettled]);
  return { job, cancel };
}

export function QueueItemCard({
  item,
  onChange,
  onRemove,
  onConvert,
  onSettled,
}: {
  item: QueueItem;
  onChange: (patch: Partial<QueueItem>) => void;
  onRemove: () => void;
  onConvert: () => void;
  onSettled: (item: QueueItem, job: JobSnapshot) => void;
}) {
  const { job, cancel } = useItemJob(item, onSettled);
  const probe = item.probe;
  const hasVideo = !!probe?.video;
  const hasAudio = !!probe?.audio;
  const running = item.stage === "converting";
  const done = item.stage === "done";

  return (
    <article className="overflow-hidden rounded-[8px] border border-line2 bg-panel">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[6px] border border-line bg-sunken text-ink2">
          {hasVideo ? <Film className="size-4" /> : <Music className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink" title={item.name}>
            {item.name}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
            {formatBytes(item.size)}
            {probe?.durationSec != null && <> · {formatDuration(probe.durationSec)}</>}
            {probe?.video?.height ? <> · {probe.video.height}p</> : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={running}
          aria-label="Remove from tray"
          className="grid size-8 shrink-0 place-items-center rounded-[6px] text-ink3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* probe meta chips */}
      {probe && (
        <div className="flex flex-wrap gap-1.5 border-b border-line px-3.5 py-2">
          {probe.video?.codec && (
            <MetaChip>{probe.video.codec.toUpperCase()}{probe.video.width ? ` ${probe.video.width}×${probe.video.height}` : ""}</MetaChip>
          )}
          {probe.video?.fps ? <MetaChip>{probe.video.fps} FPS</MetaChip> : null}
          {probe.audio?.codec && <MetaChip>{probe.audio.codec.toUpperCase()} AUDIO</MetaChip>}
          {probe.audio?.bitrateKbps ? <MetaChip>{probe.audio.bitrateKbps} KBPS</MetaChip> : null}
          {!hasVideo && <MetaChip>AUDIO ONLY</MetaChip>}
        </div>
      )}

      {/* controls / states */}
      <div className="p-3.5">
        {item.stage === "error" ? (
          <div className="rounded-[6px] border border-danger/40 bg-danger-soft px-3 py-2.5">
            <p className="flex items-start gap-2 text-[12px] font-medium leading-snug text-danger">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {item.error ?? "Conversion failed."}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={onConvert}>
                Try again
              </Button>
              <Button size="sm" variant="ghost" onClick={onRemove}>
                Remove
              </Button>
            </div>
          </div>
        ) : done ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-ok/40 bg-ok-soft px-3 py-2.5">
            <div className="min-w-0">
              <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.22em] text-ok">Converted</p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-ink">{item.outputName ?? "output"}</p>
            </div>
            {item.jobId ? (
              <Button asChild size="sm" variant="primary">
                <a href={`/api/jobs/${item.jobId}/file`} download>
                  <Save /> Save
                </a>
              </Button>
            ) : null}
          </div>
        ) : running && job ? (
          <div aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink2">
                <Loader2 className="size-3.5 animate-spin text-accent" /> {job.stage}
              </span>
              <span className="t-tabular font-display text-xl font-black tracking-[-0.02em] text-ink">
                {job.percent == null ? "––" : Math.floor(job.percent)}<span className="text-accent">%</span>
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-[3px] bg-sunken"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={job.percent ?? undefined}
              aria-label="Conversion progress"
            >
              <div
                className="h-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(1.5, job.percent ?? 4)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] text-ink3 t-tabular">{job.speed ?? ""}</span>
              <Button size="sm" variant="ghost" onClick={() => cancel()} className="h-7 text-[11px] text-danger hover:bg-danger-soft hover:text-danger">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* intent */}
            <Segmented
              ariaLabel="What to do with this file"
              size="sm"
              value={item.intent}
              onChange={(intent) => onChange({ intent })}
              options={[
                { value: "video", label: "Video", icon: <Video className="size-3.5" />, disabled: !hasVideo, title: hasVideo ? "Transcode the video stream" : "No video stream in this file" },
                { value: "audio", label: "Audio", icon: <AudioLines className="size-3.5" />, disabled: !hasAudio, title: hasAudio ? "Re-encode the audio track" : "No audio stream in this file" },
                { value: "extract", label: "Extract", icon: <Scissors className="size-3.5" />, disabled: !hasVideo, title: hasVideo ? "Pull the audio out of the video" : "No video stream to extract from" },
              ]}
              className="w-full justify-center"
            />

            {item.intent === "video" ? (
              <>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Output container">
                  {(["mp4", "webm"] as const).map((t) => (
                    <TargetChip key={t} active={item.videoTarget === t} onClick={() => onChange({ videoTarget: t })}>
                      {t.toUpperCase()}
                      <span className="font-mono text-[8px] font-normal opacity-70">{t === "mp4" ? "H.264" : "VP9"}</span>
                    </TargetChip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Video quality">
                  {(["high", "balanced", "compact"] as const).map((q) => {
                    const crf = q === "high" ? 18 : q === "balanced" ? 23 : 28;
                    return (
                      <TargetChip key={q} active={item.videoCrf === crf} onClick={() => onChange({ videoQuality: q, videoCrf: crf })}>
                        {q === "high" ? "High" : q === "balanced" ? "Balanced" : "Compact"}
                        <span className="font-mono text-[8px] font-normal opacity-70">CRF {crf}</span>
                      </TargetChip>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 pt-0.5">
                  <div className="flex flex-col">
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-ink3">
                      CRF
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink3/70">
                      0 lossless → 51 small
                    </span>
                  </div>
                  <Odometer
                    start={item.videoCrf}
                    min={0}
                    max={51}
                    bounce={40}
                    stagger={45}
                    blur={50}
                    corner={14}
                    ariaLabel="CRF quality, 0 to 51"
                    onChange={(crf) =>
                      onChange({
                        videoCrf: crf,
                        videoQuality: crf <= 19 ? "high" : crf <= 26 ? "balanced" : "compact",
                      })
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Output audio format">
                  {(["mp3", "wav", "aac"] as const).map((t) => (
                    <TargetChip key={t} active={item.audioTarget === t} onClick={() => onChange({ audioTarget: t })}>
                      {t.toUpperCase()}
                      <span className="font-mono text-[8px] font-normal opacity-70">
                        {t === "wav" ? "LOSSLESS" : t === "mp3" ? "UNIVERSAL" : "COMPACT"}
                      </span>
                    </TargetChip>
                  ))}
                </div>
                {item.audioTarget !== "wav" && (
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Audio bitrate">
                    {([128, 192, 320] as const).map((b) => (
                      <TargetChip key={b} active={item.audioBitrate === b} onClick={() => onChange({ audioBitrate: b })}>
                        {b}<span className="font-mono text-[8px] font-normal opacity-70">KBPS</span>
                      </TargetChip>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
                {itemDetail(item)}
              </span>
              <Button size="sm" variant="primary" onClick={onConvert}>
                Convert
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[4px] border border-line bg-sunken px-1.5 py-0.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.12em] text-ink2">
      {children}
    </span>
  );
}

function TargetChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-[7px] border px-3 text-[12px] font-semibold tracking-[-0.01em] transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-line2 bg-panel text-ink2 hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
