# Toolbox

[![CI](https://github.com/avyuktjs/Toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/avyuktjs/Toolbox/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/avyuktjs/Toolbox/blob/main/LICENSE)
[![Next.js 16](https://img.shields.io/badge/next.js-16-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5-3178c6.svg)](https://www.typescriptlang.org)

A growing shelf of free, instant everyday web tools. No accounts, no sign-up — just open and use.

![The Toolbox home page](./docs/screenshot.png)

Live at **toolbox.vishaljadhav.me**. No accounts. Media files are deleted after 15 minutes; the other 36 tools never upload anything at all.

> Work in progress — new tools land here regularly. Built by [avyuktjs](https://github.com/avyuktjs) · [vishy.dino.icu](https://vishy.dino.icu/) · [source](https://github.com/avyuktjs/Toolbox)

## Five shelves, 38 tools

Every tool lives on exactly one shelf. Each shelf has its own filter, and ⌘K / Ctrl-K finds shelves as well as tools. The full bench is still on the home page if you'd rather scroll.

| Shelf | Route | What's on it |
| --- | --- | --- |
| MediaTools | `/mediatools` | The downloader and the FFmpeg bench — the two machines that need a server |
| DevTools | `/devtools` | 16 tools: JSON, regex, JWT, cron, hashes, codecs, diffs and generators |
| ImageTools | `/imagetools` | 12 tools: crop, compress, redact, EXIF, palette, watermark, favicons, PDFs |
| DesignTools | `/designtools` | Gradients, shadows, shade ladders, WCAG contrast |
| TextTools | `/texttools` | Markdown preview, word counter, case converter, lorem |

## What's on the bench

One utility per route. Everything below runs locally in your tab unless the row says otherwise.

### MediaTools

| Route | What it does |
| --- | --- |
| `/downloader` | Paste a link, pick resolution and format (MP4/WebM video, MP3/WAV/AAC audio), keep the file |
| `/convert` | FFmpeg bench for local files — container conversion, audio extraction, custom CRF |

### DevTools

| Route | What it does |
| --- | --- |
| `/json` | Validate / prettify / minify, with the exact position when it breaks |
| `/regex` | Pattern, flags, live highlights and capture groups — with a replace preview |
| `/data-convert` | JSON ↔ YAML ↔ TOML ↔ CSV — round-trip safe |
| `/jwt` | Header, payload and expiry verdict — decoded locally, never verified |
| `/cron` | `*/15 9-17 * * *` in plain English — plus the next five real run times |
| `/diff` | Line diff with no dependencies |
| `/lines` | Sort, dedupe, reverse, shuffle, trim, number any pasted list |
| `/base64` | Base64 encode/decode, UTF-8 safe |
| `/url` | Percent-encode / decode |
| `/hash` | SHA-256, SHA-1, SHA-512 of anything |
| `/uuid` | v4 UUIDs, batch generation |
| `/timestamp` | Epoch ↔ date, both directions, live clock |
| `/chmod` | Toggle rwx bits — octal and symbolic, both directions |
| `/slugify` | Any title → clean URL slug — batch mode included |
| `/password` | Rejection-sampled randomness, honest entropy math, bulk rolls |
| `/qr` | URLs to PNG, custom colors, three sizes |

### ImageTools

| Route | What it does |
| --- | --- |
| `/image` | PNG ↔ JPEG ↔ WebP — resize, crop and rotate, local always |
| `/crop` | Visual crop — drag the rect, thirds grid, ratio presets incl. passport 35×45 |
| `/compress` | Name a target KB — quality and dimensions get binary-searched until it fits |
| `/redact` | Pixelate, blur or blackout sensitive bits before you post — burned in before export |
| `/exif` | Camera, exposure and GPS metadata — inspect, then strip with one click |
| `/palette` | The 8 dominant colors from any image — median-cut, click to copy |
| `/ascii` | Any image → text characters or a downloadable PNG |
| `/watermark` | Batch text/logo stamps across sets — download one by one or as a zip |
| `/favicon` | One logo → .ico, every PNG size, webmanifest and head snippet — zipped |
| `/images-to-pdf` | Reorder images, pick a page size — one clean PDF out |
| `/pdf` | Merge, reorder, split, extract page ranges — or rasterize pages to PNG |
| `/placeholder` | Canvas-rendered placeholders at any size — blueprint grid included |

### DesignTools

| Route | What it does |
| --- | --- |
| `/gradient` | Linear, radial and conic — layered stops, pure CSS out |
| `/shadow` | Layered physical shadows, insets and all — copy real CSS |
| `/shades` | One hex → full 50–950 ladder — CSS vars, Tailwind @theme or JSON |
| `/contrast` | WCAG AA/AAA verdicts for any two colors |

### TextTools

| Route | What it does |
| --- | --- |
| `/markdown` | GFM preview, side by side — sanitized, copy the HTML |
| `/word-counter` | Words, characters, sentences, lines, reading time |
| `/case-converter` | camelCase → CONSTANT_CASE, copy any row |
| `/lorem` | Deterministic placeholder text |

### Around the bench

| Route | What it does |
| --- | --- |
| `/` | The bench — shelves on top, all 38 tools below, filtered as you type |
| `/history` | What you've made, kept in your browser only; entries expire when the files do |
| `/sites` | The full index of yt-dlp-supported source sites |
| `/faq` | The usual questions, answered honestly |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · yt-dlp · FFmpeg · pdf-lib + pdfjs-dist · fflate · exifr · marked + DOMPurify · YAML / TOML / CSV parsers

## Run it locally

```bash
npm install
npm run dev
```

The media tools need `yt-dlp` and `ffmpeg` on your PATH:

```bash
# Debian / Ubuntu
sudo apt install ffmpeg && pipx install yt-dlp
# macOS
brew install ffmpeg yt-dlp
```

On a small host, cap the build workers so Next doesn't eat all the RAM:

```bash
NEXT_BUILD_WORKERS=2 npm run build
```

## Nitty-gritty

- **Local by default:** image work, PDFs, text, CSS generators and every generator on the bench run in the browser. Nothing is uploaded; the files never leave the tab.
- **The two server tools:** yt-dlp and FFmpeg only. Streams come from the source, sizes are reported only when the source says them, no DRM bypassing of any kind.
- **Bot checks:** YouTube sometimes challenges data-centre IPs. Toolbox never asks visitors for accounts or cookies, and the UI has no proxy or cookie fields. Before giving up, the server retries YouTube with several player clients (`tv_embedded`, `android_vr`, `visionos`, `web_embedded`) because they are challenged independently. If the IP is still blocked, operators can opt in with env vars: `YTDLP_PROXY` (proxy URL), `YTDLP_COOKIES` (path to a `cookies.txt` on the server, mode 600), or `YTDLP_COOKIES_FROM_BROWSER` (a local browser profile such as `firefox`; useful when running Toolbox on your own machine). Cookies are live session credentials — use a throwaway account and never commit the file. The error message says plainly when a bot check is happening.
- **Privacy:** those two upload paths live in `.toolbox-tmp/` under the project root and are swept after 15 minutes. History is `localStorage` on your device; the server never knows what you did.
- **No AI:** no upscaling, no "enhance", no generated filler. Every tool does a deterministic job you can verify.
- **Limits:** 300 MB per media upload, rate-limited per IP (20/min inspect, 10/min convert/download), single-node deploys.
- **VPS notes:** keep `yt-dlp` current (`yt-dlp -U`, or `pipx upgrade yt-dlp`) and install [Deno](https://deno.com/) — yt-dlp uses it to solve YouTube's JS challenges. If YouTube still refuses a public video, the VPS IP is flagged; use `YTDLP_COOKIES` or `YTDLP_PROXY`. A recent yt-dlp plus a JS runtime fixes most “unavailable” errors that only happen on the server.
- **Deploy notes:** the production build uses `prebuild` to copy the pdfjs worker into `public/`. Here it runs under pm2 behind a Cloudflare tunnel. When uploading prebuilt `.next` artifacts to a host, delete its existing `.next` first — Next will otherwise keep serving cached HTML from the previous build.
- **Search Console:** add `https://toolbox.vishaljadhav.me` as a domain property in Google Search Console, verify with the HTML file Google gives you (drop it in `public/`, or set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` to the meta-tag token), then submit `https://toolbox.vishaljadhav.me/sitemap.xml`. `robots.txt` is generated at `/robots.txt`; canonicals, Open Graph and JSON-LD come from the root layout. Override the absolute origin with `NEXT_PUBLIC_SITE_URL` for other domains.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) — short version: honest output
only, files are temporary, no accounts, no new deps without a reason.

## License

MIT — see [LICENSE](./LICENSE).
