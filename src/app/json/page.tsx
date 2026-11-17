import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { JsonTool } from "@/features/tools/json-tool";

export const metadata: Metadata = {
  title: "JSON Formatter",
  description: "Validate, prettify, minify — with the error position when it breaks.",
};

export default function JsonToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — JSON Formatter"
      title="JSON, untangled."
      description="Validate, prettify, minify — with the error position when it breaks."
    >
      <JsonTool />
    </ToolShell>
  );
}
