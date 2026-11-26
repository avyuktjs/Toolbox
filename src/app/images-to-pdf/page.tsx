import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { ImagesToPdfTool } from "@/features/image/images-to-pdf-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/images-to-pdf" },
  title: "Images to PDF",
  description: "Receipts, whiteboards, screenshots — reorder, pick a page size, one clean PDF out.",
};

export default function ImagesToPdfPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Images to PDF"
      title="Scans become paperwork."
      description="Receipts, whiteboards, screenshots — reorder, pick a page size, one clean PDF out."
    >
      <ImagesToPdfTool />
    </ToolShell>
  );
}
