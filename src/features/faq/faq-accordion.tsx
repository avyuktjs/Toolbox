import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

const linkCls =
  "font-medium text-ink underline decoration-line2 underline-offset-4 hover:decoration-ink";

const QA: { slug: string; q: string; a: React.ReactNode }[] = [
  {
    slug: "what",
    q: "What is Toolbox?",
    a: "A growing set of free, instant web utilities — a media downloader, an FFmpeg converter, a JSON formatter and more. Fifteen tools and counting, all on one tab, all free.",
  },
  {
    slug: "where",
    q: "Where do most of the tools run?",
    a: "Right in your browser. JSON, Base64, hashes, UUIDs, QR codes, the Image Studio — your data never leaves the tab. Only the Downloader and the Converter touch the server, because they need yt-dlp and FFmpeg.",
  },
  {
    slug: "shortcuts",
    q: "Can I jump around quickly?",
    a: (
      <>
        Yes. <Kbd>⌘K</Kbd> (or <Kbd>Ctrl K</Kbd>) opens the jump palette from anywhere. Press{" "}
        <Kbd>g</Kbd> then <Kbd>t</Kbd>, <Kbd>d</Kbd>, <Kbd>c</Kbd>, <Kbd>h</Kbd> or <Kbd>f</Kbd> to bounce
        between Toolbox, Downloader, Converter, History and this page. <Kbd>/</Kbd> focuses the link
        field on the Downloader, <Kbd>?</Kbd> toggles the shortcuts panel.
      </>
    ),
  },
  {
    slug: "why-pages",
    q: "Why are the tools separate pages?",
    a: "One tool per route means each loads fast, shares no state, and can be linked directly — send someone the exact tool, not a menu to dig through.",
  },
  {
    slug: "free",
    q: "Is this actually free?",
    a: "Yes. Free to use, with no ads, no tracking pixels, no paywalled formats and no “Pro” plan hiding the good stuff.",
  },
  {
    slug: "account",
    q: "Do I need an account?",
    a: "No. No sign-up, no login, no email. Everything works instantly.",
  },
  {
    slug: "where-files",
    q: "Where do my files go?",
    a: "Nowhere permanent. Uploads and downloads are processed on the server and purged after 15 minutes. History — the record of what you made — is stored only in your browser, never on the server.",
  },
  {
    slug: "history",
    q: "What's in History?",
    a: (
      <>
        Names, sizes and dates of things you downloaded or converted — stored locally in your
        browser, never sent anywhere. Clear the lot anytime from{" "}
        <Link href="/history" className={linkCls}>History</Link>.
      </>
    ),
  },
  {
    slug: "size",
    q: "How big can a file be?",
    a: "300 MB per upload for the converter. Downloads are as large as the source allows, held in a temp directory for 15 minutes.",
  },
  {
    slug: "exif",
    q: "Do the converted images keep my metadata?",
    a: "No — the Image Studio re-encodes everything in the browser, which strips EXIF, GPS and camera data automatically. Downloads keep only what the source serves.",
  },
  {
    slug: "why-fail",
    q: "Why can't I download this video?",
    a: "Toolbox only reads public sources. It can't bypass logins, private videos, members-only content or DRM — that's a hard limit of the download engine (yt-dlp), not a setting. If the source blocks a format, there's nothing we can do about it.",
  },
  {
    slug: "quality",
    q: "Is my download quality guaranteed?",
    a: "Only what the source offers. Toolbox lists resolutions and sizes that actually exist for the link you gave it — never invented ones. Pick 360p for small files, 1080p for balance, 2160p if the source has it.",
  },
  {
    slug: "playlists",
    q: "Does it do playlists?",
    a: "No — single videos and audio tracks. Point it at one file, get one file.",
  },
  {
    slug: "expire",
    q: "Why do my downloads disappear?",
    a: "Files live on the server for 15 minutes so links stay fast, then they're purged. Grab them while they last — History remembers what you made in the meantime.",
  },
  {
    slug: "copyright",
    q: "Can I use this with copyrighted videos?",
    a: "Toolbox can only fetch what a source serves publicly. What you do with the result is between you and the copyright holder — don't rip content you don't have rights to.",
  },
  {
    slug: "without-upload",
    q: "Can I convert without uploading?",
    a: "Images, yes — the Image Studio never uploads a pixel. Videos need the server's CPU, so those do travel; they're deleted 15 minutes after the job finishes.",
  },
  {
    slug: "who",
    q: "Who built this?",
    a: (
      <>
        <a href="https://github.com/avyuktjs/Toolbox" target="_blank" rel="noreferrer noopener" className={linkCls}>avyuktjs</a>
        {" — source is on GitHub. There's no company behind it, it's one person's afternoon project that grew."}
      </>
    ),
  },
  {
    slug: "open",
    q: "Is the source open?",
    a: (
      <>
        Yes — MIT licensed, on{" "}
        <a href="https://github.com/avyuktjs/Toolbox" target="_blank" rel="noreferrer noopener" className={linkCls}>GitHub</a>.
        Issues and pull requests are welcome — especially the honest kind of fix.
      </>
    ),
  },
  {
    slug: "self-host",
    q: "Can I self-host it?",
    a: "Clone it, npm ci, npm run build, npm start. You'll want Node 20+, ffmpeg and yt-dlp on the host — that's the whole shopping list. Nothing else phones home.",
  },
  {
    slug: "broken",
    q: "Something's broken. How do I tell you?",
    a: (
      <>
        Open an issue on{" "}
        <a href="https://github.com/avyuktjs/Toolbox/issues" target="_blank" rel="noreferrer noopener" className={linkCls}>GitHub</a>.
        Include what you pasted and what you expected.
      </>
    ),
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line2 bg-sunken px-1 align-baseline font-mono text-[10px] font-semibold leading-none text-ink">
      {children}
    </kbd>
  );
}

export function FaqAccordion() {
  return (
    <Accordion defaultValue={["what"]} className="mt-10">
      {QA.map(({ slug, q, a }) => (
        <AccordionItem key={slug} value={slug}>
          <AccordionTrigger>{q}</AccordionTrigger>
          <AccordionContent>{a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
