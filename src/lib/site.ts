/* One source of truth for absolute URLs in metadata, sitemap and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolbox.vishaljadhav.me").replace(/\/+$/, "");

export const SITE_NAME = "Toolbox";

export const SITE_DESCRIPTION =
  "A growing bench of free, instant web utilities — media downloader, FFmpeg converter, image and PDF tools, and dozens of small fast ones. No accounts, no uploads.";
