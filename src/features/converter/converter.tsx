"use client";

import { useCallback, useState } from "react";
import { Inbox, Trash2, Wand2 } from "lucide-react";
import { Dropzone } from "./dropzone";
import { QueueItemCard, itemDetail, type QueueItem } from "./queue-item";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useHistoryStore } from "@/features/history/history-store";
import type { ConvertRequest, JobSnapshot, ProbedFile } from "@/types/media";

const MAX_ITEMS = 6;

let clientId = 0;
const nextId = () => `item-${++clientId}-${Date.now().toString(36)}`;

export function Converter() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const historyAdd = useHistoryStore((s) => s.add);

  const patchItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const addProbedFile = useCallback((probe: ProbedFile) => {
    const hasVideo = !!probe.video;
    const hasAudio = !!probe.audio;
    setItems((list) => {
      if (list.length >= MAX_ITEMS) {
        toast.message("Tray is full", { description: "Six files at a time — the bench is small by design." });
        return list;
      }
      return [
        ...list,
        {
          id: nextId(),
          name: probe.name,
          size: probe.size,
          stage: "ready",
          error: null,
          probe,
          intent: hasVideo ? "video" : hasAudio ? "audio" : "audio",
          videoTarget: "mp4",
          audioTarget: "mp3",
          videoQuality: "balanced",
          videoCrf: 23,
          audioBitrate: 192,
          jobId: null,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((list) => list.filter((it) => it.id !== id));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const startConvert = useCallback(
    async (id: string) => {
      const item = items.find((it) => it.id === id);
      if (!item?.probe) return;
      const body: ConvertRequest = {
        uploadId: item.probe.uploadId,
        intent: item.intent,
        videoTarget: item.intent === "video" ? item.videoTarget : undefined,
        audioTarget: item.intent !== "video" ? item.audioTarget : undefined,
        videoQuality: item.intent === "video" ? item.videoQuality : undefined,
        videocrf: item.intent === "video" ? item.videoCrf : undefined,
        audioBitrate: item.intent !== "video" && item.audioTarget !== "wav" ? item.audioBitrate : undefined,
      };
      patchItem(id, { stage: "converting", error: null, outputName: null });
      try {
        const res = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as
          | { ok: true; job: JobSnapshot }
          | { ok: false; error: string };
        if (!res.ok || !data.ok) {
          patchItem(id, { stage: "error", error: "error" in data ? data.error : "Couldn't start the conversion." });
          return;
        }
        patchItem(id, { jobId: data.job.id });
      } catch {
        patchItem(id, { stage: "error", error: "Couldn't reach the server." });
      }
    },
    [items, patchItem],
  );

  const handleSettled = useCallback(
    (item: QueueItem, job: JobSnapshot) => {
      if (job.state === "complete") {
        patchItem(item.id, { stage: "done", outputName: job.filename, error: null });
        historyAdd({
          id: job.id,
          kind: "convert",
          title: job.filename ?? item.name,
          detail: itemDetail(item),
          size: job.size,
          createdAt: Date.now(),
          downloadPath: job.downloadUrl ?? `/api/jobs/${job.id}/file`,
        });
        toast.success("Conversion done", { description: job.filename ?? undefined });
      } else {
        patchItem(item.id, { stage: "error", error: job.error ?? "Conversion failed." });
        toast.error("Conversion failed", { description: job.error ?? undefined });
      }
    },
    [patchItem, historyAdd],
  );

  const readyCount = items.filter((it) => it.stage === "ready").length;

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      {/* left: tray */}
      <section aria-label="Input files" className="lg:col-span-5">
        <div className="soft-shadow flex h-full flex-col overflow-hidden rounded-panel border border-line2 bg-panel">
          <div className="flex h-9 items-center justify-between border-b border-line px-4">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-ink3">
              Tray — Local files
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink3">
              {items.length}/{MAX_ITEMS}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <Dropzone
              disabled={items.length >= MAX_ITEMS}
              onUploaded={addProbedFile}
              keepIds={items.flatMap((it) => (it.probe ? [it.probe.uploadId] : []))}
            />
            <p className="mt-auto text-[11px] leading-relaxed text-ink3">
              Uploaded files are probed as soon as they land, converted on this
              server, and deleted 15 minutes after the job finishes.
            </p>
          </div>
        </div>
      </section>

      {/* right: output bench */}
      <section aria-label="Output queue" className="lg:col-span-7">
        <div className="flex h-full flex-col overflow-hidden rounded-panel border border-line2 bg-sunken/30">
          <div className="flex h-11 items-center justify-between border-b border-line bg-panel px-4">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-ink3">
              Output — {items.length === 0 ? "empty" : `${items.length} file${items.length === 1 ? "" : "s"}`}
            </span>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="flex h-7 items-center gap-1.5 rounded-[6px] px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3 transition-colors hover:bg-sunken hover:text-danger"
                >
                  <Trash2 className="size-3.5" /> Clear
                </button>
              )}
              {readyCount > 1 && (
                <Button
                  size="small"
                  variant="secondary"
                  leadingIcon={Wand2}
                  onClick={() => {
                    const ready = items.filter((it) => it.stage === "ready");
                    ready.slice(0, 3).forEach((it) => void startConvert(it.id));
                    if (ready.length > 3) {
                      toast.message("Started three jobs", {
                        description: "The bench runs three at a time — convert the rest as slots free up.",
                      });
                    }
                  }}
                >
                  Convert all ({readyCount})
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 p-4">
            {items.length === 0 ? (
              <div className="grid h-full min-h-[20rem] place-items-center rounded-[8px] border border-dashed border-line2">
                <div className="flex max-w-[16rem] flex-col items-center text-center">
                  <Inbox className="size-8 text-ink3" strokeWidth={1.5} />
                  <p className="mt-3 font-display text-lg font-semibold text-ink">Nothing here yet</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink2">
                    Files you upload will sit here, probed and ready to convert.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="grid gap-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <QueueItemCard
                      item={item}
                      onChange={(patch) => patchItem(item.id, patch)}
                      onRemove={() => removeItem(item.id)}
                      onConvert={() => void startConvert(item.id)}
                      onSettled={handleSettled}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
