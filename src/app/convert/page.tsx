import type { Metadata } from "next";
import { Converter } from "@/features/converter/converter";

export const metadata: Metadata = {
  alternates: { canonical: "/convert" },
  title: "Converter",
  description:
    "Drop local files and convert them server-side: MP4, WebM, MP3, WAV, AAC. Extract audio from video, swap containers, tune quality — powered by FFmpeg.",
};

export default function ConvertPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink3 sm:text-[11px]">
        Toolbox — Converter
      </p>
      <h1 className="mt-3 font-display text-[clamp(2.25rem,7vw,3.5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-ink">
        Convert media files.
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink2">
        Drop a file, pick where it lands. Converted with FFmpeg on Toolbox&apos;s
        server — files are deleted 15 minutes after the job finishes.
      </p>

      <div className="mt-8 sm:mt-10">
        <Converter />
      </div>
    </section>
  );
}
