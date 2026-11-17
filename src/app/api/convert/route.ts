import { NextResponse } from "next/server";
import { z } from "zod";
import { startConvert } from "@/server/ffmpeg";
import { createJob, JobLimitError, getJobSnapshot, getUpload } from "@/server/jobs";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    uploadId: z.string().uuid(),
    intent: z.enum(["video", "audio", "extract"]),
    videoTarget: z.enum(["mp4", "webm"]).optional(),
    audioTarget: z.enum(["mp3", "wav", "aac"]).optional(),
    videoQuality: z.enum(["high", "balanced", "compact"]).optional(),
    videocrf: z.number().int().min(0).max(51).optional(),
    audioBitrate: z.union([z.literal(128), z.literal(192), z.literal(320)]).optional(),
  })
  .refine((v) => !(v.intent === "video" && v.videoTarget == null), { message: "Choose an output container." })
  .refine((v) => v.intent === "video" || v.audioTarget != null, { message: "Choose an audio format." });

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "convert"), 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many conversions — wait ${limit.retryAfterSec}s and try again.` },
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
      { ok: false, error: parsed.error.issues[0]?.message ?? "Check the conversion options." },
      { status: 400 },
    );
  }

  const input = getUpload(parsed.data.uploadId);
  if (!input) {
    return NextResponse.json({ ok: false, error: "That upload expired. Add the file again." }, { status: 410 });
  }

  try {
    const job = createJob("convert", input.name);
    startConvert(job.id, parsed.data);
    return NextResponse.json({ ok: true, job: getJobSnapshot(job.id) ?? job });
  } catch (err) {
    if (err instanceof JobLimitError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 429 });
    }
    throw err;
  }
}
