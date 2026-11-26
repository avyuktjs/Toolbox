import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { BundleToolsGrid } from "@/features/tools/bundle-grid";
import { BUNDLES } from "@/features/tools/bundles";

const bundle = BUNDLES.find((b) => b.slug === "/designtools")!;

export const metadata: Metadata = {
  alternates: { canonical: "/designtools" },
  title: "DesignTools Bundle",
  description: bundle.description,
};

export default function DesignToolsBundlePage() {
  return (
    <ToolShell
      eyebrow={bundle.eyebrow}
      title={bundle.title}
      description={bundle.description}
    >
      <BundleToolsGrid slugs={bundle.toolSlugs} label="DesignTools" />
    </ToolShell>
  );
}
