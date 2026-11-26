import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { UrlTool } from "@/features/tools/url-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/url" },
  title: "URL Encoder",
  description: "Percent-encode or decode — exactly the bytes you meant.",
};

export default function UrlToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — URL Encoder"
      title="Escape hatch."
      description="Percent-encode or decode — exactly the bytes you meant."
    >
      <UrlTool />
    </ToolShell>
  );
}
