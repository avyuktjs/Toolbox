import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { PdfTool } from "@/features/image/pdf-toolbox";

export const metadata: Metadata = {
  alternates: { canonical: "/pdf" },
  title: "PDF Toolbox",
  description: "Merge, reorder, split, extract page ranges — or rasterize every page to PNG. Local, always.",
};

export default function PdfPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — PDF Toolbox"
      title="Paperwork, disassembled."
      description="Merge, reorder, split, extract page ranges — or rasterize every page to PNG. Local, always."
    >
      <PdfTool />
    </ToolShell>
  );
}
