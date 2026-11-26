import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { CropTool } from "@/features/image/crop-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/crop" },
  title: "Visual Crop",
  description: "Drag the crop right onto the picture — corners, thirds grid, ratio presets including passport 35x45.",
};

export default function CropPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Visual Crop"
      title="Crop it like you mean it."
      description="Drag the crop right onto the picture — corners, thirds grid, ratio presets including passport 35x45."
    >
      <CropTool />
    </ToolShell>
  );
}
