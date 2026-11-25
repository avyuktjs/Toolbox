import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { ExifTool } from "@/features/image/exif-tool";

export const metadata: Metadata = {
  title: "EXIF Viewer",
  description: "Camera, exposure and GPS metadata — inspect it, then strip it with one click.",
};

export default function ExifPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — EXIF Viewer"
      title="What does your photo know?"
      description="Camera, exposure and GPS metadata — inspect it, then strip it with one click."
    >
      <ExifTool />
    </ToolShell>
  );
}
