"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Trash2, ShieldAlert, KeyRound } from "lucide-react";
import { AiCopyButton } from "@/components/ai-copy-button";
import { cn } from "@/lib/utils";

function base64UrlDecode(segment: string): string {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function smartDate(v: unknown, nowMs: number): { iso: string; relative: string } | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const ms = v * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = nowMs - ms;
  const abs = Math.abs(diffMs);
  const unit =
    abs >= 86_400_000 ? ["day", 86_400_000] as const
    : abs >= 3_600_000 ? ["hour", 3_600_000] as const
    : abs >= 60_000 ? ["minute", 60_000] as const
    : ["second", 1_000] as const;
  const amount = Math.floor(abs / unit[1]);
  const relative = diffMs >= 0 ? `${amount} ${unit[0]}${amount === 1 ? "" : "s"} ago` : `in ${amount} ${unit[0]}${amount === 1 ? "" : "s"}`;
  return { iso: date.toISOString(), relative };
}

interface Decoded {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

export function JwtTool() {
  const [token, setToken] = useState("");
  /* Date.now() is impure — keep a ticking clock in state instead */
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    const t = window.setTimeout(() => setNowMs(Date.now()), 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t);
    };
  }, []);

  const decoded = useMemo<{ ok: true; data: Decoded } | { ok: false; error: string } | null>(() => {
    const t = token.trim();
    if (!t) return null;
    const parts = t.split(".");
    if (parts.length !== 3) return { ok: false, error: `Expected 3 dot-separated parts — found ${parts.length}.` };
    try {
      const header = JSON.parse(base64UrlDecode(parts[0])) as Record<string, unknown>;
      const payload = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
      return { ok: true, data: { header, payload, signature: parts[2] } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Couldn't decode — is this really a JWT?" };
    }
  }, [token]);

  const claimTimes = nowMs > 0 && decoded?.ok
    ? {
        exp: smartDate(decoded.data.payload.exp, nowMs),
        iat: smartDate(decoded.data.payload.iat, nowMs),
        nbf: smartDate(decoded.data.payload.nbf, nowMs),
      }
    : null;

  const expVerdict = useMemo(() => {
    if (!decoded?.ok) return null;
    const exp = (decoded.data.payload as Record<string, unknown>).exp;
    if (typeof exp !== "number" || nowMs === 0) return null;
    return exp > Math.floor(nowMs / 1000)
      ? { label: "Not expired", cls: "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10" }
      : { label: "Expired", cls: "text-red-500 border-red-500/40 bg-red-500/10" };
  }, [decoded, nowMs]);

  return (
    <div className="soft-shadow overflow-hidden rounded-[18px] border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-sunken/40 px-4 py-2">
        <p className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">
          <KeyRound className="size-3.5" aria-hidden /> Decode only — signature is never verified here
        </p>
        <div className="flex items-center gap-1.5">
          <AiCopyButton variant="outline" size="sm" label="Copy payload" value={() => (decoded?.ok ? JSON.stringify(decoded.data.payload, null, 2) : "")} className="bg-panel" />
          <button
            type="button"
            onClick={() => setToken("")}
            aria-label="Clear"
            className="grid size-8 place-items-center rounded-full text-ink3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="eyJhbGciOi… paste a token — it never leaves this tab"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="JWT"
        className="block h-32 w-full resize-y break-all border-b border-line bg-panel p-4 font-mono text-[11.5px] leading-relaxed text-ink outline-none placeholder:text-ink3"
      />

      {decoded?.ok === false ? (
        <p role="alert" className="border-b border-line px-4 py-3 font-mono text-[12px] text-red-500">{decoded.error}</p>
      ) : null}

      {decoded?.ok ? (
        <>
          {/* verdict strip */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken/30 px-4 py-2">
            <span className="rounded-full border border-line2 bg-panel px-2.5 py-1 font-mono text-[11px] font-semibold text-ink2">
              alg <span className="text-ink">{String(decoded.data.header.alg ?? "?")}</span>
            </span>
            {decoded.data.header.typ ? (
              <span className="rounded-full border border-line2 bg-panel px-2.5 py-1 font-mono text-[11px] font-semibold text-ink2">
                typ <span className="text-ink">{String(decoded.data.header.typ)}</span>
              </span>
            ) : null}
            {expVerdict ? (
              <span className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", expVerdict.cls)}>
                {expVerdict.label === "Expired" ? <ShieldAlert className="size-3.5" aria-hidden /> : <BadgeCheck className="size-3.5" aria-hidden />}
                {expVerdict.label}
              </span>
            ) : null}
            {claimTimes?.exp ? (
              <span className="font-mono text-[11px] text-ink2" title={claimTimes.exp.iso}>exp {claimTimes.exp.relative}</span>
            ) : null}
            {claimTimes?.iat ? (
              <span className="font-mono text-[11px] text-ink2" title={claimTimes.iat.iso}>iat {claimTimes.iat.relative}</span>
            ) : null}
            {claimTimes?.nbf ? (
              <span className="font-mono text-[11px] text-ink2" title={claimTimes.nbf.iso}>nbf {claimTimes.nbf.relative}</span>
            ) : null}
          </div>

          <div className="grid md:grid-cols-2">
            <section className="border-b border-line md:border-b-0 md:border-r">
              <p className="border-b border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Header</p>
              <pre className="max-h-80 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-ink">{JSON.stringify(decoded.data.header, null, 2)}</pre>
            </section>
            <section>
              <p className="border-b border-line bg-sunken/40 px-4 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink3">Payload</p>
              <pre className="max-h-80 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-ink">{JSON.stringify(decoded.data.payload, null, 2)}</pre>
            </section>
          </div>
        </>
      ) : !token.trim() ? (
        <p className="px-4 py-8 text-center text-[13px] text-ink3">Paste a token — header and payload pretty-print here.</p>
      ) : null}
    </div>
  );
}
