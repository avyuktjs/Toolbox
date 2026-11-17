import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const button = cva(
  [
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-semibold tracking-[-0.01em] transition-all duration-200",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--brand)_45%,transparent)]",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:not-aria-[haspopup]:scale-[0.98]",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // the Search pill: white surface, ink label, blue on hover
        primary:
          "border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(29,67,242,0.55)]",
        ink: "border border-black/10 bg-white text-[#0a0a0b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(29,67,242,0.55)]",
        outline:
          "border border-black/10 bg-white text-[#3a3a3c] hover:border-brand hover:bg-brand hover:text-white",
        ghost:
          "border border-transparent text-ink2 hover:bg-brand/10 hover:text-brand",
        danger:
          "border border-transparent bg-danger-soft text-danger hover:bg-danger hover:text-accent-on",
      },
      size: {
        sm: "h-8 rounded-full px-3.5 text-[13px]",
        md: "h-10 rounded-full px-4 text-sm",
        lg: "h-12 rounded-full px-6 text-[15px]",
        icon: "h-10 w-10 rounded-full",
        iconSm: "h-8 w-8 rounded-full [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(button({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
