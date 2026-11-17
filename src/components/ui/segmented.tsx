"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

/**
 * Radio-group style segmented control. Active segment is an ink slab —
 * strong, printed, and unmistakably selected.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  size = "md",
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-stretch gap-1 rounded-[8px] border border-line2 bg-sunken p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            id={`${name}-${option.value}`}
            disabled={option.disabled}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[6px] font-medium tracking-[-0.01em] transition-colors duration-150",
              size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-9 px-4 text-[13px]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              active ? "bg-ink text-paper" : "text-ink2 hover:text-ink",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
