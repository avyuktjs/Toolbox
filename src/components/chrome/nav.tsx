"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TileMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { ToolSearch } from "./tool-search";
import { ShortcutsDialog, useShortcuts, useShortcutState } from "./shortcuts";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  keyHint: string;
}

const LINKS: NavLink[] = [
  { href: "/", label: "Toolbox", keyHint: "g t" },
  { href: "/downloader", label: "Downloader", keyHint: "g d" },
  { href: "/convert", label: "Converter", keyHint: "g c" },
  { href: "/history", label: "History", keyHint: "g h" },
  { href: "/faq", label: "FAQ", keyHint: "g f" },
];

function isLinkActive(href: string, pathname: string): boolean {
  if (href === "/") return !LINKS.some((l) => l.href !== "/" && pathname === l.href);
  return pathname === href;
}

/**
 * The ink pill — app tile left, muted links center, and on the
 * right a search affordance: the tools filter on mobile (home),
 * the jump palette otherwise.
 */
export function Nav() {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen, toggleHelp] = useShortcutState();
  useShortcuts(toggleHelp, helpOpen);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // tuck the nav away on the way down, bring it back on the way up
  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y < 120) {
          setHidden(false);
        } else {
          const delta = y - lastY.current;
          if (Math.abs(delta) > 6) setHidden(delta > 0);
        }
        lastY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 pt-2 transition-transform duration-300 ease-out motion-reduce:transition-none",
          hidden ? "-translate-y-[130%]" : "translate-y-0",
        )}
        inert={hidden}
      >
        <div className="mx-auto w-full max-w-[1440px] px-2">
          <div className="relative mx-auto flex h-12 w-full max-w-[920px] items-center justify-between gap-2 rounded-full bg-[linear-gradient(180deg,#171b2b_0%,#0b0e19_55%,#06080f_100%)] py-1 pl-2 pr-2 ring-1 ring-white/[0.1] shadow-[0_1px_0_rgba(255,255,255,0.09)_inset,0_16px_34px_-18px_rgba(4,8,32,0.85)] sm:h-[54px] sm:pl-2.5 sm:pr-2.5">
            <Link
              href="/"
              aria-label="Toolbox — home"
              className="flex shrink-0 items-center gap-2 rounded-full p-1 pr-2 transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]"
            >
              <TileMark className="size-8 rounded-[9px] shadow-[0_0_0_1px_rgba(255,255,255,0.22)] sm:size-9" />
              <span className="hidden text-[1.02rem] font-extrabold leading-none tracking-[-0.02em] text-white min-[400px]:inline">
                toolbox<span className="text-[#7d9dff]">.</span>
              </span>
            </Link>

            <nav
              aria-label="Primary"
              className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 md:flex"
            >
              {LINKS.map(({ href, label, keyHint }) => {
                const active = isLinkActive(href, pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    title={keyHint}
                    className={cn(
                      "px-2.5 py-2 text-[12px] font-medium leading-none tracking-[-0.005em] transition-colors duration-200",
                      "hover:text-white",
                      active ? "text-white" : "text-white/55",
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <a
                href="https://github.com/avyuktjs/Toolbox"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Source on GitHub"
                title="Source on GitHub"
                className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.27 5.66.41.36.78 1.08.78 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.8.56C20.22 21.38 23.5 17.07 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
                </svg>
              </a>
              <div className="rounded-full [&_button]:size-8 [&_button]:rounded-full [&_button]:border-transparent [&_button]:text-white/70 [&_button]:hover:bg-white/15 [&_button]:hover:text-white">
                <ThemeToggle />
              </div>
              <ToolSearch />
            </div>
          </div>
        </div>
      </header>
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
