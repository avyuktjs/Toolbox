import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { MarkdownTool } from "@/features/tools/markdown-tool";

export const metadata: Metadata = {
  title: "Markdown Preview",
  description: "GFM with tables and task lists — sanitized, local, copy-ready as HTML.",
};

export default function MarkdownPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Markdown Preview"
      title="Raw on the left, rendered on the right."
      description="GFM with tables and task lists — sanitized, local, copy-ready as HTML."
    >
      <MarkdownTool />
    </ToolShell>
  );
}
