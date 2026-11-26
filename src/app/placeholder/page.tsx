import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { PlaceholderTool } from "@/features/tools/placeholder-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/placeholder" },
  title: "Placeholder Images",
  description: "Canvas-rendered placeholders at any size — blueprint grid, custom label, PNG or JPEG.",
};

export default function PlaceholderPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Placeholder Images"
      title="Stand-ins with manners."
      description="Canvas-rendered placeholders at any size — blueprint grid, custom label, PNG or JPEG."
    >
      <PlaceholderTool />
    </ToolShell>
  );
}
