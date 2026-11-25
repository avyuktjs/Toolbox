import type { Metadata } from "next";
import { ToolShell } from "@/features/tools/tool-shell";
import { PasswordTool } from "@/features/tools/password-tool";

export const metadata: Metadata = {
  title: "Password Generator",
  description: "Honest entropy math, guaranteed character classes, bulk rolls — nothing leaves this tab.",
};

export default function PasswordPage() {
  return (
    <ToolShell
      eyebrow="Toolbox — Password Generator"
      title="Roll the dice, rejection-sampled."
      description="Honest entropy math, guaranteed character classes, bulk rolls — nothing leaves this tab."
    >
      <PasswordTool />
    </ToolShell>
  );
}
