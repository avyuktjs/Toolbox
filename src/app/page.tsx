import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolsGrid } from "@/features/tools/tools-grid";
import { TOOLS } from "@/features/tools/registry";
import { BUNDLES } from "@/features/tools/bundles";

export default function ToolboxPage() {
  return (
    <section className="relative -mt-14 sm:-mt-[3.875rem]">
      {/* blue hero — fills the top under the floating nav */}
      <div className="relative mb-2">
        <div
          aria-hidden
          className="absolute inset-0 rounded-b-[28px] bg-[#1d43f2]"
        />

        <div className="relative mx-auto flex min-h-[84svh] w-full max-w-4xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 sm:py-28">
          <h1 className="font-display text-[clamp(3.3rem,10vw,5.6rem)] font-semibold leading-[0.94] tracking-[-0.035em] text-white">
            Every tool.
            <br />
            One tab<span className="text-[#a9c2ff]">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-white/70 sm:text-lg">
            {TOOLS.length} free, instant utilities — five curated shelves,
            a downloader, a converter. No accounts, no uploads.
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
          {/* shelves — built from the same bench primitives as every tool card */}
          <div id="shelves" className="mb-9 scroll-mt-24">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
                Shelves
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink3">
                {BUNDLES.length} benches · {TOOLS.length} tools
              </p>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BUNDLES.map((bundle, index) => {
                const Icon = bundle.icon;
                return (
                  <li key={bundle.slug} className={index === 0 ? "col-span-2" : ""}>
                    <Link
                      href={bundle.slug}
                      className="group flex h-full flex-col justify-between rounded-[18px] border border-line bg-panel p-4 transition-[background-color,border-color] duration-300 ease-out hover:border-brand hover:bg-brand sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="grid size-10 place-items-center rounded-[12px] bg-sunken text-ink transition-colors duration-200 group-hover:bg-white group-hover:text-brand">
                          <Icon className="size-[19px]" strokeWidth={1.8} />
                        </span>
                        <ArrowRight className="mt-0.5 size-4 text-ink3 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white" />
                      </div>
                      <div className="mt-5">
                        <span className="block text-[15px] font-semibold tracking-[-0.02em] text-ink transition-colors duration-200 group-hover:text-white sm:text-[17px]">
                          {bundle.name}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-ink2 transition-colors duration-200 group-hover:text-white/80">
                          {bundle.manifesto}
                        </span>
                      </div>
                      <span className="mt-3 inline-flex w-fit rounded-full bg-sunken px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink3 transition-colors duration-200 group-hover:bg-white group-hover:text-brand">
                        {bundle.toolSlugs.length} tools
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <ToolsGrid />
          <p className="mt-6 text-center text-[11px] font-medium text-ink3">
            Work in progress — more tools on the way.
          </p>
        </div>
      </div>
    </section>
  );
}
