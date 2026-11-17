import { describe, expect, it } from "vitest";
import {
  contentDispositionFilename,
  formatBytes,
  formatCount,
  formatDuration,
  formatUploadDate,
  sanitizeFilename,
} from "../src/lib/format";

describe("formatBytes", () => {
  it("handles bytes below 1 KB", () => {
    expect(formatBytes(512)).toBe("512 B");
  });
  it("scales through the units", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });
  it("drops the decimal above 100", () => {
    expect(formatBytes(250 * 1024 * 1024)).toBe("250 MB");
  });
  it("returns a dash for junk", () => {
    expect(formatBytes(NaN)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
    expect(formatBytes(null)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(600)).toBe("10:00");
  });
  it("formats hours", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });
  it("returns a dash for junk", () => {
    expect(formatDuration(NaN)).toBe("—");
    expect(formatDuration(null)).toBe("—");
  });
});

describe("formatCount", () => {
  it("abbreviates", () => {
    expect(formatCount(950)).toBe("950");
    expect(formatCount(1_500)).toBe("1.5K");
    expect(formatCount(2_400_000)).toBe("2.4M");
    expect(formatCount(3_000_000_000)).toBe("3.0B");
  });
  it("returns a dash for junk", () => {
    expect(formatCount(NaN)).toBe("—");
  });
});

describe("formatUploadDate", () => {
  it("formats yyyymmdd", () => {
    expect(formatUploadDate("20141110")).toMatch(/2014/);
  });
  it("returns a dash for malformed input", () => {
    expect(formatUploadDate("2014-11-10")).toBe("—");
    expect(formatUploadDate(null)).toBe("—");
  });
});

describe("sanitizeFilename", () => {
  it("strips illegal characters", () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("a b c d e f g h i j");
  });
  it("collapses whitespace", () => {
    expect(sanitizeFilename("  spaced   out   name ")).toBe("spaced out name");
  });
  it("falls back when everything is illegal", () => {
    expect(sanitizeFilename("//////")).toBe("media");
  });
});

describe("contentDispositionFilename", () => {
  it("includes an ASCII fallback", () => {
    expect(contentDispositionFilename('a"b.mp4')).toContain('filename="a b.mp4"');
  });
  it("encodes the UTF-8 name", () => {
    expect(contentDispositionFilename("vidéo.mp4")).toContain("filename*=UTF-8''");
    expect(contentDispositionFilename("vidéo.mp4")).toContain("%C3%A9");
  });
});
