import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { CronTool } from "@/features/tools/cron-tool";

export const metadata: Metadata = {
  title: "Cron Explainer",
  description: "Five-field cron in plain English — plus the next five actual run times.",
};

export default function CronPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Cron Explainer"
      title="Cron, decoded."
      description="Five-field cron in plain English — plus the next five actual run times."
    >
      <CronTool />
    </ToolShell>
  );
}
