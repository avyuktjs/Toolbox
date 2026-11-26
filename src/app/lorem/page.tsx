import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { LoremTool } from "@/features/tools/lorem-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/lorem" },
  title: "Lorem Ipsum",
  description: "Deterministic placeholder text — same seed, same paragraphs, every time.",
};

export default function LoremToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Lorem Ipsum"
      title="Filler, without regret."
      description="Deterministic placeholder text — same seed, same paragraphs, every time."
    >
      <LoremTool />
    </ToolShell>
  );
}
