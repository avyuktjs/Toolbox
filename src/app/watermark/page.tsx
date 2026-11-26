import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { WatermarkTool } from "@/features/image/watermark-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/watermark" },
  title: "Batch Watermark",
  description: "Text or logo, corner or tiled — stamp a batch, download one by one or as a zip.",
};

export default function WatermarkPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Batch Watermark"
      title="Sign the whole set."
      description="Text or logo, corner or tiled — stamp a batch, download one by one or as a zip."
    >
      <WatermarkTool />
    </ToolShell>
  );
}
