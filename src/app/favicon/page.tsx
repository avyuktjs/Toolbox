import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { FaviconTool } from "@/features/image/favicon-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/favicon" },
  title: "Favicon Pack",
  description: "favicon.ico, 16/32/48/180/192/512 PNGs, webmanifest and the head snippet — zipped.",
};

export default function FaviconPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Favicon Pack"
      title="One logo, every icon."
      description="favicon.ico, 16/32/48/180/192/512 PNGs, webmanifest and the head snippet — zipped."
    >
      <FaviconTool />
    </ToolShell>
  );
}
