import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { CaseTool } from "@/features/tools/case-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/case-converter" },
  title: "Case Converter",
  description: "camelCase to CONSTANT_CASE and everything between — one click to copy any row.",
};

export default function CaseToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Case Converter"
      title="Say it in any case."
      description="camelCase to CONSTANT_CASE and everything between — one click to copy any row."
    >
      <CaseTool />
    </ToolShell>
  );
}
