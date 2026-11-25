# Changelog

Notable changes to Toolbox, most recent first.

## [0.2.0] — 2026-11-25

The big bench update: 23 new tools, five searchable shelves, and a home page
that finally has some shape to it.

**Image & PDF tools (all local)**
- `/crop` — drag the crop rect right on the image, rule-of-thirds grid, aspect presets including passport 35×45
- `/redact` — pixelate, blur or black out regions; effects are burned into the export, not just layered on top
- `/compress` — name a target size; quality is binary-searched, then dimensions, until the file fits
- `/exif` — read camera, exposure and GPS metadata, then re-export a clean copy
- `/palette` — median-cut quantization for the eight dominant colors
- `/ascii` — image to characters, copyable as text or downloadable as PNG
- `/watermark` — batch text or logo stamps, nine placements or tiled, zipped output
- `/favicon` — `.ico`, six PNG sizes, webmanifest and `<head>` snippet in one zip
- `/images-to-pdf` — reorder images, choose page size and margins, one PDF out
- `/pdf` — merge, reorder, split, extract ranges, or rasterize pages to PNG
- `/placeholder` — canvas-rendered stand-ins, blueprint grid, any size

**Dev & data tools**
- `/regex` — flags, live highlights, capture groups and a replace preview
- `/data-convert` — JSON ↔ YAML ↔ TOML ↔ CSV, both directions
- `/jwt` — decode header and payload with an honest expiry verdict; explicitly no signature verification
- `/cron` — five-field expressions in plain English with the next five run times
- `/lines`, `/slugify`, `/password`, `/chmod` — text plumbing and generators
- `/markdown` — GFM preview, sanitized output, copy the HTML

**Design tools**
- `/gradient` — linear, radial and conic with layered stops and presets
- `/shadow` — stacked shadows with inset, spread and opacity controls
- `/shades` — one hex to a full 50–950 ladder, exported as CSS vars, Tailwind `@theme` or JSON

**Shelves & discovery**
- Five bundles — MediaTools, DevTools, ImageTools, DesignTools and TextTools — each with its own filter
- Every one of the 38 tools lives on exactly one shelf; no gaps, no duplicates
- Home page gets a compact shelf row built from the same card language as the bench
- ⌘K / Ctrl-K now finds shelves as well as tools; footer and README updated to match

**Under the hood**
- New deps with reasons: pdf-lib/pdfjs-dist, fflate, exifr, marked + DOMPurify, YAML/TOML/CSV parsers
- Pure logic (cron, page ranges, slug rules) pulled into `src/lib` and covered by 18 new unit tests
- PDF worker copied into `public/` at prebuild/predev — no CDN, no runtime fetch
- `NEXT_BUILD_WORKERS` cap for small hosts; the 2 GB VM couldn't survive Next's default four workers
- Deployed under pm2 behind the existing Cloudflare tunnel at toolbox.vishaljadhav.me

## [0.1.1] — 2026-11-17

- `/image` — Image Studio: PNG ↔ JPEG ↔ WebP, resize/crop/rotate, all local
- `/sites` — the full yt-dlp supported-sites index, searchable
- Nav: live GitHub star counter
- CI now runs the test suite on every push

## [0.1.0] — 2026-11-17

Initial public release.

**Downloading & Converting**
- `/downloader` — yt-dlp-backed: paste a public link, pick container (MP4/WebM), resolution (only what the source offers), audio format + bitrate. Real streams, real sizes, honest error messages.
- `/convert` — FFmpeg-backed: local files in, MP4/WebM/MP3/WAV/AAC out, custom CRF dial, audio extraction. 300 MB cap, files purged after 15 minutes.
- `/history` — localStorage-backed ledger. Entries disappear when the files do.

**The shelf**
- `/json` — validator / formatter / minifier with line:col for errors
- `/base64`, `/url` — codecs, UTF-8 safe
- `/case-converter` — camelCase to CONSTANT_CASE
- `/word-counter` — words, chars, sentences, reading time
- `/uuid` — v4 UUIDs, batched, copy one or all
- `/contrast` — WCAG AA/AAA verdicts
- `/qr`, `/hash`, `/timestamp`, `/diff`, `/lorem` — the rest of the bench

**Infrastructure**
- CI on every push: lint → type-check → tests → build
- Dependabot for npm updates
- Files never leave the machine except to the tools that need them, and then only for 15 minutes
