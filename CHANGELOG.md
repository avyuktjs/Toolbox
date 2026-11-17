# Changelog

Notable changes to Toolbox, most recent first.

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
