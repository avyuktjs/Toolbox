import {
  Clapperboard,
  Code2,
  Image as ImageIcon,
  PenLine,
  SwatchBook,
  type LucideIcon,
} from "lucide-react";


export interface Bundle {
  slug: string;
  /** short name — used on tiles and in the search palette */
  name: string;
  /** one-line manifesto on the tile */
  manifesto: string;
  /** header line on the bundle page */
  eyebrow: string;
  title: string;
  description: string;
  toolSlugs: string[];
  icon: LucideIcon;
}

export const BUNDLES: Bundle[] = [
  {
    slug: "/mediatools",
    name: "MediaTools",
    manifesto: "Downloader + FFmpeg bench",
    eyebrow: "Toolbox — MediaTools Bundle",
    title: "Feed it a link.",
    description:
      "The two heavy machines — the media downloader and the local FFmpeg converter. Everything the rest of the shelf isn't.",
    toolSlugs: ["/downloader", "/convert"],
    icon: Clapperboard,
  },
  {
    slug: "/devtools",
    name: "DevTools",
    manifesto: "Regex, JSON, JWT, cron…",
    eyebrow: "Toolbox — DevTools Bundle",
    title: "For people who ship.",
    description:
      "JSON, regex, JWTs, cron, hashes, diffs and the rest of the developer workbench — every one local, every one free. Filter as you type.",
    toolSlugs: [
      "/json", "/regex", "/jwt", "/data-convert",
      "/cron", "/diff", "/lines", "/qr",
      "/base64", "/url", "/hash", "/uuid",
      "/timestamp", "/chmod", "/slugify", "/password",
    ],
    icon: Code2,
  },
  {
    slug: "/imagetools",
    name: "ImageTools",
    manifesto: "Crop, PDFs, compress, redact",
    eyebrow: "Toolbox — ImageTools Bundle",
    title: "Pixels, handled.",
    description:
      "Every image and document tool on the bench — crop, compress, redact, watermark, palette, PDFs — one tab, nothing uploaded. Filter as you type.",
    toolSlugs: [
      "/image", "/crop", "/compress", "/redact",
      "/exif", "/palette", "/ascii", "/watermark",
      "/favicon", "/images-to-pdf", "/pdf", "/placeholder",
    ],
    icon: ImageIcon,
  },
  {
    slug: "/designtools",
    name: "DesignTools",
    manifesto: "Gradients, shadows, colors",
    eyebrow: "Toolbox — DesignTools Bundle",
    title: "Taste, compiled.",
    description:
      "Visual CSS generators and color verdicts — gradients, layered shadows, shade ladders and WCAG contrast. No assets, just declarations.",
    toolSlugs: ["/gradient", "/shadow", "/shades", "/contrast"],
    icon: SwatchBook,
  },
  {
    slug: "/texttools",
    name: "TextTools",
    manifesto: "Markdown, words, case",
    eyebrow: "Toolbox — TextTools Bundle",
    title: "Words, weighed.",
    description:
      "Markdown preview, word counter, case conversion and deterministic filler — for the writing side of the workbench.",
    toolSlugs: ["/markdown", "/word-counter", "/case-converter", "/lorem"],
    icon: PenLine,
  },
];
