import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { QrTool } from "@/features/tools/qr-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/qr" },
  title: "QR Code Generator",
  description: "Your text — as a crisp PNG in three sizes. No tracking, no frames.",
};

export default function QrToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — QR Code Generator"
      title="Scan me, supposedly."
      description="Your text — as a crisp PNG in three sizes. No tracking, no frames."
    >
      <QrTool />
    </ToolShell>
  );
}
