/** Honest translation of yt-dlp failures — no euphemisms, no fake fixes. */
export function mapExtractorError(stderr: string): string {
  const tail = stderr
    .split("\n")
    .map((line) => line.replace(/^ERROR:\s*/i, "").trim())
    .filter(Boolean);
  const last = tail[tail.length - 1] ?? "";
  const text = last.toLowerCase();

  // YouTube's bot challenge is an IP reputation problem, not a private video.
  // Check this before anything containing "sign in" so it isn't mislabelled.
  if (
    /sign in to confirm|not a bot|use --cookies|cookies-from-browser|vpn or a proxy|proxy server|too many requests|http error 429/.test(
      text,
    )
  ) {
    return "YouTube blocked this server with a bot check — the video is public, but the server's IP isn't trusted. Toolbox never asks visitors for credentials; the host operator can configure a proxy or cookies, or you can try the downloader from your own machine or another public source.";
  }

  if (/private video|video is private|members-only|sign in to view this video/.test(text)) {
    return "This video is private or members-only. Toolbox doesn't touch login-walled media.";
  }
  // A format error is not a missing video — say so instead of blaming the source.
  if (/requested format is not available|format is not available|only images are available/.test(text)) {
    return "That exact format isn't offered by this source — pick another resolution or container and try again.";
  }
  if (/unsupported url|unable to extract|no video formats/.test(text)) {
    return "That page doesn't look like a supported media source.";
  }
  if (/not available|unavailable|removed|copyright|terminated/.test(text)) {
    return "This video isn't available from this server — it may be removed, private, age-restricted, or blocked for this server's region/IP. If it plays in your browser, the server's IP is the likely blocker; the host operator can configure YTDLP_COOKIES or YTDLP_PROXY. Toolbox doesn't bypass those restrictions.";
  }
  if (/timed out|timeout|network|resolve|unreachable|econn/.test(text)) {
    return "The source didn't respond in time. Check your connection and try again.";
  }
  const trimmed = last.length > 220 ? `${last.slice(0, 217)}…` : last;
  return trimmed ? `Couldn't inspect that link: ${trimmed}` : "Couldn't inspect that link.";
}
