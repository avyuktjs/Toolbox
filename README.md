# Toolbox

[![CI](https://github.com/avyuktjs/Toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/avyuktjs/Toolbox/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://github.com/avyuktjs/Toolbox/blob/main/LICENSE)
[![Next.js 16](https://img.shields.io/badge/next.js-16-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5-3178c6.svg)](https://www.typescriptlang.org)

Free, instant web utilities — a media downloader, an FFmpeg converter, and a shelf of small ones.

No accounts. Files are deleted after 15 minutes.

> Work in progress — new tools land here regularly. Built by [avyuktjs](https://github.com/avyuktjs) · [vishy.dino.icu](https://vishy.dino.icu/) · [source](https://github.com/avyuktjs/Toolbox)

## What's in it

| Route | What it does |
| --- | --- |
| `/downloader` | Paste a link, pick resolution and format (MP4/WebM video, MP3/WAV/AAC audio), keep the file |
| `/convert` | FFmpeg bench for local files — container conversion, audio extraction, custom CRF |
| `/history` | What you've made, kept in your browser only; entries expire when the files do |
| `/json` | Validate / prettify / minify, with the exact position when it breaks |
| `/base64` | Base64 encode/decode, UTF-8 safe |
| `/case-converter` | camelCase → CONSTANT_CASE, copy any row |
| `/word-counter` | Words, characters, sentences, lines, reading time |
| `/uuid` | v4 UUIDs, batch generation |
| `/contrast` | WCAG AA/AAA verdicts for any two colors |
| `/qr` | URLs to PNG, custom colors, three sizes |
| `/url` | Percent-encode / decode |
| `/hash` | SHA-256, SHA-1, SHA-512 of anything |
| `/timestamp` | Epoch ↔ date, both directions, live clock |
| `/diff` | Line diff with no dependencies |
| `/lorem` | Deterministic placeholder text |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · yt-dlp · FFmpeg

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

## Nitty-gritty

- **Downloading:** server-side yt-dlp; streams come from the source, sizes are reported only when the source says them, no DRM bypassing of any kind.
- **Privacy:** uploads and conversions live in `.toolbox-tmp/` under the project root and are swept after 15 minutes. History is `localStorage` on your device; the server never knows what you did.
- **Limits:** 300 MB per upload, rate-limited per IP (20/min inspect, 10/min convert/download), single-node deploys.

## License

MIT — see [LICENSE](./LICENSE).
