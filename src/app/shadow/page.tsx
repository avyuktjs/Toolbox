import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { ShadowTool } from "@/features/tools/shadow-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/shadow" },
  title: "Box Shadow Studio",
  description: "Layered shadows with insets, spread, blur and opacity — copy real CSS.",
};

export default function ShadowPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Box Shadow Studio"
      title="Depth you can stack."
      description="Layered shadows with insets, spread, blur and opacity — copy real CSS."
    >
      <ShadowTool />
    </ToolShell>
  );
}
