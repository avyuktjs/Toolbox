"use client";

import { useEffect, useState } from "react";

/** The repository shown next to the nav's GitHub link. */
export const REPO = "avyuktjs/Toolbox";

const CACHE_KEY = "toolbox:gh-stars";
const CACHE_TTL = 10 * 60 * 1000;

const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function readCache(): { at: number; count: number } | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; count: number };
    return typeof parsed.at === "number" && typeof parsed.count === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(count: number) {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), count }));
  } catch {
    /* best-effort */
  }
}

/** Primary source — the real GitHub API. */
async function fetchFromGitHub(): Promise<number | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { stargazers_count?: unknown };
  return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
}

/** Fallback for when the unauthenticated API is rate-limited — shields' SVG
    carries the count as text; we only need the number, never the badge. */
async function fetchFromShields(): Promise<number | null> {
  const res = await fetch(`https://img.shields.io/github/stars/${REPO}?style=plain`);
  if (!res.ok) return null;
  const svg = await res.text();
  const texts = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1].trim());
  for (const t of texts) {
    const match = t.match(/^([\d.]+)\s*([kKmM])?$/);
    if (match) {
      const value = parseFloat(match[1]);
      const suffix = match[2]?.toLowerCase();
      return Math.round(value * (suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1));
    }
  }
  return null;
}

/**
 * A tiny GitHub-star badge for the nav. One fetch per page load (plus a
 * 10-minute sessionStorage cache); when every source fails it renders just
 * the star without a count — the icon still links to the repo either way.
 */
export function GitHubStars() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const done = (count: number | null) => {
      if (!cancelled && count !== null) setStars(count);
    };

    const cached = readCache();
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      queueMicrotask(() => done(cached.count));
      return () => {
        cancelled = true;
      };
    }

    fetchFromGitHub()
      .then((count) => count ?? fetchFromShields())
      .then((count) => {
        if (count === null) return;
        writeCache(count);
        done(count);
      })
      .catch(() => {
        /* both sources down — the GitHub icon still links to the repo */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span
      className="hidden items-center gap-1 min-[420px]:flex"
      title={stars === null ? "Stars on GitHub" : `${stars.toLocaleString()} stars on GitHub`}
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
        <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.9l-3.764 1.98a.75.75 0 0 1-1.088-.791l.719-4.192L.81 6.374a.75.75 0 0 1 .416-1.279l4.21-.612L7.327.668A.75.75 0 0 1 8 .25Z" />
      </svg>
      <span className="font-mono text-[11px] font-semibold tabular-nums text-white/80">
        {stars === null ? "·" : compact(stars)}
      </span>
    </span>
  );
}
