"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/features/shared/use-mounted";
import {
  ArrowRight,
  CalendarClock,
  Download,
  FileCog,
  HardDrive,
  History,
  Link2,
  Trash2,
  X,
  CheckCircle2,
  CircleAlert,
  Loader2,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Seek } from "@/components/motion/seek";
import { AiCopyButton } from "@/components/ai-copy-button";
import { toast } from "sonner";
import { useHistoryStore } from "./history-store";
import { formatBytes, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Availability = "checking" | "available" | "expired";

export function HistoryPage() {
  const entries = useHistoryStore((s) => s.entries);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [query, setQuery] = useState("");
  // zustand/persist hydrates from localStorage after mount — render static
  // chrome until then to avoid a hydration mismatch.
  const mounted = useMounted();

  const normalized = query.trim().toLowerCase();
  const visible = normalized
    ? entries.filter((e) => `${e.title} ${e.detail} ${e.kind}`.toLowerCase().includes(normalized))
    : entries;

  // Verify each entry's file still exists — never pretend a temp file is permanent.
  useEffect(() => {
    let cancelled = false;
    const missing = entries.filter((e) => availability[e.id] === undefined);
    missing.forEach((entry) => {
      fetch(entry.downloadPath, { method: "HEAD" })
        .then((res) => {
          if (cancelled) return;
          setAvailability((m) => ({ ...m, [entry.id]: res.ok ? "available" : "expired" }));
        })
        .catch(() => {
          if (cancelled) return;
          setAvailability((m) => ({ ...m, [entry.id]: "expired" }));
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  useEffect(() => {
    if (!confirmClear) return;
    const t = window.setTimeout(() => setConfirmClear(false), 3200);
    return () => window.clearTimeout(t);
  }, [confirmClear]);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-ink2 sm:text-[10px]">
            <span aria-hidden className="inline-block size-2 bg-accent" />
            History — Stored locally
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.5rem,7vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.025em] text-ink">
            The file shelf<span className="text-accent">.</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 && (
            <Seek
              value={query}
              onChange={setQuery}
              placeholder="Filter files…"
              ariaLabel="Filter history"
              width={210}
            />
          )}
          {entries.length > 0 && (
          <Button
            variant="ghost"
            size="small"
            leadingIcon={confirmClear ? CircleAlert : Trash2}
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true);
                return;
              }
              clear();
              setConfirmClear(false);
              toast.message("Shelf cleared", { description: "Entries removed from this device." });
            }}
            className={cn(confirmClear && "border border-danger/50 bg-danger-soft text-danger hover:text-danger")}
          >
            {confirmClear ? "Really clear everything?" : "Clear all"}
          </Button>
        )}
        </div>
      </div>
      <p className="mt-3 max-w-md text-[12px] leading-relaxed text-ink2 sm:text-[13px]">
        Entries older than 15 minutes point at purged files — we label those
        honestly instead of pretending. History lives in your browser, nowhere else.
      </p>

      {!mounted ? (
        <div className="mt-10 grid min-h-[18rem] place-items-center rounded-panel border border-line bg-panel/60">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink3">Opening the shelf…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-10 grid min-h-[22rem] place-items-center rounded-panel border border-dashed border-line2 bg-panel/50 p-8">
          {normalized ? (
            <div className="flex max-w-[18rem] flex-col items-center text-center">
              <p className="font-display text-xl font-semibold text-ink">No matches</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink2">
                Nothing on the shelf matches <span className="font-semibold text-ink">“{query.trim()}”</span>.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-4 text-[13px] font-semibold text-accent-ink hover:underline underline-offset-4"
              >
                Clear the filter
              </button>
            </div>
          ) : (
            <div className="flex max-w-[18rem] flex-col items-center text-center">
              <div className="grid size-14 place-items-center rounded-[10px] border border-line2 bg-panel text-ink3">
                <History className="size-6" strokeWidth={1.6} />
              </div>
              <p className="mt-4 font-display text-xl font-semibold text-ink">Nothing on the shelf yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink2">
                Finished downloads and conversions will show up here, with their formats and sizes.
              </p>
              <ButtonLink href="/" variant="primary" leadingIcon={Link2} trailingIcon={ArrowRight} className="mt-5">
                Fetch something
              </ButtonLink>
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-panel border border-line2 bg-panel">
          {visible.map((entry) => {
            const status = availability[entry.id] ?? "checking";
            const KindIcon = entry.kind === "download" ? Link2 : FileCog;
            return (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-sunken/40 sm:gap-4 sm:px-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-[7px] border border-line bg-sunken text-ink2">
                  <KindIcon className="size-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-snug text-ink" title={entry.title}>
                    {entry.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">
                    <span>{entry.kind === "download" ? "Downloaded" : "Converted"}</span>
                    <span aria-hidden>·</span>
                    <span className="text-ink2">{entry.detail}</span>
                    {entry.size != null && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1"><HardDrive className="size-3" />{formatBytes(entry.size)}</span>
                      </>
                    )}
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" />{formatRelativeDate(entry.createdAt)}</span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  {status === "checking" && (
                    <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3 min-[480px]:flex">
                      <Loader2 className="size-3.5 animate-spin" /> Checking
                    </span>
                  )}
                  {status === "available" && (
                    <ButtonLink size="small" variant="secondary" href={entry.downloadPath} download leadingIcon={Download} className="h-8 text-[11px]">
                      Save
                    </ButtonLink>
                  )}
                  {status === "expired" && (
                    <Tooltip content="Purged after 15 minutes — go fetch it again">
                      <span className="inline-flex h-8 cursor-help items-center gap-1.5 rounded-[6px] border border-dashed border-line2 px-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-ink3">
                        Expired
                      </span>
                    </Tooltip>
                  )}
                  <AiCopyButton
                    variant="ghost"
                    size="sm"
                    iconOnly
                    label="Copy filename"
                    value={entry.title}
                    className="size-8"
                  />
                  <button
                    type="button"
                    aria-label="Remove from history"
                    onClick={() => remove(entry.id)}
                    className="grid size-8 place-items-center rounded-[6px] text-ink3 transition-colors hover:bg-sunken hover:text-danger"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-5 flex items-center gap-2 text-[11px] text-ink3">
        <CheckCircle2 className="size-3.5 shrink-0" /> History is stored on this device, and nowhere else.
      </p>
    </section>
  );
}
