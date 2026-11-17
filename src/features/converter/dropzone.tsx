"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, FileUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBytes, sanitizeFilename } from "@/lib/format";
import type { ProbedFile } from "@/types/media";
import "@/components/motion/upload-box.css";

const ACCEPT_EXTS = new Set([
  "mp4", "mkv", "webm", "mov", "avi", "m4v",
  "mp3", "wav", "m4a", "aac", "flac", "ogg", "opus",
]);
export const ACCEPT = ".mp4,.mkv,.webm,.mov,.avi,.m4v,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus";
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

const VIDEO_EXTS = new Set(["mp4", "mkv", "webm", "mov", "avi", "m4v"]);
const tintFor = (ext: string) => (VIDEO_EXTS.has(ext) ? "#0071e3" : "#30d158");
const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase();
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface BoxItem {
  id: number;
  name: string;
  size: number;
  ext: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  uploadId?: string;
}

interface Ghost {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  ext: string;
}

let boxId = 0;

/** Rolling digit odometer for the percentage. */
function Roll({ value }: { value: number }) {
  const s = String(clamp(Math.round(value), 0, 100));
  return (
    <span className="rz" aria-hidden>
      {s.split("").map((d, i) => (
        <span key={s.length - i} className="rz-col">
          <span className="rz-strip" style={{ transform: `translateY(${-Number(d)}em)` }}>
            {"0123456789".split("").map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
      <span className="rz-pct">%</span>
    </span>
  );
}

/** File glyph — folded-corner page with a tinted extension label. */
function FileGlyph({ ext, size = 40 }: { ext: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M7.75 4A3.25 3.25 0 0 1 11 .75h16c.121 0 .238.048.323.134l10.793 10.793a.46.46 0 0 1 .134.323v24A3.25 3.25 0 0 1 35 39.25H11A3.25 3.25 0 0 1 7.75 36z"
        stroke="var(--line-2)"
        strokeWidth="1.6"
        fill="var(--sunken)"
      />
      <path d="M27 .5V8a4 4 0 0 0 4 4h7.5" stroke="var(--line-2)" strokeWidth="1.6" fill="none" />
      <rect width="26" height="14" x="2" y="19" rx="7" fill={tintFor(ext)} />
      <text
        x="15"
        y="29"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight={700}
        fill="#ffffff"
        fontFamily="var(--font-inter), 'Helvetica Neue', sans-serif"
      >
        {ext.slice(0, 4).toUpperCase()}
      </text>
    </svg>
  );
}

export function Dropzone({
  disabled,
  onUploaded,
  keepIds,
}: {
  disabled?: boolean;
  onUploaded: (file: ProbedFile) => void;
  /** uploadIds that should stay visible in the tray — files that
      leave the bench (Queue card removed, or the bench cleared)
      are taken off the tray too. */
  keepIds?: string[];
}) {
  const [box, setBox] = useState<BoxItem[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [refuse, setRefuse] = useState(false);
  const [gulp, setGulp] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingFiles = useRef(new Map<number, File>());
  const timers = useRef<number[]>([]);
  const dragging = dragDepth > 0;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /* uploaded tiles stay until the file leaves the bench; stale
        ones are filtered out at render, so no state juggling here */
  const visibleBox =
    keepIds === undefined ? box : box.filter((b) => !b.uploadId || keepIds.includes(b.uploadId));

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /* real upload over XHR, so the rolling counter shows real bytes */
  const startUpload = useCallback(
    (id: number, file: File) => {
      const form = new FormData();
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const progress = clamp((e.loaded / e.total) * 100, 0, 100);
        setBox((list) => list.map((b) => (b.id === id ? { ...b, progress } : b)));
      };
      const finishError = (message: string) => {
        setBox((list) => list.map((b) => (b.id === id ? { ...b, status: "error", error: message } : b)));
        later(() => setBox((list) => list.filter((b) => b.id !== id)), 5000);
      };
      xhr.onload = () => {
        let data: { ok: true; file: ProbedFile } | { ok: false; error: string } | null = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = null;
        }
        if (xhr.status === 200 && data && data.ok) {
          setBox((list) =>
            list.map((b) =>
              b.id === id ? { ...b, status: "done", progress: 100, uploadId: data.file.uploadId } : b,
            ),
          );
          setGulp(true);
          later(() => setGulp(false), 460);
          onUploaded(data.file);
          return;
        }
        finishError(data && !data.ok && data.error ? data.error : "Upload failed.");
      };
      xhr.onerror = () => finishError("Network error — try again.");
      xhr.send(form);
    },
    [onUploaded],
  );

  const addFiles = useCallback(
    (files: File[], origin?: { x: number; y: number } | null) => {
      if (disabled) {
        toast.message("Tray is full", { description: "Six files at a time — the bench is small by design." });
        return;
      }
      const zone = zoneRef.current?.getBoundingClientRect();
      const target = zone
        ? { x: zone.left + zone.width / 2, y: zone.top + Math.min(zone.height / 2, 130) }
        : { x: window.innerWidth / 2, y: 200 };

      for (const file of files) {
        const ext = extOf(file.name);
        const id = ++boxId;

        // — rejections: the box shakes, the joke is red, the file springs home —
        if (!ACCEPT_EXTS.has(ext) || file.size > MAX_UPLOAD_BYTES) {
          setRefuse(true);
          later(() => setRefuse(false), 500);
          const item: BoxItem = {
            id,
            name: sanitizeFilename(file.name),
            size: file.size,
            ext: ext || "?",
            progress: 0,
            status: "error",
            error: !ACCEPT_EXTS.has(ext) ? "Not a media type Toolbox reads." : "Too big — up to 300 MB.",
          };
          setBox((list) => [...list, item]);
          later(() => setBox((list) => list.filter((b) => b.id !== id)), 4200);
          continue;
        }

        // — valid files: tile flies into the box, then the wire —
        pendingFiles.current.set(id, file);
        const start = origin ?? { x: target.x + (Math.random() - 0.5) * 160, y: window.innerHeight + 60 };
        setGhosts((g) => [
          ...g,
          { id, x: start.x, y: start.y, dx: target.x - start.x, dy: target.y - start.y, ext },
        ]);
        later(() => {
          const row: BoxItem = {
            id,
            name: sanitizeFilename(file.name),
            size: file.size,
            ext,
            progress: 0,
            status: "uploading",
          };
          setBox((list) => (list.some((b) => b.id === id) ? list : [...list, row]));
        }, 180);
      }
    },
    [disabled],
  );

  const commitGhost = useCallback(
    (ghost: Ghost) => {
      setGhosts((g) => g.filter((g2) => g2.id !== ghost.id));
      const file = pendingFiles.current.get(ghost.id);
      pendingFiles.current.delete(ghost.id);
      if (file) startUpload(ghost.id, file);
    },
    [startUpload],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragDepth(0);
      const files = [...e.dataTransfer.files];
      if (files.length) addFiles(files, { x: e.clientX, y: e.clientY });
    },
    [addFiles],
  );

  return (
    <div
      ref={zoneRef}
      role="button"
      tabIndex={0}
      aria-label="Add media files"
      data-over={dragging || undefined}
      data-refuse={refuse || undefined}
      data-gulp={gulp || undefined}
      className="dzone cursor-pointer select-none"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragDepth((d) => d + 1);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragDepth((d) => Math.max(0, d - 1));
      }}
      onDrop={onDrop}
    >
      {/* tiles in flight */}
      {ghosts.map((ghost) => (
        <motion.div
          key={ghost.id}
          className="dzone-ghost"
          style={{ left: ghost.x, top: ghost.y, x: "-50%", y: "-50%" }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: ghost.dx, y: ghost.dy, scale: 0.18, opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.55, 0, 0.85, 0.3] }}
          onAnimationComplete={() => commitGhost(ghost)}
        >
          <FileGlyph ext={ghost.ext} size={44} />
        </motion.div>
      ))}

      {visibleBox.length === 0 ? (
        <>
          <span className="dzone-icon">
            <FileUp size={30} strokeWidth={1.5} />
          </span>
          <span className="dzone-say">
            <b className="block font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
              {dragging ? "Release to add" : "Drop media files here"}
            </b>
            <span className="mt-0.5 block text-[12px] text-ink2">or browse from your machine</span>
          </span>
          <p className="max-w-[17rem] text-[11px] leading-relaxed text-ink3">
            Video and audio files up to 300 MB — MP4, MKV, WebM, MOV, MP3, WAV, AAC, FLAC and friends
          </p>
        </>
      ) : (
        <div className="dzone-rows px-3 py-2" onClick={(e) => e.stopPropagation()}>
          {visibleBox.map((item) => (
            <div key={item.id} className={cn("dzone-row", item.status === "error" && "dzone-row-error")}>
              <FileGlyph ext={item.ext} size={38} />
              <span className="min-w-0 flex-1">
                <span className="dzone-name block" title={item.name}>
                  {item.name}
                </span>
                <span className="dzone-meta mt-0.5">
                  <span>{formatBytes(item.size)}</span>
                  {item.status === "uploading" && (
                    <>
                      <span aria-hidden>·</span>
                      <Roll value={item.progress} />
                    </>
                  )}
                  {item.status === "done" && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-ok">Uploaded</span>
                    </>
                  )}
                  {item.status === "error" && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-danger">{item.error}</span>
                    </>
                  )}
                </span>
                <span className="dzone-track">
                  <span
                    className="dzone-bar"
                    style={{
                      transform: `scaleX(${item.status === "uploading" ? item.progress / 100 : 1})`,
                    }}
                  />
                </span>
              </span>
              <span className="dzone-tail">
                {item.status === "done" && (
                  <span className="dzone-tick">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
                {item.status === "error" && (
                  <span className="grid size-[22px] place-items-center text-danger">
                    <AlertCircle size={18} strokeWidth={2} />
                  </span>
                )}
              </span>
            </div>
          ))}
          <button
            type="button"
            className="mt-1 self-end text-[11px] font-medium text-accent-ink underline-offset-4 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            + Add more
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) addFiles(files, null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
