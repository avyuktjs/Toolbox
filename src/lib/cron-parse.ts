/* Five-field cron parsing: ranges, lists, steps, names for months/weekdays. */

export const FIELD_LABELS = ["minute", "hour", "day of month", "month", "day of week"] as const;
export type FieldIndex = 0 | 1 | 2 | 3 | 4;
export const FIELD_RANGES: Record<FieldIndex, [number, number]> = {
  0: [0, 59],
  1: [0, 23],
  2: [1, 31],
  3: [1, 12],
  4: [0, 7],
};
const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_ALIASES = new Map<string, number>(MONTH_NAMES.slice(1).map((name, i) => [name.toLowerCase(), i + 1] as const));
const DOW_ALIASES = new Map<string, number>([["sun", 0], ["mon", 1], ["tue", 2], ["wed", 3], ["thu", 4], ["fri", 5], ["sat", 6]] as const);

export interface ParsedField {
  raw: string;
  values: Set<number>;
  error: string | null;
}

function resolveToken(token: string, index: FieldIndex): number | null {
  if (/^\d+$/.test(token)) return Number(token);
  const lower = token.toLowerCase();
  if (index === 3) return MONTH_ALIASES.get(lower.slice(0, 3)) ?? null;
  if (index === 4) return DOW_ALIASES.get(lower.slice(0, 3)) ?? null;
  return null;
}

export function parseField(raw: string, index: FieldIndex): ParsedField {
  const [min, max] = FIELD_RANGES[index];
  const values = new Set<number>();
  const cleaned = raw.trim();
  if (!cleaned) return { raw, values, error: "Empty field" };

  for (const part of cleaned.split(",")) {
    const piece = part.trim();
    if (!piece) return { raw, values, error: "Empty list item" };
    const stepMatch = piece.match(/^(.+)\/(\d+)$/);
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    if (stepMatch && (!Number.isFinite(step) || step < 1)) {
      return { raw, values, error: `Bad step in "${piece}"` };
    }
    const base = stepMatch ? stepMatch[1] : piece;

    let lo: number;
    let hi: number;
    if (base === "*") {
      lo = min; hi = max;
    } else {
      const rangeMatch = base.match(/^([A-Za-z0-9*]+)-([A-Za-z0-9*]+)$/);
      if (rangeMatch) {
        const a = rangeMatch[1] === "*" ? min : resolveToken(rangeMatch[1], index);
        const b = rangeMatch[2] === "*" ? max : resolveToken(rangeMatch[2], index);
        if (a == null || b == null) return { raw, values, error: `Can't parse "${piece}"` };
        lo = a; hi = b;
      } else {
        const single = resolveToken(base, index);
        if (single == null) return { raw, values, error: `Can't parse "${piece}"` };
        lo = single;
        hi = stepMatch ? max : single; // "5/15" means 5-max step 15
      }
    }
    if (lo < min || hi > max || lo > hi) {
      return { raw, values, error: `"${piece}" is out of range (${min}–${max})` };
    }
    for (let v = lo; v <= hi; v += step) values.add(v);
  }

  // day-of-week 7 == 0 (both Sunday)
  if (index === 4 && values.has(7)) {
    values.delete(7);
    values.add(0);
  }
  return { raw, values, error: null };
}

export function describeField(field: ParsedField, index: FieldIndex): string {
  const { raw, values } = field;
  const [min, max] = FIELD_RANGES[index];
  const all = values.size === (index === 4 ? 7 : max - min + 1);
  const fmt = (v: number) =>
    index === 3 ? MONTH_NAMES[v] : index === 4 ? DOW_NAMES[v] : String(v);

  if (raw.trim() === "*") return index === 0 ? "every minute" : `every ${FIELD_LABELS[index]}`;
  if (all) return `every ${FIELD_LABELS[index]}`;
  const sorted = [...values].sort((a, b) => a - b);
  if (/^\*\/\d+$/.test(raw.trim())) return `every ${raw.trim().slice(2)} ${FIELD_LABELS[index]}s`;
  if (sorted.length > 8) return `${sorted.length} of ${max - min + 1} ${FIELD_LABELS[index]}s`;
  return sorted.map(fmt).join(", ");
}

export type ParsedCron =
  | { ok: true; fields: [ParsedField, ParsedField, ParsedField, ParsedField, ParsedField] }
  | { ok: false; error: string };

export function parseCron(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { ok: false, error: `Expected 5 fields (minute hour day month weekday) — found ${parts.length}.` };
  }
  const fields = parts.map((p, i) => parseField(p, i as FieldIndex));
  const bad = fields.find((f) => f.error);
  if (bad) return { ok: false, error: bad.error! };
  return { ok: true, fields: fields as [ParsedField, ParsedField, ParsedField, ParsedField, ParsedField] };
}

/** Next `count` run times strictly after `from`. dom+dow both restricted = OR, like Vixie cron. */
export function nextRuns(
  fields: [ParsedField, ParsedField, ParsedField, ParsedField, ParsedField],
  count: number,
  from: Date,
): Date[] {
  const [minute, hour, dom, month, dow] = fields;
  const runs: Date[] = [];
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const domRestricted = fields[2].values.size !== 31;
  const dowRestricted = fields[4].values.size !== 7;

  let iterations = 0;
  while (runs.length < count && iterations < 4_000_000) {
    iterations += 1;
    const m = cursor.getMinutes();
    if (!minute.values.has(m)) { cursor.setMinutes(cursor.getMinutes() + 1); continue; }
    const h = cursor.getHours();
    if (!hour.values.has(h)) { cursor.setMinutes(0, 0); cursor.setHours(cursor.getHours() + 1); continue; }
    const d = cursor.getDate();
    const mo = cursor.getMonth() + 1;
    if (!month.values.has(mo)) { cursor.setDate(1); cursor.setHours(0, 0, 0, 0); cursor.setMonth(cursor.getMonth() + 1); continue; }
    if (!dom.values.has(d)) { cursor.setHours(0, 0, 0, 0); cursor.setDate(cursor.getDate() + 1); continue; }
    const w = cursor.getDay();
    const domOk = dom.values.has(d);
    const dowOk = dow.values.has(w);
    const dayMatch = domRestricted && dowRestricted ? domOk || dowOk : domOk && dowOk;
    if (!dayMatch) { cursor.setHours(0, 0, 0, 0); cursor.setDate(cursor.getDate() + 1); continue; }
    runs.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return runs;
}
