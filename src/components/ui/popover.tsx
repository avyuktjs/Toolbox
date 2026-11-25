"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Toolbox popover — Base UI primitives, panels in the Toolbox idiom.
 *
 *   <Popover>
 *     <PopoverTrigger><button>…</button></PopoverTrigger>
 *     <PopoverContent placement="bottom start" aria-label="…">…</PopoverContent>
 *   </Popover>
 *
 * `placement` is "<side>" or "<side> <align>", e.g. "bottom start".
 */

export type PopoverPlacement =
  | "top"
  | "top start"
  | "top end"
  | "bottom"
  | "bottom start"
  | "bottom end"
  | "left"
  | "left start"
  | "left end"
  | "right"
  | "right start"
  | "right end";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

function parsePlacement(placement: PopoverPlacement): { side: Side; align: Align } {
  const [side, align] = placement.split(" ") as [Side, Align | undefined];
  return { side, align: align ?? "center" };
}

/** The popover state container. Renders no element of its own. */
export function Popover({ children }: { children?: ReactNode }) {
  return <PopoverPrimitive.Root>{children}</PopoverPrimitive.Root>;
}

/** Turns its single button child into the popover trigger (no nested button). */
export function PopoverTrigger({ children }: { children: ReactElement }) {
  return <PopoverPrimitive.Trigger render={children} />;
}

export interface PopoverContentProps {
  /** Where the popup opens relative to the trigger. Default "bottom start". */
  placement?: PopoverPlacement;
  "aria-label"?: string;
  /** Classes on the popup, e.g. a width. */
  className?: string;
  /** Classes on the popup's inner padding wrapper. */
  dialogClassName?: string;
  children?: ReactNode;
}

export function PopoverContent({
  placement = "bottom start",
  className,
  dialogClassName,
  "aria-label": ariaLabel,
  children,
}: PopoverContentProps) {
  const { side, align } = parsePlacement(placement);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side={side} align={align} sideOffset={8} className="z-50">
        <PopoverPrimitive.Popup
          aria-label={ariaLabel}
          className={cn(
            "rounded-[18px] border border-line bg-panel text-ink shadow-[0_24px_60px_rgb(0_0_0/0.18),0_2px_8px_rgb(0_0_0/0.08)] outline-none dark:shadow-[0_24px_60px_rgb(0_0_0/0.55),0_2px_8px_rgb(0_0_0/0.35)]",
            className,
          )}
        >
          <div className={cn("p-2", dialogClassName)}>{children}</div>
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

/** @deprecated Kept for call-site readability; use PopoverContent. */
export type PopoverProps = PopoverContentProps;
