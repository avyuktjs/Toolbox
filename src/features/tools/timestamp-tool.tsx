"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, CalendarClock, ArrowDownUp } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";

const useNow = (active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
};

export function TimestampTool() {
  const [epochInput, setEpochInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const now = useNow(true);

  // epoch → date (auto-detect seconds vs milliseconds)
  const parsed = useMemo(() => {
    const raw = epochInput.trim();
    if (!raw || !/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    const ms = raw.length <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [epochInput]);

  // date → epoch
  const dateToEpoch = useMemo(() => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateInput]);

  const rows = parsed
    ? [
        { label: "UTC", value: parsed.toISOString().replace("T", " ").replace(".000Z", " UTC") },
        { label: "Local", value: parsed.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" }) },
        { label: "ISO 8601", value: parsed.toISOString() },
        { label: "Relative", value: relTime(parsed.getTime(), now) },
      ]
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* now card */}
      <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
            <Clock className="size-4" /> Right now
          </span>
          <span className="inline-block size-[7px] animate-pulse rounded-full bg-accent" aria-hidden />
        </div>
        <p className="t-tabular mt-4 font-display text-[clamp(2.4rem,6vw,3.5rem)] font-semibold leading-none tracking-[-0.03em] text-ink">
          {Math.floor(now / 1000)}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink3">Unix seconds</p>
          <AiCopyButton variant="ghost" size="sm" iconOnly label="Copy epoch seconds" value={() => Math.floor(now / 1000).toString()} className="size-6" />
        </div>
        <p className="t-tabular mt-4 text-[13px] text-ink2">{new Date(now).toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" })}</p>
        <p className="t-tabular mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink3">
          {now} ms since epoch
        </p>
        <button
          type="button"
          onClick={() => setEpochInput(String(Math.floor(Date.now() / 1000)))}
          className="mt-4 flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-200 hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(29,67,242,0.55)] px-4 text-[12px] font-semibold"
        >
          <ArrowDownUp className="size-3.5" /> Use as input
        </button>
      </div>

      {/* epoch → date */}
      <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-2">
          <span className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
            <CalendarClock className="size-4" /> Epoch → Date
          </span>
          <AiCopyButton
            variant="ghost"
            size="sm"
            iconOnly
            label="Copy epoch"
            value={() => parsed?.toISOString() ?? ""}
            className="size-7"
          />
        </div>
        <input
          value={epochInput}
          onChange={(e) => setEpochInput(e.target.value)}
          placeholder="1763316000 or 1763316000000"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          aria-label="Epoch timestamp in seconds or milliseconds"
          className="block h-12 w-full border-b border-line bg-panel px-4 font-mono text-[13px] text-ink outline-none placeholder:text-ink3"
        />
        <ul className="divide-y divide-line">
          {rows.length > 0 ? (
            rows.map(({ label, value }) => (
              <li key={label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="w-16 shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">
                  {label}
                </span>
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-ink">{value}</span>
                <AiCopyButton variant="ghost" size="sm" iconOnly label={`Copy ${label}`} value={value} className="size-6 shrink-0" />
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-[12px] text-ink3">
              {epochInput.trim() ? "That doesn't parse as seconds or milliseconds." : "Type an epoch timestamp — 10 or 13 digits."}
            </li>
          )}
        </ul>
      </div>

      {/* date → epoch */}
      <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel sm:col-span-2">
        <div className="flex items-center justify-between border-b border-line bg-sunken/40 px-4 py-2">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Date → Epoch</span>
          <AiCopyButton
            variant="ghost"
            size="sm"
            iconOnly
            label="Copy ISO date"
            value={() => (dateToEpoch ? Math.floor(dateToEpoch.getTime() / 1000).toString() : "")}
            className="size-7"
          />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <input
            type="datetime-local"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            aria-label="Pick a date and time"
            className="h-12 rounded-[10px] border border-line bg-sunken/40 px-3 font-mono text-[13px] text-ink outline-none focus:border-line2"
          />
          <div className="flex flex-1 items-center gap-3">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink3">Epoch</span>
            <code className="t-tabular min-w-0 flex-1 truncate font-mono text-[14px] text-ink">
              {dateToEpoch ? Math.floor(dateToEpoch.getTime() / 1000) : "—"}
            </code>
            <AiCopyButton
              variant="ghost"
              size="sm"
              iconOnly
              label="Copy epoch"
              value={() => (dateToEpoch ? Math.floor(dateToEpoch.getTime() / 1000).toString() : "")}
              className="size-8 shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function relTime(ms: number, now: number): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 1000],
    ["minute", 60_000],
    ["hour", 3_600_000],
    ["day", 86_400_000],
    ["week", 604_800_000],
    ["month", 2_629_800_000],
    ["year", 31_557_600_000],
  ];
  for (let i = units.length - 1; i >= 0; i--) {
    if (abs >= units[i][1]) return rtf.format(Math.round(diff / units[i][1]), units[i][0]);
  }
  return "just now";
}
