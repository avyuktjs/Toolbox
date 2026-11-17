import { NextResponse } from "next/server";
import { getJobSnapshot, cancelJob } from "@/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const job = getJobSnapshot(id);
  if (!job) {
    return NextResponse.json({ ok: false, error: "No such job. It may have expired." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, job });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!cancelJob(id)) {
    return NextResponse.json({ ok: false, error: "That job isn't running." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
