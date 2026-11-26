import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { RedactTool } from "@/features/image/redact-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/redact" },
  title: "Redact",
  description: "Pixelate, blur or blackout emails, tokens and faces — burned in before export.",
};

export default function RedactPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Redact"
      title="Say nothing, permanently."
      description="Pixelate, blur or blackout emails, tokens and faces — burned in before export."
    >
      <RedactTool />
    </ToolShell>
  );
}
