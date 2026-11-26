import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { UuidTool } from "@/features/tools/uuid-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/uuid" },
  title: "UUID Generator",
  description: "v4 UUIDs from your browser’s CSPRNG — generate a batch, copy one or all.",
};

export default function UuidToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — UUID Generator"
      title="Fresh UUIDs."
      description="v4 UUIDs from your browser’s CSPRNG — generate a batch, copy one or all."
    >
      <UuidTool />
    </ToolShell>
  );
}
