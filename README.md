# Toolbox — The toolbox.

Built by [avyuktjs](https://github.com/avyuktjs) · [vishy.dino.icu](https://vishy.dino.icu/) · source: [github.com/avyuktjs/Toolbox](https://github.com/avyuktjs/Toolbox)

An independent media downloader, converter, and growing set of small, sharp
utilities for the web — free, instant, no accounts.

> **Status:** work in progress — more tools land here regularly.

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript.
Server-side media work is done by **yt-dlp** (inspection + public-source
downloads) and **FFmpeg/ffprobe** (probing + transcoding). Everything else
runs locally in your browser.

## The toolbox

| Route | What it does |
| --- | --- |
| `/` | Toolbox — every tool on one tab, filtered as you type |
| `/downloader` | Media downloader: paste a link, pick a format, keep the file |
| `/convert` | Media converter: FFmpeg bench for local files, custom CRF included |
| `/history` | Local ledger of everything you've made (honest expiry labels) |
| `/json` | JSON validator / formatter / minifier with error positions |
| `/base64` | Base64 encode/decode, UTF-8 safe |
| `/case-converter` | camelCase … CONSTANT_CASE, one click to copy |
| `/word-counter` | Words, characters, sentences, reading time — live |
| `/uuid` | v4 UUIDs, batch generation, copy one or all |
| `/contrast` | WCAG AA/AAA contrast verdicts for any color pair |

Everything else (rate limiting, temp-file TTL, no-DRM honesty, inspect cache)
is documented below — those guarantees apply to the media tools. The rest are
purely client-side and need no server at all.

## What it does — for real

| Surface | What happens |
| --- | --- |
| `POST /api/inspect` | Validates the URL server-side, SSRF-guarded, then asks yt-dlp for `--dump-single-json`. Returns *actual* streams: available containers, heights, codecs, sizes. Unsupported or private sources surface yt-dlp's own error, mapped to plain English. |
| `POST /api/download` | Creates a job and spawns yt-dlp with a format selector built from *your* choice (container / height / audio format / bitrate). Progress is parsed from its stdout. Files land in `.toolbox-tmp/jobs/<id>/`. |
| `POST /api/upload` | Multipart upload, extension allow-list, 300 MB cap, then ffprobe-verified (no stream → rejected). |
| `POST /api/convert` | Builds an FFmpeg command (libx264 / libvpx-vp9 / libmp3lame / pcm_s16le / AAC) with quality or bitrate presets. Progress comes from `-progress pipe:1`. |
| `GET /api/jobs/[id]` | Job snapshot (state, percent, speed, ETA, filename, size). `DELETE` cancels. |
| `GET /api/jobs/[id]/file` | Streams the finished file with RFC 5987 `Content-Disposition`. `HEAD` exists for the history page's availability check. |
| `/history` | localStorage-backed ledger (`toolbox.history.v1`). Entries whose files were purged are labelled **Expired**, never faked as downloadable. |

### Guarantees (and deliberate non-guarantees)

- **No fabrication.** Resolutions, sizes, and progress all come from the
  actual source or the actual encoder. If the source reports no filesize,
  Toolbox says "size n/a" instead of inventing one.
- **No lock-picking.** Private, login-walled, DRM and geo-blocked media is
  not downloaded. yt-dlp's refusal is surfaced verbatim-ish.
- **15-minute shelf life.** Jobs and uploads live in `.toolbox-tmp/` under the
  project root with a TTL, swept opportunistically and on a 60s timer.
- **Rate-limited** per IP (inspect 20/min, upload 20/min, download & convert
  10/min), best-effort in-memory fixed window. Single-node deployments only.
- **Max 3 running jobs** server-side; the converter starts at most 3 at once.

## Develop

```bash
npm install          # requires node >= 20.9
npm run dev          # http://localhost:3000
```

Requires `yt-dlp` and `ffmpeg`/`ffprobe` on PATH:

```bash
# Debian/Ubuntu
sudo apt install ffmpeg && pipx install yt-dlp
# macOS
brew install ffmpeg yt-dlp
```

## Verify

```bash
npm run lint
npx tsc --noEmit
npm run build

# Exercise the API end-to-end (server must be running):
curl -X POST localhost:3000/api/inspect \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=aqz-KE-bpKQ"}'

# Convert something offline:
ffmpeg -f lavfi -i testsrc=duration=2:size=320x240:rate=15 /tmp/sample.mp4
# → drop sample.mp4 into /convert
```

## Architecture

```
src/
  app/                    routes + API route handlers (nodejs runtime)
  components/
    chrome/               nav, footer, logo, theme toggle, shortcuts dialog
    ui/                   button, segmented control, dialog, tooltip, toast
  features/
    downloader/           UrlConsole, Dossier, FormatSelector
    converter/            Dropzone, QueueItemCard, Converter (tray → bench)
    tools/                tool-shell + one client component per micro-tool
    history/              zustand store + history page
    shared/               useJobPolling, JobPanel, useMounted
  lib/                    cn(), format bytes/duration/dates, rate limiter
  server/                 server-only: jobs registry + TTL sweep, yt-dlp, ffmpeg
  types/media.ts          the client↔server contract
```

Design system lives in `src/app/globals.css` — #fbfbfd canvas, ink #1d1d1f,
one #0071e3 blue, Inter for display and UI, IBM Plex Mono for data, pill
controls, one soft shadow. Dark mode is true black with the same blue lifted.

Keyboard: `/` focus the link field · `Esc` blur · `g t/d/c/h/f`
navigate · `?` shortcuts panel.
