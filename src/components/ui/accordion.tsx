"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toolbox accordion — Base UI primitives in the shadcn shape,
 * styled to the Toolbox panel language (rounded card, hairline
 * rows, circle chevron that fills accent while open).
 * Height is measured by Base UI via --accordion-panel-height.
 */

export function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-panel", className)}
      {...props}
    />
  );
}

export function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={className}
      {...props}
    />
  );
}

export function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-sunken/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent aria-disabled:pointer-events-none sm:px-6",
          className,
        )}
        {...props}
      >
        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          {children}
        </span>
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-ink3 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-aria-expanded:rotate-180 group-aria-expanded:border-accent group-aria-expanded:bg-accent group-aria-expanded:text-white"
        >
          <ChevronDown className="size-4" strokeWidth={1.8} />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden data-[starting-style]:animate-accordion-down data-[ending-style]:animate-accordion-up"
      {...props}
    >
      <div className={cn("max-w-prose border-t border-line px-5 py-4 text-[13.5px] leading-relaxed text-ink2 sm:px-6", className)}>
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}
