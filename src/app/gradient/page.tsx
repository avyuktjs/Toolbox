import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { GradientTool } from "@/features/tools/gradient-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/gradient" },
  title: "Gradient Studio",
  description: "Linear, radial and conic — layered stops, presets, and pure CSS out.",
};

export default function GradientPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Gradient Studio"
      title="Paint with math."
      description="Linear, radial and conic — layered stops, presets, and pure CSS out."
    >
      <GradientTool />
    </ToolShell>
  );
}
