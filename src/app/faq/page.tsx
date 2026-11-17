import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/features/faq/faq-accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about Toolbox: what it is, where your files go, why some videos won't download, what's free, and who built it.",
};

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink3 sm:text-[11px]">
        FAQ
      </p>
      <h1 className="mt-3 font-display text-[clamp(2.5rem,7vw,4rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-ink">
        Questions, answered<span className="text-accent">.</span>
      </h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink2">
        Everything you might want to know about how Toolbox works, what it won&rsquo;t
        do, and where the lines are drawn. Click a question to open it.
      </p>

      <FaqAccordion />

      <p className="mt-8 text-[12px] leading-relaxed text-ink3">
        Still stuck? Browse the{" "}
        <Link href="/" className="font-medium text-ink2 hover:text-ink">toolbox</Link>{" "}
        or check the{" "}
        <a href="https://github.com/avyuktjs/Toolbox" target="_blank" rel="noreferrer noopener" className="font-medium text-ink2 hover:text-ink">source on GitHub</a>.
      </p>
    </section>
  );
}
