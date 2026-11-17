"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/features/shared/use-mounted";
import { Tooltip } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const dark = resolvedTheme === "dark";
  // neutral chrome until mounted, so server and client HTML agree
  const label = mounted ? (dark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme";
  const tip = mounted ? (dark ? "Switch to light" : "Switch to dark") : "Toggle theme";
  return (
    <Tooltip content={tip}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setTheme(dark ? "light" : "dark")}
        className="grid size-9 place-items-center rounded-[7px] border border-transparent text-ink2 transition-colors hover:border-line hover:text-ink"
      >
        {mounted ? (
          dark ? <Sun className="size-[18px]" strokeWidth={1.75} /> : <Moon className="size-[18px]" strokeWidth={1.75} />
        ) : (
          <span className="size-[18px]" />
        )}
      </button>
    </Tooltip>
  );
}
