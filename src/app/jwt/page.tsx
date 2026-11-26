import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { JwtTool } from "@/features/tools/jwt-tool";

export const metadata: Metadata = {
  alternates: { canonical: "/jwt" },
  title: "JWT Decoder",
  description: "Header, payload, expiry verdict and claim timestamps — decoded locally. Never verified, never sent anywhere.",
};

export default function JwtPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — JWT Decoder"
      title="Interrogate a token."
      description="Header, payload, expiry verdict and claim timestamps — decoded locally. Never verified, never sent anywhere."
    >
      <JwtTool />
    </ToolShell>
  );
}
