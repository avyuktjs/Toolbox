"use client";

import { RotateCcw, Download, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { TileMark } from "@/components/chrome/logo";
import { FormatSelector, estimateSelectionBytes, selectionSummary } from "./format-selector";
import { JobPanel } from "@/features/shared/job-panel";
import { formatBytes, formatCount, formatDuration, formatUploadDate } from "@/lib/format";
import type { DownloadSelection, InspectedMedia, JobSnapshot } from "@/types/media";

export function Dossier({
  media,
  selection,
  onSelectionChange,
  job,
  pollError,
  onDownload,
  onCancel,
  onRetry,
  onReset,
}: {
  media: InspectedMedia;
  selection: DownloadSelection;
  onSelectionChange: (s: DownloadSelection) => void;
  job: JobSnapshot | null;
  pollError: string | null;
  onDownload: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onReset: () => void;
}) {
  const running = job?.state === "running";
  const finished = job?.state === "complete" || job?.state === "error" || !!pollError;
  const showSelector = !running && !finished;
  const estimate = estimateSelectionBytes(media, selection);

  const metaParts = [
    media.durationSec != null ? formatDuration(media.durationSec) : null,
    media.maxHeight ? `${media.maxHeight}p` : null,
    media.viewCount != null ? `${formatCount(media.viewCount)} views` : null,
    formatUploadDate(media.uploadDate),
  ].filter(Boolean);

  return (
    <div className="soft-shadow overflow-hidden rounded-[22px] border border-line bg-panel">
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* thumbnail */}
        <div className="relative overflow-hidden border-b border-line bg-sunken lg:border-b-0 lg:border-r">
          {media.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.thumbnail}
              alt={`Thumbnail for “${media.title}”`}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-contain max-lg:static max-lg:aspect-video"
            />
          ) : (
            <div className="grid aspect-video place-items-center lg:absolute lg:inset-0 lg:aspect-auto">
              <TileMark className="size-16 opacity-40" />
            </div>
          )}
          {media.durationSec != null && (
            <span className="t-tabular absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-0.5 font-mono text-[10.5px] font-medium text-white">
              {formatDuration(media.durationSec)}
            </span>
          )}
        </div>

        {/* data */}
        <div className="flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-ink3">
              <span className="text-ink2">{media.extractor}</span>
              {media.uploader && (
                <>
                  <span aria-hidden className="text-line2">·</span>
                  <UserRound className="size-3 shrink-0" />
                  <span className="truncate text-ink2">{media.uploader}</span>
                </>
              )}
            </p>
            <Tooltip content="Inspect another link">
              <button
                type="button"
                onClick={onReset}
                disabled={running}
                aria-label="Inspect another link"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
              >
                <RotateCcw className="size-4" strokeWidth={1.8} />
              </button>
            </Tooltip>
          </div>

          <h2 className="mt-3 font-display text-[22px] font-semibold leading-[1.14] tracking-[-0.02em] text-ink [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
            {media.title}
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink3">
            {metaParts.join("  ·  ")}
          </p>

          <div className="my-5 h-px bg-line" />

          {showSelector ? (
            <FormatSelector media={media} selection={selection} onChange={onSelectionChange} />
          ) : (
            <JobPanel
              job={job}
              pollError={pollError}
              onCancel={onCancel}
              onRetry={onRetry}
              onReset={onReset}
            />
          )}

          {showSelector && (
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
              <p className="min-w-0 truncate text-[13px] text-ink2">
                {selectionSummary(media, selection)}
                {estimate != null && (
                  <span className="text-ink3"> — about {formatBytes(estimate, 0)}</span>
                )}
              </p>
              <Button
                variant="primary"
                size="medium"
                leadingIcon={Download}
                onClick={onDownload}
                className="shrink-0 px-6"
              >
                Download
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
