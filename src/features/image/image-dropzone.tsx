"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  hint?: string;
  title?: string;
  className?: string;
}

/** Shared dashed drop target used by every new image tool. */
export function ImageDropzone({
  onFiles,
  multiple = false,
  hint = "PNG, JPEG, WebP, GIF, SVG and BMP — processed in this tab, never uploaded.",
  title = "Drop an image here",
  className,
}: ImageDropzoneProps) {
  const [dragDepth, setDragDepth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = dragDepth > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={multiple ? "Add images" : "Add an image"}
      className={cn(
        "soft-shadow flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed px-6 py-16 text-center transition-colors",
        dragging ? "border-brand bg-brand/5" : "border-line2 bg-panel",
        className,
      )}
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
      onDrop={(e) => {
        e.preventDefault();
        setDragDepth(0);
        const files = [...e.dataTransfer.files];
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-sunken text-ink">
        <FileUp className="size-7" strokeWidth={1.5} />
      </span>
      <p className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">{title}</p>
      <p className="text-[12px] text-ink2">or browse from your machine</p>
      <p className="mt-1 max-w-[20rem] text-[11px] leading-relaxed text-ink3">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept="image/*,.bmp,.svg"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) onFiles(multiple ? files : files.slice(0, 1));
          e.target.value = "";
        }}
      />
    </div>
  );
}
