"use client";

import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Trash2,
  Gauge,
  Timer,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import type { JobSnapshot } from "@/types/media";

export function JobPanel({
  job,
  pollError,
  onCancel,
  onRetry,
  onReset,
}: {
  job: JobSnapshot | null;
  pollError?: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onReset: () => void;
}) {
  const state = job?.state ?? (pollError ? "error" : "running");

  if (state === "complete" && job) {
    return (
      <div className="rounded-[8px] border border-ok/40 bg-ok-soft p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" />
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-ok">
              Ready to keep
            </p>
            <p className="mt-1 break-words text-[13px] font-semibold leading-snug text-ink">
              {job.filename}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink2">
              {formatBytes(job.size)} · kept on this server for 15 min
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {job.downloadUrl ? (
            <ButtonLink variant="primary" href={job.downloadUrl} download leadingIcon={Download}>Save file</ButtonLink>
          ) : null}
          <Button variant="secondary" onClick={onReset} leadingIcon={RotateCcw}>Start another</Button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    const message = job?.error ?? pollError ?? "Something went sideways.";
    return (
      <div className="rounded-[8px] border border-danger/40 bg-danger-soft p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-danger">
              Couldn&apos;t finish
            </p>
            <p className="mt-1 text-[13px] leading-snug text-ink">{message}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onRetry} leadingIcon={RotateCcw}>Try again</Button>
          <Button variant="ghost" onClick={onReset}>
            Start over
          </Button>
        </div>
      </div>
    );
  }

  /* ---- running ---- */
  const percent = job?.percent ?? null;
  return (
    <div className="rounded-[8px] border border-line2 bg-sunken/50 p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-ink2">
          <Loader2 className="size-3.5 animate-spin text-accent" />
          {job?.stage ?? "Queued"}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink3">
          {job?.kind === "convert" ? "Local file" : "Remote source"}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <span className="t-tabular font-display text-[44px] font-black leading-none tracking-[-0.03em] text-ink">
          {percent == null ? "––" : Math.floor(percent)}
          <span className="text-accent">%</span>
        </span>
        <div className="flex items-center gap-4 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink2">
          <span className="flex items-center gap-1.5" title="Transfer / processing speed">
            <Gauge className="size-3.5" /> {job?.speed ?? "—"}
          </span>
          <span className="hidden items-center gap-1.5 min-[420px]:flex" title="Time remaining">
            <Timer className="size-3.5" /> {job?.eta ?? "—"}
          </span>
        </div>
      </div>

      <div
        className="tick-track mt-3 h-2.5 overflow-hidden rounded-[3px]"
        role="progressbar"
        aria-label="Processing progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
      >
        {percent == null ? (
          <div className="tb-swipe h-full w-1/3 bg-accent" />
        ) : (
          <div
            className={cn("h-full bg-accent transition-[width] duration-500 ease-out")}
            style={{ width: `${Math.min(100, Math.max(1.5, percent))}%` }}
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
          Keep this tab open to save the file when it lands
        </p>
        <Button variant="ghost" size="small" onClick={onCancel} className="text-danger hover:bg-danger-soft hover:text-danger">
          <Trash2 /> Cancel
        </Button>
      </div>
    </div>
  );
}
