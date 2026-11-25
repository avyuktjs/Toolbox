import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { CompressTool } from "@/features/image/compress-tool";

export const metadata: Metadata = {
  title: "Image Compressor",
  description: "The encoder binary-searches quality, then dimensions, until the file fits your target.",
};

export default function CompressPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Image Compressor"
      title="Name the size. Get the size."
      description="The encoder binary-searches quality, then dimensions, until the file fits your target."
    >
      <CompressTool />
    </ToolShell>
  );
}
