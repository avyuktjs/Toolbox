import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { ChmodTool } from "@/features/tools/chmod-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/chmod" },
  title: "chmod Calculator",
  description: "Toggle rwx for owner, group and other — read octal and symbolic both ways.",
};

export default function ChmodPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — chmod Calculator"
      title="755, bit by bit."
      description="Toggle rwx for owner, group and other — read octal and symbolic both ways."
    >
      <ChmodTool />
    </ToolShell>
  );
}
