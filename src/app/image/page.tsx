import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { ImageTool } from "@/features/image/image-tool";

export const metadata: Metadata = {
  title: "Image Studio",
  description:
    "PNG, JPEG, WebP and friends — convert, resize, crop, rotate and compress images right in your browser. No uploads, no sign-up, no watermark.",
};

export default function ImageStudioPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Image Studio"
      title="Convert and resize images."
      description="Drop a batch in, pick a format, set the width — and keep the results. PNG, JPEG, WebP, GIF, SVG, BMP, AVIF and ICO, processed locally with no upload and no watermark."
    >
      <ImageTool />
    </ToolShell>
  );
}
