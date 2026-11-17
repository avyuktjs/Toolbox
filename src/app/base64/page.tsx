import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { Base64Tool } from "@/features/tools/base64-tool";

export const metadata: Metadata = {
  title: "Base64",
  description: "Encode and decode text, UTF-8 safe, with live two-way feedback.",
};

export default function Base64ToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Base64"
      title="Base64, both ways."
      description="Encode and decode text, UTF-8 safe, with live two-way feedback."
    >
      <Base64Tool />
    </ToolShell>
  );
}
