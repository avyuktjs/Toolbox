"use client";

import { Film, AudioLines } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { formatBytes, formatDuration } from "@/lib/format";
import type { DownloadSelection, InspectedMedia } from "@/types/media";

export function estimateSelectionBytes(media: InspectedMedia, sel: DownloadSelection): number | null {
  if (sel.mode === "video") {
    const variant = media.videoVariants.find(
      (v) => v.container === sel.container && v.height === sel.height,
    );
    return variant?.estimatedBytes ?? null;
  }
  const fmt = sel.audioFormat ?? "mp3";
  if (fmt === "wav") {
    return media.durationSec ? Math.round((1411.2 * 1000 * media.durationSec) / 8) : null;
  }
  const kbps = sel.audioBitrate ?? 192;
  return media.durationSec ? Math.round((kbps * 1000 * media.durationSec) / 8) : null;
}

/** Plain-language summary, sentence case, no shouting. */
export function selectionSummary(media: InspectedMedia, sel: DownloadSelection): string {
  void media;
  if (sel.mode === "video") {
    const codec = sel.container === "webm" ? "VP9" : "H.264";
    return `${(sel.container ?? "mp4").toUpperCase()} · ${sel.height ?? "?"}p · ${codec} with AAC`;
  }
  const fmt = (sel.audioFormat ?? "mp3").toUpperCase();
  if (fmt === "WAV") return "WAV · lossless PCM";
  return `${fmt} · ${sel.audioBitrate ?? 192} kbps`;
}

/** Radio-card: two big readable options, not a row of chips. */
function OptionCard({
  active,
  title,
  sub,
  onClick,
  disabled = false,
}: {
  active: boolean;
  title: string;
  sub: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-150",
        active
          ? "border-ink bg-ink text-panel"
          : disabled
            ? "cursor-not-allowed border-line bg-sunken/40 text-ink3"
            : "border-line bg-panel text-ink hover:border-line2 hover:bg-sunken/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-full border-2 transition-colors",
          active ? "border-panel/80" : "border-line2",
        )}
      >
        {active && <span className="size-[8px] rounded-full bg-panel" />}
      </span>
      <span className="min-w-0">
        <span className={cn("block text-[14px] font-semibold leading-tight tracking-[-0.01em]", active ? "text-panel" : "text-ink")}>
          {title}
        </span>
        <span className={cn("mt-0.5 block text-[10.5px] leading-tight", active ? "text-panel/65" : "text-ink3")}>
          {sub}
        </span>
      </span>
    </button>
  );
}

/** A quality pill — the size estimate rides along underneath. */
function QualityPill({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex min-w-[4rem] flex-col items-center rounded-xl border px-3 pb-1.5 pt-2 transition-colors",
        active
          ? "border-ink bg-ink text-panel"
          : "border-line bg-panel text-ink hover:border-ink/40",
      )}
    >
      <span className={cn("text-[13px] font-bold leading-none tracking-[-0.01em]", active ? "text-panel" : "text-ink")}>
        {label}
      </span>
      {detail != null && (
        <span className={cn("mt-1 font-mono text-[8px] leading-none", active ? "text-panel/60" : "text-ink3")}>
          {detail}
        </span>
      )}
    </button>
  );
}

function preferredHeight(media: InspectedMedia, container: "mp4" | "webm"): number | undefined {
  const heights = [...new Set(media.videoVariants.filter((v) => v.container === container && v.height >= 360).map((v) => v.height))].sort((a, b) => a - b);
  if (heights.length === 0) return undefined;
  if (heights.includes(1080)) return 1080;
  return heights[heights.length - 1];
}

export function FormatSelector({
  media,
  selection,
  onChange,
}: {
  media: InspectedMedia;
  selection: DownloadSelection;
  onChange: (next: DownloadSelection) => void;
}) {
  const videoContainers = new Set(media.videoVariants.map((v) => v.container));
  const container = selection.container ?? "mp4";
  const heights = [...new Set(
    media.videoVariants.filter((v) => v.container === container && v.height >= 360).map((v) => v.height),
  )].sort((a, b) => a - b);

  const mode = selection.mode;
  const duration = media.durationSec;

  return (
    <div className="space-y-4">
      <Segmented
        ariaLabel="Media kind"
        value={mode}
        onChange={(next) =>
          onChange(
            next === "video"
              ? {
                  mode: "video",
                  container: videoContainers.has("mp4") ? "mp4" : "webm",
                  height: preferredHeight(media, videoContainers.has("mp4") ? "mp4" : "webm"),
                }
              : { mode: "audio", audioFormat: "mp3", audioBitrate: 192 },
          )
        }
        options={[
          { value: "video", label: "Video", icon: <Film className="size-3.5" />, disabled: !media.hasVideo, title: media.hasVideo ? "Video streams" : "No video streams in this source" },
          { value: "audio", label: "Audio", icon: <AudioLines className="size-3.5" />, disabled: !media.hasAudio, title: media.hasAudio ? "Audio streams" : "No audio streams in this source" },
        ]}
        className="w-full justify-center [&_button]:flex-1"
      />

      {mode === "video" ? (
        <>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-[12px] font-medium text-ink2">Format</p>
            </div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Container">
              {(["mp4", "webm"] as const).map((c) => {
                const available = videoContainers.has(c);
                return (
                  <OptionCard
                    key={c}
                    active={container === c}
                    disabled={!available}
                    title={c.toUpperCase()}
                    sub={
                      !available
                        ? "Not offered by this source"
                        : c === "mp4"
                          ? "H.264 · plays everywhere"
                          : "VP9 · smaller files"
                    }
                    onClick={() => {
                      const nextHeights = [...new Set(
                        media.videoVariants.filter((v) => v.container === c && v.height >= 360).map((v) => v.height),
                      )];
                      const keep = selection.height && nextHeights.includes(selection.height) ? selection.height : preferredHeight(media, c);
                      onChange({ mode: "video", container: c, height: keep });
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-[12px] font-medium text-ink2">Resolution</p>
              {heights.length > 0 && (
                <p className="text-[11px] text-ink3">{heights.length} available</p>
              )}
            </div>
            {heights.length === 0 ? (
              <p className="text-[12px] text-ink2">No {container.toUpperCase()} streams here — try the other.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Resolution">
                {heights.map((h) => {
                  const variant = media.videoVariants.find((v) => v.container === container && v.height === h);
                  const bytes = variant?.estimatedBytes;
                  return (
                    <QualityPill
                      key={h}
                      label={`${h}p`}
                      detail={bytes ? `~${formatBytes(bytes, 0)}` : null}
                      active={selection.height === h}
                      onClick={() => onChange({ mode: "video", container, height: h })}
                    />
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-[11px] leading-snug text-ink3">
              Size estimates include the best audio track.
            </p>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink2">Format</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Audio format">
              {(["mp3", "wav", "aac"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  role="radio"
                  aria-checked={(selection.audioFormat ?? "mp3") === fmt}
                  onClick={() =>
                    onChange({
                      mode: "audio",
                      audioFormat: fmt,
                      audioBitrate: fmt === "wav" ? undefined : selection.audioBitrate ?? 192,
                    })
                  }
                  className={cn(
                    "flex h-12 flex-col items-center justify-center rounded-xl border transition-colors",
                    (selection.audioFormat ?? "mp3") === fmt
                      ? "border-ink bg-ink text-panel"
                      : "border-line bg-panel text-ink hover:border-ink/40",
                  )}
                >
                  <span className="text-[13px] font-bold tracking-[-0.01em]">{fmt.toUpperCase()}</span>
                  <span className={cn("font-mono text-[8px] uppercase", (selection.audioFormat ?? "mp3") === fmt ? "text-panel/60" : "text-ink3")}>
                    {fmt === "mp3" ? "universal" : fmt === "wav" ? "lossless" : "compact"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {(selection.audioFormat ?? "mp3") === "wav" ? (
            <p className="rounded-xl border border-line bg-sunken/50 px-4 py-3 text-[12px] leading-relaxed text-ink2">
              WAV is lossless PCM — there is no bitrate to pick.{" "}
              {duration && (
                <>Expect about <span className="font-medium text-ink">{formatBytes((1411.2 * 1000 * duration) / 8, 0)}</span> for {formatDuration(duration)}.</>
              )}
            </p>
          ) : (
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-ink2">Bitrate</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Audio bitrate">
                {([128, 192, 320] as const).map((kbps) => {
                  const est = duration ? (kbps * 1000 * duration) / 8 : null;
                  const active = (selection.audioBitrate ?? 192) === kbps;
                  return (
                    <QualityPill
                      key={kbps}
                      label={`${kbps} kbps`}
                      detail={est ? `~${formatBytes(est, 0)}` : null}
                      active={active}
                      onClick={() =>
                        onChange({ mode: "audio", audioFormat: selection.audioFormat ?? "mp3", audioBitrate: kbps })
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
