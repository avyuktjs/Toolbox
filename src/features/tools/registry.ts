import {
  Binary,
  Braces,
  CaseSensitive,
  Clock,
  Columns2,
  Contrast,
  Download,
  FileCog,
  Fingerprint,
  Image as ImageIcon,
  QrCode,
  Type,
  Link2,
  AlignLeft,
  type LucideIcon,
} from "lucide-react";

export interface Tool {
  slug: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
}

/** The Toolbox — everything here works, locally and for free. */
export const TOOLS: Tool[] = [
  {
    slug: "/downloader",
    name: "Media Downloader",
    tagline: "Paste a link, pick a format, keep the file — real streams, real sizes.",
    icon: Download,
  },
  {
    slug: "/convert",
    name: "Media Converter",
    tagline: "A local FFmpeg bench: MP4, WebM, MP3, WAV, AAC — no watermarks.",
    icon: FileCog,
  },
  {
    slug: "/image",
    name: "Image Studio",
    tagline: "PNG ↔ JPEG ↔ WebP — plus resize, crop and rotate. Local, always.",
    icon: ImageIcon,
  },
  {
    slug: "/json",
    name: "JSON Formatter",
    tagline: "Validate, prettify or minify — with the error position when it breaks.",
    icon: Braces,
  },
  {
    slug: "/base64",
    name: "Base64",
    tagline: "Encode and decode text both ways, UTF-8 safe.",
    icon: Binary,
  },
  {
    slug: "/case-converter",
    name: "Case Converter",
    tagline: "camelCase to CONSTANT_CASE and everything between.",
    icon: CaseSensitive,
  },
  {
    slug: "/word-counter",
    name: "Word Counter",
    tagline: "Words, characters, sentences, lines and reading time — live.",
    icon: Type,
  },
  {
    slug: "/uuid",
    name: "UUID Generator",
    tagline: "Fresh v4 UUIDs on demand, ready to paste.",
    icon: Fingerprint,
  },
  {
    slug: "/contrast",
    name: "Contrast Checker",
    tagline: "WCAG ratios for any two colors, AA and AAA verdicts.",
    icon: Contrast,
  },
  {
    slug: "/qr",
    name: "QR Code Generator",
    tagline: "URLs to scannable PNG — three sizes, your colors, no frames.",
    icon: QrCode,
  },
  {
    slug: "/url",
    name: "URL Encoder",
    tagline: "Percent-encode or decode — exactly the bytes you meant.",
    icon: Link2,
  },
  {
    slug: "/hash",
    name: "Hash Generator",
    tagline: "SHA-256, SHA-1 and SHA-512 — computed locally, always.",
    icon: Fingerprint,
  },
  {
    slug: "/timestamp",
    name: "Unix Timestamp",
    tagline: "Epoch ↔ date, both ways — with a live clock and relative time.",
    icon: Clock,
  },
  {
    slug: "/diff",
    name: "Text Diff",
    tagline: "Line-based diff, zero dependencies — paste before and after.",
    icon: Columns2,
  },
  {
    slug: "/lorem",
    name: "Lorem Ipsum",
    tagline: "Deterministic filler — same seed, same paragraphs, every time.",
    icon: AlignLeft,
  },
];
