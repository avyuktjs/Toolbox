import { describe, expect, it } from "vitest";
import { slugify } from "../src/lib/slugify";
import { parsePageRanges } from "../src/lib/page-ranges";
import { parseCron, nextRuns, describeField } from "../src/lib/cron-parse";

describe("slugify", () => {
  it("folds accents and strips punctuation", () => {
    expect(slugify("Héllo, Wörld!", { separator: "-", lower: true })).toBe("hello-world");
  });
  it("apostrophes join words", () => {
    expect(slugify("Don't stop believin'", { separator: "-", lower: true })).toBe("dont-stop-believin");
  });
  it("supports underscore and dot separators", () => {
    expect(slugify("a b c", { separator: "_", lower: true })).toBe("a_b_c");
    expect(slugify("a b c", { separator: ".", lower: true })).toBe("a.b.c");
  });
  it("handles german sharp s and ligatures", () => {
    expect(slugify("Straße süß", { separator: "-", lower: true })).toBe("strasse-suss");
    expect(slugify("œuvre æther", { separator: "-", lower: true })).toBe("oeuvre-aether");
  });
  it("keeps case when lower is off", () => {
    expect(slugify("Camel Case", { separator: "-", lower: false })).toBe("Camel-Case");
  });
  it("collapses runs of separators", () => {
    expect(slugify("a — b -- c", { separator: "-", lower: true })).toBe("a-b-c");
  });
});

describe("parsePageRanges", () => {
  it("parses mixed ranges and singles", () => {
    expect(parsePageRanges("1-3, 5, 8-9", 20).pages).toEqual([1, 2, 3, 5, 8, 9]);
  });
  it("dedupes and sorts", () => {
    expect(parsePageRanges("3-1", 20)).toEqual({ pages: [], error: '"3-1" — start is after end.' });
    expect(parsePageRanges("2,1-2,2", 20).pages).toEqual([1, 2]);
  });
  it("clamps to the document length", () => {
    expect(parsePageRanges("1-100", 4).pages).toEqual([1, 2, 3, 4]);
    expect(parsePageRanges("9-10", 4).pages).toEqual([]);
  });
  it("rejects garbage", () => {
    expect(parsePageRanges("abc", 4).error).toMatch(/Can't parse/);
    expect(parsePageRanges("", 4).error).toMatch(/Enter pages/);
  });
});

describe("cron", () => {
  it("rejects wrong arity", () => {
    expect(parseCron("* * *").ok).toBe(false);
    expect(parseCron("*/15 * * * * *").ok).toBe(false);
  });
  it("rejects out-of-range values", () => {
    const r = parseCron("61 * * * *");
    expect(r.ok).toBe(false);
  });
  it("parses steps and ranges", () => {
    const r = parseCron("*/15 9-17 * * 1-5");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect([...r.fields[0].values].sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
    expect(r.fields[1].values.has(9)).toBe(true);
    expect(r.fields[1].values.has(17)).toBe(true);
    expect(r.fields[4].values.has(5)).toBe(true);
    expect(r.fields[4].values.has(7)).toBe(false);
  });
  it("accepts names for months and weekdays", () => {
    const r = parseCron("0 9 * jan mon");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields[3].values.has(1)).toBe(true);
    expect(r.fields[4].values.has(1)).toBe(true);
  });
  it("treats day-of-week 7 as Sunday", () => {
    const r = parseCron("0 0 * * 7");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields[4].values.has(0)).toBe(true);
    expect(r.fields[4].values.has(7)).toBe(false);
  });
  it("describes fields readably", () => {
    const r = parseCron("*/15 * * * *");
    if (!r.ok) throw new Error("expected ok");
    expect(describeField(r.fields[0], 0)).toBe("every 15 minutes");
    expect(describeField(r.fields[1], 1)).toBe("every hour");
  });
  it("finds the next runs after a given instant", () => {
    const r = parseCron("0 0 * * *");
    if (!r.ok) throw new Error("expected ok");
    const from = new Date(2026, 5, 15, 10, 30, 0);
    const runs = nextRuns(r.fields, 2, from);
    expect(runs).toHaveLength(2);
    expect(runs[0].getHours()).toBe(0);
    expect(runs[0].getMinutes()).toBe(0);
    expect(runs[0].getDate()).toBe(16);
    expect(runs[1].getDate()).toBe(17);
  });
  it("feb 29 lands only on leap years", () => {
    const r = parseCron("0 0 29 2 *");
    if (!r.ok) throw new Error("expected ok");
    const runs = nextRuns(r.fields, 2, new Date(2026, 0, 1));
    expect(runs[0].getFullYear()).toBe(2028);
    expect(runs[1].getFullYear()).toBe(2032);
  });
});

import { mapExtractorError } from "../src/lib/extractor-errors";

describe("extractor errors", () => {
  it("names YouTube's bot challenge instead of calling the video private", () => {
    const stderr =
      "ERROR: [youtube] 2BvHtjR90IU: Sign in to confirm you’re not a bot. This helps protect our community.";
    const message = mapExtractorError(stderr);
    expect(message).toMatch(/bot check/);
    expect(message).not.toMatch(/private/);
  });
  it("explains the proxy hint the same way", () => {
    expect(mapExtractorError("ERROR: You might want to use a VPN or a proxy server (with --proxy) to workaround.")).toMatch(/bot check/);
  });
  it("still reports genuinely private videos", () => {
    expect(mapExtractorError("ERROR: [youtube] abc: Private video. Sign in if you've been granted access")).toMatch(/private or members-only/);
  });
  it("keeps short raw errors for unknown cases", () => {
    expect(mapExtractorError("ERROR: [youtube] abc: Something odd")).toBe("Couldn't inspect that link: [youtube] abc: Something odd");
  });
});
