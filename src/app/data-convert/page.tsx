import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { DataConvertTool } from "@/features/tools/data-convert-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/data-convert" },
  title: "Data Converter",
  description: "JSON, YAML, TOML and CSV — parse, convert and copy, round-trip safe.",
};

export default function DataConvertPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Data Converter"
      title="Every format weighs in."
      description="JSON, YAML, TOML and CSV — parse, convert and copy, round-trip safe."
    >
      <DataConvertTool />
    </ToolShell>
  );
}
