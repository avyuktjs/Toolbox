import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { SlugifyTool } from "@/features/tools/slugify-tool";

export const metadata: Metadata = {
  title: "Slugify",
  description: "Accents folded, punctuation dropped — one slug or a batch, one per line.",
};

export default function SlugifyPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Slugify"
      title="Titles in, URLs out."
      description="Accents folded, punctuation dropped — one slug or a batch, one per line."
    >
      <SlugifyTool />
    </ToolShell>
  );
}
