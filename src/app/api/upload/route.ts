import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR, registerUpload, deleteUpload, ensureDirs } from "@/server/jobs";
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES, probeFile } from "@/server/ffmpeg";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import type { ProbedFile } from "@/types/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "upload"), 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many uploads — wait ${limit.retryAfterSec}s and try again.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "That file is over the 300 MB limit." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Send the file as multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Attach a media file." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "That file is over the 300 MB limit." }, { status: 413 });
  }

  const ext = (path.extname(file.name).slice(1) || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { ok: false, error: `".${ext || "?"}" isn't a supported media type. Try mp4, mkv, webm, mov, mp3, wav, m4a, aac, flac, ogg or opus.` },
      { status: 415 },
    );
  }

  ensureDirs();
  const id = randomUUID();
  const finalPath = path.join(/* turbopackIgnore: true */ UPLOADS_DIR, `${id}.${ext}`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(finalPath, buffer);
    const probe = await probeFile(finalPath);
    if (!probe.video && !probe.audio) {
      await fs.rm(finalPath, { force: true });
      return NextResponse.json({ ok: false, error: "That file has no audio or video stream." }, { status: 422 });
    }
    registerUpload({ id, path: finalPath, name: file.name, size: file.size, durationSec: probe.durationSec });
    const result: ProbedFile = { uploadId: id, name: file.name, size: file.size, ...probe };
    return NextResponse.json({ ok: true, file: result });
  } catch (err) {
    await fs.rm(finalPath, { force: true }).catch(() => {});
    deleteUpload(id);
    const message = err instanceof Error ? err.message : "Couldn't read that file.";
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
