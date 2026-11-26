import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { LinesTool } from "@/features/tools/lines-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/lines" },
  title: "Line Tools",
  description: "Sort, dedupe, reverse, shuffle, trim, number and case-flip — paste a list, get a list.",
};

export default function LinesPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Line Tools"
      title="Ten thousand lines, zero tears."
      description="Sort, dedupe, reverse, shuffle, trim, number and case-flip — paste a list, get a list."
    >
      <LinesTool />
    </ToolShell>
  );
}
