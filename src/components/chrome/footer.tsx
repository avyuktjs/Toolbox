import Link from "next/link";
import { TileMark } from "./logo";

const COLUMNS: { label: string; links: { href: string; text: string }[] }[] = [
  {
    label: "Product",
    links: [
      { href: "/", text: "Toolbox" },
      { href: "/downloader", text: "Media Downloader" },
      { href: "/convert", text: "Media Converter" },
      { href: "/history", text: "History" },
      { href: "/sites", text: "Supported Sites" },
      { href: "/faq", text: "FAQ" },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/json", text: "JSON Formatter" },
      { href: "/image", text: "Image Studio" },
      { href: "/base64", text: "Base64" },
      { href: "/case-converter", text: "Case Converter" },
      { href: "/word-counter", text: "Word Counter" },
      { href: "/uuid", text: "UUID Generator" },
      { href: "/contrast", text: "Contrast Checker" },
    ],
  },
  {
    label: "More tools",
    links: [
      { href: "/qr", text: "QR Code Generator" },
      { href: "/url", text: "URL Encoder" },
      { href: "/hash", text: "Hash Generator" },
      { href: "/timestamp", text: "Unix Timestamp" },
      { href: "/diff", text: "Text Diff" },
      { href: "/lorem", text: "Lorem Ipsum" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* brand panel */}
          <div className="lg:col-span-4">
            <Link href="/" aria-label="Toolbox — home" className="inline-flex items-center gap-2.5">
              <TileMark className="size-8 rounded-[9px] border border-line" />
              <span className="text-[1.35rem] font-extrabold leading-none tracking-[-0.03em] text-ink">
                toolbox<span className="text-accent">.</span>
              </span>
            </Link>
            <p className="mt-3 max-w-[17rem] text-[13px] leading-relaxed text-ink2">
              A growing set of everyday web tools.
            </p>
            <p className="mt-2 max-w-[17rem] text-[12px] leading-relaxed text-ink3">
              Work in progress — more tools on the way.
            </p>
            <p className="mt-4 max-w-[17rem] text-[12px] leading-relaxed text-ink3">
              Uploads clear automatically after 15 minutes.
            </p>
          </div>

          {/* link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:gap-6">
            {COLUMNS.map((col) => (
              <nav key={col.label} aria-label={col.label}>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-ink3">
                  {col.label}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[12.5px] text-ink2 transition-colors hover:text-ink"
                      >
                        {link.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[12px] leading-snug text-ink3 sm:flex-row sm:px-6">
          <p>© 2026 Toolbox — made by one person, on weekends.</p>
          <nav aria-label="Made by" className="flex items-center gap-4">
            <a
              href="https://github.com/avyuktjs"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 font-semibold text-ink2 transition-colors hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.27 5.66.41.36.78 1.08.78 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.8.56C20.22 21.38 23.5 17.07 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
              </svg>
              avyuktjs
            </a>
            <a
              href="https://vishy.dino.icu/"
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-ink2 transition-colors hover:text-ink"
            >
              vishy.dino.icu
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
