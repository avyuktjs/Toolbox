"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobSnapshot } from "@/types/media";

/** Polls GET /api/jobs/:id until the job reaches a terminal state. */
export function useJobPolling(jobId: string | null) {
  const [state, setState] = useState<{ id: string | null; job: JobSnapshot | null; error: string | null }>({
    id: null,
    job: null,
    error: null,
  });

  // Adjusting state during render — the sanctioned alternative to an effect reset.
  if (jobId !== state.id) {
    setState({ id: jobId, job: null, error: null });
  }

  const cancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    } catch {
      /* already gone */
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    let stopped = false;
    let timer: number | undefined;

    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; job?: JobSnapshot; error?: string };
        if (res.status === 404) {
          if (!stopped) setState({ id: jobId, job: null, error: data.error ?? "That job expired." });
          return;
        }
        if (data.job && !stopped) {
          setState({ id: jobId, job: data.job, error: null });
          if (data.job.state === "running") {
            timer = window.setTimeout(tick, 700);
          }
        }
      } catch {
        if (!stopped) timer = window.setTimeout(tick, 1500);
      }
    };
    void tick();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [jobId]);

  return { job: state.job, error: state.error, cancel };
}
