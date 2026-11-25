import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentType,
  ReactNode,
  Ref,
} from "react";
import { cn } from "@/lib/utils";
import { directionalIconClass } from "@/lib/directional-icon";

/**
 * Board UI → Buttons (ported into Toolbox).
 *
 * Variant matrix:
 *   Type     = Primary | Secondary | Ghost | Danger
 *   Size     = Medium  | Small | Xs
 *   State    = Default | Hover | Active | Disabled        (CSS pseudo)
 *   OnlyIcon = false   | true
 *
 * Sizing:
 *
 *                       Medium                    Small                     Xs
 *   container          h=36, p=8,   r=10         h=32, px=8 py=6, r=8      h=24, px=8, r=4
 *   gap                 2px                       2px                      1px
 *   icon                20×20                     18×18                    14×14
 *   label wrapper       px=4                      px=2                     px=2
 *   text style          14/Medium                 14/Medium                12/Semibold
 *   icon-only square    36×36 (content-derived)   32×32 (forced size)      24×24 (forced size)
 *
 * Icons are rendered by the component itself via the `leadingIcon` /
 * `trailingIcon` props so the consumer can't pass the wrong size. Pass an
 * icon component reference (`RiAddLine`, not `<RiAddLine />`); Lucide icons
 * work the same.
 *
 * For icon-only buttons:
 *   <Button iconOnly leadingIcon={RiAddLine} aria-label="Add" />
 *
 * The HTML `type` prop is preserved; the "Type" enum is renamed to
 * `variant` to avoid the clash. `ButtonLink` is the anchor counterpart for
 * navigational actions.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "medium" | "small" | "xs";

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export interface ButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

const SHADOW_XS = "shadow-[0_1px_2px_rgb(0_0_0/0.07)]";

const styles = {
  base: [
    "inline-flex items-center justify-center gap-0.5 overflow-hidden whitespace-nowrap",
    "font-sans leading-none select-none",
    "transition-[scale,background-color,border-color,color,box-shadow] duration-150 ease-out",
    "active:scale-[0.98] motion-reduce:active:scale-100",
    "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
  ].join(" "),

  // Base shape per size (used when label is present OR medium icon-only).
  size: {
    medium: "h-9 rounded-[10px] p-2 text-[14px] font-medium tracking-[-0.005em]",
    small: "h-8 rounded-[8px] px-2 py-1.5 text-[14px] font-medium tracking-[-0.005em]",
    xs: "h-6 rounded-[4px] px-2 text-[12px] font-semibold",
  },

  // Icon-only override:
  //   Medium → keep p-2; w expands from content (8+20+8 = 36) → square.
  //   Small  → forced 32×32, inner flex centers the 18px icon.
  //   Xs     → forced 24×24, content-centered.
  iconOnlySize: {
    medium: "", // base size already produces 36×36 with a 20px icon
    small: "size-8 p-0", // hard 32×32, content-centered
    xs: "size-6 p-0", // hard 24×24, content-centered
  },

  icon: {
    medium: "size-5 shrink-0", // 20px
    small: "size-[18px] shrink-0", // 18px
    xs: "size-3.5 shrink-0", // 14px
  },

  label: {
    medium: "inline-flex items-center justify-center px-1 shrink-0", // px=4
    small: "inline-flex items-center justify-center px-0.5 shrink-0", // px=2
    xs: "inline-flex items-center justify-center px-0.5 shrink-0", // px=2
  },

  variant: {
    primary: [
      `bg-brand text-white ${SHADOW_XS}`,
      "hover:bg-[color-mix(in_srgb,var(--brand)_86%,black)] active:bg-[color-mix(in_srgb,var(--brand)_74%,black)]",
      "disabled:bg-sunken disabled:text-ink3 disabled:shadow-none",
      "aria-disabled:bg-sunken aria-disabled:text-ink3 aria-disabled:shadow-none",
    ].join(" "),
    danger: [
      `bg-danger text-white ${SHADOW_XS}`,
      "hover:bg-[color-mix(in_srgb,var(--danger)_86%,black)] active:bg-[color-mix(in_srgb,var(--danger)_74%,black)]",
      "disabled:bg-sunken disabled:text-ink3 disabled:shadow-none",
      "aria-disabled:bg-sunken aria-disabled:text-ink3 aria-disabled:shadow-none",
    ].join(" "),
    secondary: [
      `border border-line2 bg-panel text-ink ${SHADOW_XS}`,
      "hover:border-line hover:bg-sunken active:border-line2 active:bg-line",
      "disabled:border-line disabled:bg-sunken disabled:text-ink3 disabled:shadow-none",
      "aria-disabled:border-line aria-disabled:bg-sunken aria-disabled:text-ink3 aria-disabled:shadow-none",
    ].join(" "),
    ghost: [
      "bg-transparent text-ink2",
      "hover:bg-sunken hover:text-ink active:bg-line",
      "disabled:bg-transparent disabled:text-ink3 disabled:shadow-none",
      "aria-disabled:bg-transparent aria-disabled:text-ink3 aria-disabled:shadow-none",
    ].join(" "),
  },
} as const;

export function Button({
  variant = "primary",
  size = "medium",
  iconOnly = false,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        styles.base,
        styles.size[size],
        styles.variant[variant],
        iconOnly && styles.iconOnlySize[size],
        className,
      )}
      {...props}
    >
      {Leading ? <Leading className={cn(styles.icon[size], directionalIconClass(Leading))} aria-hidden /> : null}
      {!iconOnly && children !== undefined && children !== null && (
        <span className={styles.label[size]}>{children}</span>
      )}
      {!iconOnly && Trailing ? (
        <Trailing className={cn(styles.icon[size], directionalIconClass(Trailing))} aria-hidden />
      ) : null}
    </button>
  );
}

/** Anchor counterpart to Button for navigational actions. */
export function ButtonLink({
  variant = "primary",
  size = "medium",
  iconOnly = false,
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  ref,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      ref={ref}
      className={cn(
        styles.base,
        styles.size[size],
        styles.variant[variant],
        iconOnly && styles.iconOnlySize[size],
        className,
      )}
      {...props}
    >
      {Leading ? <Leading className={cn(styles.icon[size], directionalIconClass(Leading))} aria-hidden /> : null}
      {!iconOnly && children !== undefined && children !== null && (
        <span className={styles.label[size]}>{children}</span>
      )}
      {!iconOnly && Trailing ? (
        <Trailing className={cn(styles.icon[size], directionalIconClass(Trailing))} aria-hidden />
      ) : null}
    </a>
  );
}

/** Style maps, exported for advanced composition. */
export const buttonStyles = styles;
