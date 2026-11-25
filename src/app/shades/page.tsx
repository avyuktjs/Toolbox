import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { ShadesTool } from "@/features/tools/shades-tool";

export const metadata: Metadata = {
  title: "Shade Scale",
  description: "A full 50-950 ladder from any color — CSS variables, Tailwind @theme or JSON out.",
};

export default function ShadesPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Shade Scale"
      title="One hex, eleven rungs."
      description="A full 50-950 ladder from any color — CSS variables, Tailwind @theme or JSON out."
    >
      <ShadesTool />
    </ToolShell>
  );
}
