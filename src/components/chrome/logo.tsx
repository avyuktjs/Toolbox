import { cn } from "@/lib/utils";

/** Toolbox's mark: the app-tile character — always the same rounded tile. */
export function TileMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-tile.png"
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      className={cn("size-7 select-none", className)}
      draggable={false}
    />
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TileMark className="size-[26px]" />
      {!compact && (
        <span className="text-[1.36rem] font-extrabold leading-none tracking-[-0.03em] text-ink">
          toolbox<span className="text-accent">.</span>
        </span>
      )}
    </span>
  );
}
