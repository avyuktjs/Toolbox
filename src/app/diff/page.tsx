import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { DiffTool } from "@/features/tools/diff-tool";

export const metadata: Metadata = {
  title: "Text Diff",
  description: "A line-based diff with zero dependencies — paste before and after, read the deltas.",
};

export default function DiffToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Text Diff"
      title="Before and after."
      description="A line-based diff with zero dependencies — paste before and after, read the deltas."
    >
      <DiffTool />
    </ToolShell>
  );
}
