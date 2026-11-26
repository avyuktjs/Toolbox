import type { Metadata } from "next";
import { Downloader } from "@/features/downloader/downloader";

export const metadata: Metadata = {
  alternates: { canonical: "/downloader" },
  title: "Media Downloader",
  description:
    "Paste a link, pick the format, keep the file. Toolbox reads the source and shows you exactly what exists — real resolutions, codecs and sizes.",
};

export default function DownloaderPage() {
  return <Downloader />;
}
