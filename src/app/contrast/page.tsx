import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { ContrastTool } from "@/features/tools/contrast-tool";

export const metadata: Metadata = {
  title: "Contrast Checker",
  description: "WCAG AA and AAA verdicts for any foreground/background pair.",
};

export default function ContrastToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Contrast Checker"
      title="Can they read it?"
      description="WCAG AA and AAA verdicts for any foreground/background pair."
    >
      <ContrastTool />
    </ToolShell>
  );
}
