# Contributing

Thanks for wanting to help. This is a small project with a narrow focus: fast,
free, honest web tools.

## Ground rules

- **Honest output only.** No fake progress, invented resolutions, placeholder
  downloads, or "it works on my machine" success states. If the source or the
  encoder can't tell us, the UI says so.
- **Files are temporary.** Uploads and conversions live in `.toolbox-tmp/` and
  are swept after 15 minutes. Never persist user files.
- **No accounts.** Don't add a login, a paywall, or a "pro" tier to the core
  tools.
- **No new deps without a reason.** Talk first in an issue.

## Getting set up

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

## Before opening a PR

```bash
npm run lint
npx tsc --noEmit
npm run build
npm test
```

All four must pass. CI will check the same things.

## Adding a tool

1. Register it in `src/features/tools/registry.ts`.
2. Add the route: `src/app/<slug>/page.tsx`.
3. Keep it client-side when possible — most tools need no server at all.
4. Add it to the footer in `src/components/chrome/footer.tsx`.
