"use client";

/**
 * jalco-ui
 * AiCopyButton — single action, no dropdown.
 * by Justin Levine · ui.justinlevine.me
 *
 * The original split button (copy + AI destinations) reduced to one
 * honest action: copy to clipboard, with a springy drawn tick for
 * feedback. No green — the tick is the brand accent.
 *
 * Props:
 * - value: string content to copy
 * - label?: button label (defaults to "Copy")
 * - variant?: visual style variant
 * - size?: button size
 * - iconOnly?: render as a compact icon-only button (for rows)
 * - onCopy?: callback after copy
 */

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";

const aiCopyButtonVariants = cva(
  "inline-flex items-center justify-center shrink-0 whitespace-nowrap font-semibold transition-all duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:border-brand hover:bg-brand hover:text-white",
        secondary:
          "border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:border-brand hover:bg-brand hover:text-white",
        outline:
          "border border-black/10 bg-white text-[#3a3a3c] hover:border-brand hover:bg-brand hover:text-white",
        ghost: "text-ink3 hover:bg-brand/10 hover:text-brand",
        primary:
          "border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(29,67,242,0.55)]",
      },
      size: {
        sm: "h-8 gap-1.5 px-3 text-[12px]",
        default: "h-9 gap-1.5 px-4 text-[13px]",
        lg: "h-11 gap-2 px-6 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

const sizeClasses = {
  sm: "[&_svg]:size-3.5",
  default: "[&_svg]:size-4",
  lg: "[&_svg]:size-[18px]",
};

export interface AiCopyButtonProps
  extends Omit<React.ComponentProps<"button">, "children" | "value">,
    VariantProps<typeof aiCopyButtonVariants> {
  /** The string content to copy. */
  value: string | (() => string | null | undefined);
  /** Button label. Defaults to "Copy". */
  label?: string;
  /** Compact icon-only button for dense rows. */
  iconOnly?: boolean;
  /** Callback fired after the copy action completes. */
  onCopy?: () => void;
}

function AiCopyButton({
  value,
  label = "Copy",
  iconOnly = false,
  variant,
  size,
  onCopy,
  className,
  ...props
}: AiCopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  const handleCopy = async () => {
    const text = typeof value === "function" ? value() : value;
    if (!text) {
      toast.message("Nothing to copy");
      return;
    }
    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.error("Couldn't reach the clipboard");
      return;
    }
    setCopied(true);
    onCopy?.();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  const icon = (
    <span className="relative grid size-4 place-items-center overflow-hidden">
      <AnimatePresence initial={false}>
        {copied ? (
          <motion.svg
            key="tick"
            viewBox="0 0 16 16"
            fill="none"
            className="size-4 text-accent"
            initial={{ scale: 0.6, opacity: 0, rotate: -18 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 720, damping: 22, mass: 0.5 }}
          >
            <motion.path
              d="M2.5 8.5 L6.2 12.2 L13.5 4"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            />
          </motion.svg>
        ) : (
          <motion.span
            key="clipboard"
            className="absolute inset-0 grid place-items-center"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { duration: 0.12 } }}
            exit={{ scale: 0.35, opacity: 0, y: 4, transition: { duration: 0.1 } }}
          >
            <Copy className="size-4" strokeWidth={1.75} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : `${label} to clipboard`}
        aria-live="polite"
        className={cn(
          aiCopyButtonVariants({ variant, size }),
          "size-8 rounded-full p-0",
          sizeClasses[size ?? "sm"],
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : `${label} to clipboard`}
      aria-live="polite"
      className={cn(
        aiCopyButtonVariants({ variant, size }),
        "rounded-full",
        sizeClasses[size ?? "sm"],
        className,
      )}
      {...props}
    >
      {icon}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

export { AiCopyButton, aiCopyButtonVariants };
