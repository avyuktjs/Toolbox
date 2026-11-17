import { ToolsGrid } from "@/features/tools/tools-grid";
import { TOOLS } from "@/features/tools/registry";

export default function ToolboxPage() {
  return (
    <section className="relative">
      {/* blue hero — a real page background, the nav floats inside it */}
      <div className="relative mb-2">
        <div
          aria-hidden
          className="absolute inset-0 rounded-b-[28px] bg-[linear-gradient(180deg,#2634cf_0%,#1d43f2_48%,#2f7cff_100%)]"
        >
          <div className="absolute inset-0 rounded-b-[28px] bg-[radial-gradient(120%_120%_at_50%_-20%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_55%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[84svh] w-full max-w-4xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 sm:py-28">
          <h1 className="font-display text-[clamp(3.3rem,10vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.035em] text-white">
            Every tool.
            <br />
            One tab<span className="text-[#a9c2ff]">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-white/70 sm:text-lg">
            {TOOLS.length} free, instant utilities — a downloader, a converter,
            and a bench of small fast ones. No accounts, no uploads.
          </p>
          <a
            href="#tools"
            className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-white transition-colors hover:text-white/80 hover:underline underline-offset-4"
          >
            Browse the tools
            <span aria-hidden>↓</span>
          </a>
        </div>
      </div>

      {/* the bench — a flat blue field, no glow tricks */}
      <div
        id="tools"
        className="mx-2 mb-2 scroll-mt-24 rounded-[28px] bg-[#e8efff] dark:bg-[#080b14]"
      >
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
          <ToolsGrid />
          <p className="mt-6 text-center text-[11px] font-medium text-ink3">
            Work in progress — more tools on the way.
          </p>
        </div>
      </div>
    </section>
  );
}
