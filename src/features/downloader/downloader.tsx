"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { UrlConsole } from "./url-console";
import { Dossier } from "./dossier";
import { selectionSummary } from "./format-selector";
import { useJobPolling } from "@/features/shared/use-job";
import { useHistoryStore } from "@/features/history/history-store";
import { toast } from "sonner";
import type { DownloadSelection, InspectedMedia } from "@/types/media";

const EXAMPLE_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";

type Phase = "idle" | "inspecting" | "ready";

export function Downloader() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [media, setMedia] = useState<InspectedMedia | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [selection, setSelection] = useState<DownloadSelection>({ mode: "video", container: "mp4" });
  const [jobId, setJobId] = useState<string | null>(null);
  const [resetNonce, setResetNonce] = useState(0);
  const [prefill, setPrefill] = useState<string | null>(null);
  const recordedRef = useRef(false);
  const jobContextRef = useRef<{ title: string | null; detail: string }>({ title: null, detail: "" });

  const { job, error: pollError, cancel } = useJobPolling(jobId);
  const historyAdd = useHistoryStore((s) => s.add);
  const inspect = useCallback(async (url: string) => {
    setPhase("inspecting");
    setInspectError(null);
    try {
      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as
        | { ok: true; media: InspectedMedia }
        | { ok: false; error: string };
      if (!res.ok || !data.ok) {
        setInspectError("error" in data ? data.error : "Couldn't inspect that link.");
        setPhase("idle");
        return;
      }
      setMedia(data.media);
      const mp4 = data.media.videoVariants.find((v) => v.container === "mp4");
      const webm = data.media.videoVariants.find((v) => v.container === "webm");
      if (!data.media.hasVideo && data.media.hasAudio) {
        setSelection({ mode: "audio", audioFormat: "mp3", audioBitrate: 192 });
      } else {
        const container: "mp4" | "webm" = mp4 ? "mp4" : webm ? "webm" : "mp4";
        const heights = data.media.videoVariants.filter((v) => v.container === container).map((v) => v.height);
        const height = heights.includes(1080) ? 1080 : heights.sort((a, b) => b - a)[0];
        setSelection({ mode: "video", container, height });
      }
      setPhase("ready");
    } catch {
      setInspectError("Couldn't reach the server. Check your connection and try again.");
      setPhase("idle");
    }
  }, []);

  const startDownload = useCallback(async () => {
    if (!media) return;
    recordedRef.current = false;
    jobContextRef.current = { title: media.title, detail: selectionSummary(media, selection) };
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: media.webpageUrl, title: media.title, selection }),
      });
      const data = (await res.json()) as
        | { ok: true; job: { id: string } }
        | { ok: false; error: string };
      if (!res.ok || !data.ok) {
        toast.error("Couldn't start the job", { description: "error" in data ? data.error : undefined });
        return;
      }
      setJobId(data.job.id);
    } catch {
      toast.error("Couldn't reach the server", { description: "Check your connection and try again." });
    }
  }, [media, selection]);

  // When an inspection lands, bring the docket into view.
  useEffect(() => {
    if (phase !== "ready" || !media) return;
    const raf = window.requestAnimationFrame(() => {
      document.getElementById("docket")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [phase, media]);

  useEffect(() => {
    if (job?.state === "complete" && !recordedRef.current) {
      recordedRef.current = true;
      historyAdd({
        id: job.id,
        kind: "download",
        title: job.filename ?? job.title ?? "download",
        detail: jobContextRef.current.detail,
        size: job.size,
        createdAt: Date.now(),
        downloadPath: job.downloadUrl ?? `/api/jobs/${job.id}/file`,
      });
      toast.success("File ready — check History", { description: job.filename ?? undefined });
    } else if (job?.state === "error" && !recordedRef.current) {
      recordedRef.current = true;
      toast.error("Download failed", { description: job.error ?? undefined });
    }
  }, [job, historyAdd]);

  const resetAll = useCallback(() => {
    setPhase("idle");
    setMedia(null);
    setInspectError(null);
    setJobId(null);
    setResetNonce((n) => n + 1);
    setPrefill(null);
    recordedRef.current = false;
  }, []);

  const retrySame = useCallback(() => {
    setJobId(null);
    recordedRef.current = false;
  }, []);

  const tryExample = useCallback(() => {
    setPrefill(EXAMPLE_URL);
    void inspect(EXAMPLE_URL);
  }, [inspect]);

  const inspecting = phase === "inspecting";
  const ready = phase === "ready" && media;

  return (
    <section aria-label="Downloader">
      {/* the whole page is the tool */}
      <div className="flex min-h-[calc(100dvh-6rem)] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[calc(100dvh-3rem)] sm:px-6">
        <h1 className="max-w-4xl font-display text-[clamp(3.1rem,9.5vw,5.75rem)] font-semibold leading-[0.97] tracking-[-0.035em] text-ink">
          Media, your way<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 max-w-md text-[17px] leading-snug text-ink2 sm:text-xl">
          Download and convert media — with control over every format.
        </p>

        <div className="mt-8 w-full max-w-2xl text-left">
          <UrlConsole key={`${resetNonce}:${prefill ?? ""}`} loading={inspecting} onInspect={inspect} initialUrl={prefill} />
          {inspectError ? (
            <p role="alert" className="mt-2 flex items-start gap-2 px-1 text-[12px] font-medium leading-snug text-danger">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {inspectError}
            </p>
          ) : null}
          {phase === "idle" && !jobId ? (
            <button
              type="button"
              onClick={tryExample}
              className="mt-3 w-fit text-[13px] font-medium text-accent-ink transition-colors hover:underline underline-offset-4"
            >
              No link handy? Inspect Big Buck Bunny →
            </button>
          ) : null}
        </div>
      </div>

      {/* inspection result: full-width docket */}
      {ready ? (
        <div id="docket" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <Dossier
              media={media}
              selection={selection}
              onSelectionChange={setSelection}
              job={job}
              pollError={pollError}
              onDownload={startDownload}
              onCancel={() => cancel()}
              onRetry={retrySame}
              onReset={resetAll}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
