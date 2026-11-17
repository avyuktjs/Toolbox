import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { TimestampTool } from "@/features/tools/timestamp-tool";

export const metadata: Metadata = {
  title: "Unix Timestamp",
  description: "Convert epoch to date and back. Live clock included, no library required.",
};

export default function TimestampToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Unix Timestamp"
      title="Time, in seconds."
      description="Convert epoch to date and back. Live clock included, no library required."
    >
      <TimestampTool />
    </ToolShell>
  );
}
