import { NextResponse } from "next/server";
import { inspectUrl, mediaUrlSchema } from "@/server/ytdlp";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "inspect"), 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many inspections — wait ${limit.retryAfterSec}s and try again.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Send the link as JSON." }, { status: 400 });
  }

  const parsed = mediaUrlSchema.safeParse((body as { url?: unknown })?.url);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid link." },
      { status: 400 },
    );
  }

  const result = await inspectUrl(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 422 });
  }
  return NextResponse.json({ ok: true, media: result.media });
}
