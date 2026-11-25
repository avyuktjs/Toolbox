import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { PaletteTool } from "@/features/image/palette-tool";

export const metadata: Metadata = {
  title: "Palette Extractor",
  description: "Median-cut quantization finds the colors that dominate an image. Click to copy.",
};

export default function PalettePage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Palette Extractor"
      title="Eight colors doing the work."
      description="Median-cut quantization finds the colors that dominate an image. Click to copy."
    >
      <PaletteTool />
    </ToolShell>
  );
}
