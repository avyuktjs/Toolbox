import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { WordCounterTool } from "@/features/tools/word-counter-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/word-counter" },
  title: "Word Counter",
  description: "Words, characters, sentences, lines and reading time — updated as you type.",
};

export default function WordCounterToolPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Word Counter"
      title="How many words is that?"
      description="Words, characters, sentences, lines and reading time — updated as you type."
    >
      <WordCounterTool />
    </ToolShell>
  );
}
