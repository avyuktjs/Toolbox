"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DialogPanel } from "@/components/ui/dialog";

const ROWS: { keys: string[]; action: string }[] = [
  { keys: ["/"], action: "Focus the link field" },
  { keys: ["↵"], action: "Inspect the pasted link" },
  { keys: ["Esc"], action: "Clear the field / close dialogs" },
  { keys: ["g", "t"], action: "Go to Toolbox" },
  { keys: ["g", "d"], action: "Go to Downloader" },
  { keys: ["g", "c"], action: "Go to Converter" },
  { keys: ["g", "h"], action: "Go to History" },
  { keys: ["g", "f"], action: "Go to FAQ" },
  { keys: ["?"], action: "Toggle this panel" },
];

export function useShortcuts(onToggleHelp: () => void, helpOpen: boolean) {
  const router = useRouter();

  useEffect(() => {
    let gArmed = false;
    let gTimer: number | undefined;

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target);

      if (event.key === "Escape") {
        if (helpOpen) {
          onToggleHelp();
          event.preventDefault();
        }
        return;
      }
      if (event.key === "?" && !typing) {
        event.preventDefault();
        onToggleHelp();
        return;
      }
      if (typing) {
        if (event.key === "Escape" && event.target instanceof HTMLElement) {
          event.target.blur();
        }
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/") {
        const input = document.getElementById("tb-url-input") as HTMLInputElement | null;
        if (input) {
          event.preventDefault();
          input.focus();
        }
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "g") {
        gArmed = true;
        window.clearTimeout(gTimer);
        gTimer = window.setTimeout(() => (gArmed = false), 900);
        return;
      }
      if (gArmed) {
        const map: Record<string, string> = { t: "/", d: "/downloader", c: "/convert", h: "/history", f: "/faq" };
        const dest = map[key];
        if (dest) {
          event.preventDefault();
          router.push(dest);
        }
        gArmed = false;
        window.clearTimeout(gTimer);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(gTimer);
    };
  }, [router, helpOpen, onToggleHelp]);
}

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPanel
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Toolbox is built for the keyboard first."
    >
      <ul className="divide-y divide-line overflow-hidden rounded-[8px] border border-line">
        {ROWS.map((row) => (
          <li
            key={row.action}
            className="flex items-center justify-between gap-4 bg-panel px-4 py-2.5"
          >
            <span className="text-[13px] text-ink2">{row.action}</span>
            <span className="flex items-center gap-1.5">
              {row.keys.map((k, i) => (
                <span key={i} className="kbd">
                  {k}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </DialogPanel>
  );
}

export function useShortcutState(): [boolean, (v: boolean) => void, () => void] {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return [open, setOpen, toggle];
}
