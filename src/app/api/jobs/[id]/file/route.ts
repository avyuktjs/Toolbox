import { getJobFile } from "@/server/jobs";
import { contentDispositionFilename } from "@/lib/format";
import fs from "node:fs";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  flac: "audio/flac",
};

function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const file = getJobFile(id);
  if (!file) {
    return new Response("File expired or never existed. Toolbox keeps finished files for 15 minutes.", {
      status: 410,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const stream = Readable.toWeb(fs.createReadStream(file.path)) as ReadableStream;
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(file.filename),
      "Content-Length": String(file.size),
      "Content-Disposition": contentDispositionFilename(file.filename),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function HEAD(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const file = getJobFile(id);
  if (!file) return new Response(null, { status: 410 });
  return new Response(null, {
    status: 200,
    headers: { "Content-Length": String(file.size), "Cache-Control": "private, no-store" },
  });
}
