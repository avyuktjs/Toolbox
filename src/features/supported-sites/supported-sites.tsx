"use client";

import { useMemo, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import { SITES } from "./sites-data";

/** Every favicon is fetched from Google's favicon service at load time —
 * nothing ships here. Tiles link to the sites themselves. */
const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

/** Google's service 404s for some obscure domains — fall back to the
 *  domain's first letter on a tinted tile instead of a broken image. */
function Favicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        aria-hidden
        className="grid size-11 place-items-center rounded-[10px] bg-sunken font-mono text-[15px] font-bold uppercase text-ink2"
      >
        {domain[0]}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- remote favicon, never bundled
  return <img
    src={favicon(domain)}
    alt=""
    loading="lazy"
    referrerPolicy="no-referrer"
    width={44}
    height={44}
    className="size-11 rounded-[10px]"
    onError={() => setFailed(true)}
  />;
}

/** The most-used sites first, roughly by traffic — everything else follows
 *  alphabetically. Hand-picked, not measured: no fake counters. */
const POPULAR = [
  "youtube.com", "youtu.be", "music.youtube.com", "instagram.com", "tiktok.com",
  "facebook.com", "twitter.com", "reddit.com", "twitch.tv", "vimeo.com",
  "dailymotion.com", "rumble.com", "9gag.com", "linkedin.com", "pinterest.com",
  "snapchat.com", "bilibili.com", "soundcloud.com", "bandcamp.com", "odysee.com",
  "bitchute.com", "kick.com", "mixcloud.com", "audiomack.com", "reverbnation.com",
  "itv.com", "bbc.co.uk", "bbc.com", "cnn.com", "nbc.com",
  "cbs.com", "abcnews.go.com", "abc.com", "foxnews.com", "espn.com",
  "nytimes.com", "vice.com", "archive.org", "commons.wikimedia.org", "flickr.com",
  "imgur.com", "hotstar.com", "sonyliv.com", "khanacademy.org", "udemy.com",
  "ted.com", "instances.joinpeertube.org", "dw.com", "arte.tv", "raiplay.it",
  "pbs.org", "npr.org", "ctvnews.ca", "cbc.ca", "zdf.de", "bsky.app",
];

const RANKED = (() => {
  const byDomain = new Map(SITES.map((s) => [s.domain, s]));
  const top = POPULAR.map((d) => byDomain.get(d)).filter((s) => s !== undefined);
  const topSet = new Set(top.map((s) => s.domain));
  return [...top, ...SITES.filter((s) => !topSet.has(s.domain))];
})();

export function SupportedSites() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () => (needle ? RANKED.filter((s) => s.name.toLowerCase().includes(needle)) : RANKED),
    [needle],
  );

  return (
    <div>
      {/* filter — the same instinct as everywhere else in the app */}
      <label className="flex h-11 items-center gap-2 rounded-full border border-line2 bg-panel px-4 transition-colors focus-within:border-ink3">
        <Search className="size-4 shrink-0 text-ink3" strokeWidth={2} aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter 1100+ sites…"
          aria-label="Filter supported sites"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink3"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear the filter"
            onClick={() => setQuery("")}
            className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-ink2 transition-colors hover:text-ink"
          >
            <X className="size-3.5" strokeWidth={2.2} aria-hidden />
          </button>
        ) : (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-ink3">
            {SITES.length} sites
          </span>
        )}
      </label>

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-line2 px-6 py-14 text-center">
          <SearchX className="size-6 text-ink3" strokeWidth={1.6} />
          <p className="text-[14px] text-ink2">
            <span className="font-semibold text-ink">“{query.trim()}”</span> isn&apos;t a site yt-dlp
            knows. If the page is public, it&apos;s still worth a try anyway.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-[13px] font-medium text-accent-ink underline-offset-4 hover:underline"
          >
            Show all {SITES.length} sites
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {visible.map((site) => (
              <li key={site.domain}>
                <a
                  href={`https://${site.domain}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={site.name}
                  className="group flex h-full flex-col items-center gap-2.5 rounded-[14px] border border-line bg-panel px-2 py-4 text-center transition-colors duration-200 hover:border-brand/50 hover:bg-brand/[0.04]"
                >
                  <Favicon domain={site.domain} />
                  <span className="w-full truncate text-[11.5px] font-medium leading-tight text-ink2 transition-colors group-hover:text-ink">
                    {site.name}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-ink3">
            {needle
              ? `${visible.length} of ${SITES.length} sites match “${query.trim()}”`
              : `Every site yt-dlp ships an extractor for — ${SITES.length}, the ones people actually use up top, the rest after. Public pages only.`}
          </p>
        </>
      )}
    </div>
  );
}
