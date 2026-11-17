import { NextResponse } from "next/server";
import { z } from "zod";
import { mediaUrlSchema, startDownload } from "@/server/ytdlp";
import { createJob, JobLimitError, getJobSnapshot } from "@/server/jobs";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const selectionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("video"),
    container: z.enum(["mp4", "webm"]),
    height: z.number().int().min(144).max(4320).optional(),
  }),
  z.object({
    mode: z.literal("audio"),
    audioFormat: z.enum(["mp3", "wav", "aac"]),
    audioBitrate: z.union([z.literal(128), z.literal(192), z.literal(320)]).optional(),
  }),
]);

const bodySchema = z.object({
  url: mediaUrlSchema,
  title: z.string().trim().max(200).nullish(),
  selection: selectionSchema,
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "download"), 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many downloads — wait ${limit.retryAfterSec}s and try again.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Send the request as JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Check the download options." },
      { status: 400 },
    );
  }

  const { url, title, selection } = parsed.data;
  try {
    const job = createJob("download", title ?? url);
    startDownload(job.id, url, title ?? null, selection);
    return NextResponse.json({ ok: true, job: getJobSnapshot(job.id) ?? job });
  } catch (err) {
    if (err instanceof JobLimitError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 429 });
    }
    throw err;
  }
}
