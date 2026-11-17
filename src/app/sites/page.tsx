import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { SupportedSites } from "@/features/supported-sites/supported-sites";

export const metadata: Metadata = {
  title: "Supported sites",
  description:
    "The Downloader reads public pages on yt-dlp's 1000+ supported sites. This grid shows the popular ones — every tile links to the site itself.",
};

export default function SupportedSitesPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Supported sites"
      title="Every site it knows."
      description="Every site yt-dlp ships an extractor for — over a thousand, the everyday ones up top. Each tile links to the site itself; favicons load from Google's service, nothing is hosted here."
    >
      <SupportedSites />
    </ToolShell>
  );
}
