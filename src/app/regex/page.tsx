import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { RegexTool } from "@/features/tools/regex-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/regex" },
  title: "Regex Tester",
  description: "Pattern, flags, live highlights and capture groups — with a replace preview, all in this tab.",
};

export default function RegexPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Regex Tester"
      title="Pattern, precisely."
      description="Pattern, flags, live highlights and capture groups — with a replace preview, all in this tab."
    >
      <RegexTool />
    </ToolShell>
  );
}
