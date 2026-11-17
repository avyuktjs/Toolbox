/* Server-side job registry + temporary file lifecycle.
   In-memory by design (single node). Files live in .toolbox-tmp with a TTL
   and are swept opportunistically and on a timer. */

import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ChildProcess } from "node:child_process";
import type { JobKind, JobSnapshot } from "@/types/media";

const TOOLBOX_ROOT = path.join(process.cwd(), ".toolbox-tmp");
export const JOBS_DIR = path.join(TOOLBOX_ROOT, "jobs");
export const UPLOADS_DIR = path.join(TOOLBOX_ROOT, "uploads");

export const JOB_TTL_MS = 15 * 60 * 1000;
export const UPLOAD_TTL_MS = 15 * 60 * 1000;
export const MAX_RUNNING_JOBS = 3;

interface JobRecord extends JobSnapshot {
  filePath: string | null;
  child: ChildProcess | null;
  /** Resolved output path once the process exits (before rename). */
  cancelRequested: boolean;
}

interface UploadRecord {
  id: string;
  path: string;
  name: string;
  size: number;
  durationSec: number | null;
  createdAt: number;
}

interface Store {
  jobs: Map<string, JobRecord>;
  uploads: Map<string, UploadRecord>;
  sweeper: NodeJS.Timeout | null;
}

const g = globalThis as unknown as { __toolboxStore?: Store };
const store: Store = (g.__toolboxStore ??= {
  jobs: new Map(),
  uploads: new Map(),
  sweeper: null,
});

export function ensureDirs() {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function sweep() {
  ensureDirs();
  const now = Date.now();
  for (const [id, job] of store.jobs) {
    const expired =
      job.state !== "running" &&
      ((job.finishedAt ?? job.createdAt) + JOB_TTL_MS < now);
    if (expired) {
      if (job.filePath) fs.rm(job.filePath, { force: true }, () => {});
      fs.rm(path.join(JOBS_DIR, id), { recursive: true, force: true }, () => {});
      store.jobs.delete(id);
    }
  }
  for (const [id, up] of store.uploads) {
    if (up.createdAt + UPLOAD_TTL_MS < now) {
      fs.rm(up.path, { force: true }, () => {});
      store.uploads.delete(id);
    }
  }
}

export function startSweeper() {
  if (store.sweeper) return;
  ensureDirs();
  const t = setInterval(sweep, 60_000);
  t.unref();
  store.sweeper = t;
}

/* ---------------- jobs ---------------- */

export function createJob(kind: JobKind, title: string | null): JobSnapshot {
  startSweeper();
  sweep();
  const running = [...store.jobs.values()].filter((j) => j.state === "running").length;
  if (running >= MAX_RUNNING_JOBS) {
    throw new JobLimitError();
  }
  const id = randomUUID();
  const now = Date.now();
  const record: JobRecord = {
    id,
    kind,
    state: "running",
    stage: "Queued",
    percent: null,
    speed: null,
    eta: null,
    filename: null,
    size: null,
    error: null,
    title,
    createdAt: now,
    finishedAt: null,
    downloadUrl: null,
    filePath: null,
    child: null,
    cancelRequested: false,
  };
  store.jobs.set(id, record);
  return toSnapshot(record);
}

export function attachChild(id: string, child: ChildProcess) {
  const job = store.jobs.get(id);
  if (job) job.child = child;
}

export function updateJob(id: string, patch: Partial<Omit<JobRecord, "id" | "child">>) {
  const job = store.jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
}

export function completeJob(id: string, filePath: string, filename: string, size: number, title: string | null) {
  const job = store.jobs.get(id);
  if (!job) return;
  job.state = "complete";
  job.stage = "Done";
  job.percent = 100;
  job.speed = null;
  job.eta = null;
  job.filePath = filePath;
  job.filename = filename;
  job.size = size;
  job.title = title ?? job.title;
  job.finishedAt = Date.now();
  job.downloadUrl = `/api/jobs/${job.id}/file`;
}

export function failJob(id: string, message: string) {
  const job = store.jobs.get(id);
  if (!job) return;
  job.state = "error";
  job.stage = "Failed";
  job.error = message;
  job.finishedAt = Date.now();
  job.percent = job.percent ?? null;
  if (job.filePath) fs.rm(job.filePath, { force: true }, () => {});
  fs.rm(path.join(JOBS_DIR, id), { recursive: true, force: true }, () => {});
}

export function cancelJob(id: string): boolean {
  const job = store.jobs.get(id);
  if (!job || job.state !== "running") return false;
  job.cancelRequested = true;
  try {
    job.child?.kill("SIGTERM");
  } catch {
    /* already gone */
  }
  failJob(id, "Cancelled by you.");
  return true;
}

export function getJobSnapshot(id: string): JobSnapshot | null {
  const job = store.jobs.get(id);
  return job ? toSnapshot(job) : null;
}

export function getJobFile(id: string): { path: string; filename: string; size: number } | null {
  const job = store.jobs.get(id);
  if (!job || job.state !== "complete" || !job.filePath || !job.filename) return null;
  try {
    const stat = fs.statSync(job.filePath);
    return { path: job.filePath, filename: job.filename, size: stat.size };
  } catch {
    return null;
  }
}

function toSnapshot(job: JobRecord): JobSnapshot {
  const snapshot = { ...job } as Partial<JobRecord>;
  delete snapshot.filePath;
  delete snapshot.child;
  delete snapshot.cancelRequested;
  return snapshot as JobSnapshot;
}

/* ---------------- uploads ---------------- */

export function registerUpload(record: {
  id: string;
  path: string;
  name: string;
  size: number;
  durationSec: number | null;
}): UploadRecord {
  startSweeper();
  const full: UploadRecord = { ...record, createdAt: Date.now() };
  store.uploads.set(full.id, full);
  return full;
}

export function getUpload(id: string): UploadRecord | null {
  return store.uploads.get(id) ?? null;
}

export function deleteUpload(id: string) {
  const up = store.uploads.get(id);
  if (up) fs.rm(up.path, { force: true }, () => {});
  store.uploads.delete(id);
}

export class JobLimitError extends Error {
  constructor() {
    super("Too many jobs are running right now. Wait a moment and try again.");
    this.name = "JobLimitError";
  }
}
