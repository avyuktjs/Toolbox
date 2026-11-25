import type { ComponentType } from "react";

/**
 * Icons that imply a direction (arrows, chevrons, corners…) should flip
 * horizontally in RTL layouts. Anything else renders as-is.
 */
const DIRECTIONAL =
  /arrow|chevron|caret|triangle|move|corner|share|reply|undo|redo|external|login|logout/i;

export function directionalIconClass(icon?: ComponentType<{ className?: string }>): string {
  if (!icon) return "";
  const name =
    (icon as { displayName?: string }).displayName ?? (icon as { name?: string }).name ?? "";
  return DIRECTIONAL.test(name) ? "rtl:-scale-x-100" : "";
}
