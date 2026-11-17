"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is Toolbox?",
    a: "A growing set of free, instant web utilities — a media downloader, an FFmpeg converter, a JSON formatter and more. Fourteen tools and counting, all on one tab, all free.",
  },
  {
    q: "Do I need an account?",
    a: "No. No sign-up, no login, no email. Everything works instantly.",
  },
  {
    q: "Is this actually free?",
    a: "Yes. Free to use, with no ads, no tracking pixels, no paywalled formats and no “Pro” plan hiding the good stuff.",
  },
  {
    q: "Where do my files go?",
    a: "Nowhere permanent. Uploads and downloads are processed on the server and purged after 15 minutes. History — the record of what you made — is stored only in your browser, never on the server.",
  },
  {
    q: "Why can't I download this video?",
    a: "Toolbox only reads public sources. It can't bypass logins, private videos, members-only content or DRM — that's a hard limit of the download engine (yt-dlp), not a setting. If the source blocks a format, there's nothing we can do about it.",
  },
  {
    q: "Is my download quality guaranteed?",
    a: "Only what the source offers. Toolbox lists resolutions and sizes that actually exist for the link you gave it — never invented ones. Pick 360p for small files, 1080p for balance, 2160p if the source has it.",
  },
  {
    q: "Does it do playlists?",
    a: "No — single videos and audio tracks. Point it at one file, get one file.",
  },
  {
    q: "How big can a file be?",
    a: "300 MB per upload for the converter. Downloads are as large as the source allows, held in a temp directory for 15 minutes.",
  },
  {
    q: "Can I convert offline or outside the browser?",
    a: "Not yet — Toolbox is the app right here. A desktop build is on the list.",
  },
  {
    q: "Who built this?",
    a: (
      <>
        <a href="https://github.com/avyuktjs/Toolbox" target="_blank" rel="noreferrer noopener" className="font-medium text-ink underline decoration-line2 underline-offset-4 hover:decoration-ink">avyuktjs</a>
        {" — source is on GitHub. There’s no company behind it, it’s one person’s afternoon project that grew."}
      </>
    ),
  },
  {
    q: "Something's broken. How do I tell you?",
    a: (
      <>
        Open an issue on{" "}
        <a href="https://github.com/avyuktjs/Toolbox/issues" target="_blank" rel="noreferrer noopener" className="font-medium text-ink underline decoration-line2 underline-offset-4 hover:decoration-ink">GitHub</a>
        {". Include what you pasted and what you expected."}
      </>
    ),
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="mt-10 overflow-hidden rounded-[18px] border border-line bg-panel">
      {QA.map(({ q, a }, i) => {
        const expanded = open === i;
        return (
          <li key={q} className={cn("border-line", i > 0 && "border-t")}>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`faq-panel-${i}`}
              id={`faq-button-${i}`}
              onClick={() => setOpen(expanded ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-sunken/40 sm:px-6"
            >
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{q}</span>
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-ink3"
              >
                <ChevronDown className="size-4" strokeWidth={1.8} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="panel"
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-button-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="max-w-prose border-t border-line px-5 py-4 text-[13.5px] leading-relaxed text-ink2 sm:px-6">
                    {a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
