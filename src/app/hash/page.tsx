import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { HashTool } from "@/features/tools/hash-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/hash" },
  title: "Hash Generator",
  description: "SHA-256, SHA-1 and SHA-512 of anything you type. Computed locally, always.",
};

export default function HashToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Hash Generator"
      title="Three sizes of fingerprint."
      description="SHA-256, SHA-1 and SHA-512 of anything you type. Computed locally, always."
    >
      <HashTool />
    </ToolShell>
  );
}
