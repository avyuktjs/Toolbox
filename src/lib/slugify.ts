export type SlugSeparator = "-" | "_" | ".";

/** Accent-folded, punctuation-stripped slug — the classic URL treatment. */
export function slugify(input: string, { separator, lower }: { separator: SlugSeparator; lower: boolean }): string {
  const folded = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\u00df/g, "ss") // ß
    .replace(/\u00e6/g, "ae") // æ
    .replace(/\u0153/g, "oe") // œ
    .replace(/\u00f8/g, "o") // ø
    .replace(/\u0142/g, "l") // ł
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e]/g, '"');
  const words = folded
    .split(/['"]/) // apostrophes join words ("don't" -> "dont")
    .join("")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (lower ? w.toLowerCase() : w));
  return words.join(separator);
}
