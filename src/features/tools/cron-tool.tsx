"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, CalendarClock } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { FIELD_LABELS, parseCron, nextRuns, describeField, type FieldIndex } from "@/lib/cron-parse";

const PRESETS = [
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Weekdays 9am", value: "0 9 * * 1-5" },
  { label: "Daily midnight", value: "0 0 * * *" },
  { label: "Every Monday", value: "0 9 * * 1" },
  { label: "Feb 29 (leap)", value: "0 0 29 2 *" },
  { label: "First of month", value: "0 0 1 * *" },
] as const;

export function CronTool() {
  const [expression, setExpression] = useState("*/15 * * * *");
  /* Date.now() is impure during render — pin "now" at mount instead */
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setNow(new Date()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const parsed = useMemo(() => parseCron(expression), [expression]);
  const upcoming = useMemo(
    () => (parsed.ok && now ? nextRuns(parsed.fields, 5, now) : []),
    [parsed, now],
  );

  const readout = parsed.ok
    ? parsed.fields.map((f, i) => describeField(f, i as FieldIndex))
    : [];

  const explanation = parsed.ok
    ? `At ${readout[0]}, ${readout[1]}, on ${parsed.fields[2].raw.trim() === "*" ? "every day" : `day-of-month ${readout[2]}`}, in ${readout[3] === "every month" ? "every month" : `month ${readout[3]}`}, ${readout[4] === "every day of week" ? "any weekday" : `on ${readout[4]}`}.`
    : null;

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-sunken/40 px-4 py-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setExpression(p.value)}
            className="h-8 rounded-[8px] border border-line2 bg-sunken px-2.5 text-[11px] font-medium text-ink2 transition-colors hover:border-brand hover:text-ink"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setExpression("")}
          aria-label="Clear"
          className="ml-auto grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="border-b border-line px-4 pt-4">
        <input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="*/15 * * * *"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Cron expression"
          aria-invalid={parsed.ok ? false : true}
          className="h-16 w-full rounded-[12px] border border-line2 bg-sunken px-4 text-center font-mono text-[clamp(1.2rem,5vw,2rem)] font-semibold tracking-[0.08em] text-ink outline-none placeholder:text-ink3 focus:border-brand"
        />
        <div className="grid grid-cols-5 gap-1 py-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-ink3">
          {FIELD_LABELS.map((l) => <span key={l}>{l}</span>)}
        </div>
      </div>

      {parsed.ok ? (
        <>
          <div className="border-b border-line px-4 py-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">In plain English</p>
            <p className="mt-1 text-[14px] leading-snug text-ink">{explanation}</p>
            <ol className="mt-2 grid grid-cols-2 gap-1 text-[11.5px] text-ink2 sm:grid-cols-5">
              {readout.map((r, i) => (
                <li key={i} className="rounded-[8px] border border-line bg-sunken/40 px-2 py-1.5">
                  <span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-ink3">{FIELD_LABELS[i]}</span>
                  <span className="font-medium">{r}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="px-4 py-3">
            <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
              <CalendarClock className="size-3.5" aria-hidden /> Next 5 runs (local time)
            </p>
            <ol className="mt-1.5 divide-y divide-line overflow-hidden rounded-[10px] border border-line">
              {upcoming.length === 0 ? (
                <li className="bg-panel px-3 py-2 font-mono text-[12px] text-ink3">Reading the clock…</li>
              ) : upcoming.map((date) => (
                <li key={date.toISOString()} className="flex items-baseline justify-between bg-panel px-3 py-1.5">
                  <span className="font-mono text-[12.5px] text-ink">
                    {date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                    {"  "}
                    {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <AiCopyButton variant="ghost" size="sm" label="Copy" value={() => date.toISOString()} iconOnly />
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <p role="alert" className="px-4 py-4 font-mono text-[12px] text-red-500">{parsed.error}</p>
      )}

      <p className="border-t border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3">
        5-field cron · dom + dow both restricted = OR, like Vixie cron
      </p>
    </div>
  );
}
