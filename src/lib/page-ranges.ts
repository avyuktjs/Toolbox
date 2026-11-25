/** Parse "1-3, 5, 8-9" → sorted unique 1-based page numbers, clamped to max. */
export function parsePageRanges(input: string, max: number): { pages: number[]; error: string | null } {
  const text = input.trim();
  if (!text) return { pages: [], error: "Enter pages — e.g. 1-3, 5, 8-9" };
  const out = new Set<number>();
  for (const part of text.split(",")) {
    const piece = part.trim();
    const range = piece.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      if (lo > hi) return { pages: [], error: `"${piece}" — start is after end.` };
      for (let v = lo; v <= hi; v += 1) {
        if (v >= 1 && v <= max) out.add(v);
      }
    } else if (/^\d+$/.test(piece)) {
      const v = Number(piece);
      if (v >= 1 && v <= max) out.add(v);
    } else {
      return { pages: [], error: `Can't parse "${piece}" — use ranges like 1-3 or single pages like 5.` };
    }
  }
  const pages = [...out].sort((a, b) => a - b);
  if (pages.length === 0) return { pages: [], error: `No pages in range — this PDF has ${max} page${max === 1 ? "" : "s"}.` };
  return { pages, error: null };
}
