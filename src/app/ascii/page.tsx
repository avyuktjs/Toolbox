import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { AsciiTool } from "@/features/image/ascii-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/ascii" },
  title: "ASCII Art",
  description: "Any image becomes characters — copy the text or download it as a PNG.",
};

export default function AsciiPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — ASCII Art"
      title="Luminance into text."
      description="Any image becomes characters — copy the text or download it as a PNG."
    >
      <AsciiTool />
    </ToolShell>
  );
}
